<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import LoginView from './components/LoginView.vue';
import TodayPanel from './components/TodayPanel.vue';
import Heatmap from './components/Heatmap.vue';
import { demoMode, fetchCheckins, locallyAuthed, logout, saveCheckin, saveDisplayName } from './api.js';
import { addDays, dayScore, emptyDay, localISODate, PALETTES, streakFrom } from './score.js';

const today = localISODate();
const authed = ref(false);
const loading = ref(true);
const saving = ref(false);
const tab = ref('overview');
const selectedDate = ref(today);
const rows = ref({});
const displayName = ref('');
const editingName = ref(false);
const nameDraft = ref('');
let saveTimer = null;

const TABS = [
  { id: 'overview', label: '总览' },
  { id: 'water', label: '喝水' },
  { id: 'sleep', label: '早睡' },
  { id: 'workout', label: '锻炼' },
  { id: 'study', label: '学习' }
];

const TAB_HINT = {
  overview: '综合 · 绿色深浅按当日总分 0–5',
  water: '喝水 · 蓝色深浅按 0–5 杯',
  sleep: '早睡 · 黄色表示已完成',
  workout: '锻炼 · 红色表示已完成',
  study: '学习 · 橙色表示已完成'
};

const rangeFrom = addDays(today, -370);
const legend = computed(() => PALETTES[tab.value] || PALETTES.overview);

const selectedRow = computed(() => rows.value[selectedDate.value] || emptyDay(selectedDate.value));
const streak = computed(() => streakFrom(rows.value, today, tab.value));
const yearDays = computed(() => {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays(today, -i);
    const row = rows.value[d];
    if (row && dayScore(row) > 0) n += 1;
  }
  return { active: n };
});

async function load() {
  loading.value = true;
  try {
    const data = await fetchCheckins(rangeFrom, today);
    const list = data.checkins || data;
    const map = {};
    for (const row of list) map[row.date] = row;
    rows.value = map;
    if (data.displayName) displayName.value = data.displayName;
    authed.value = true;
  } catch (err) {
    if (err.status === 401) authed.value = false;
  } finally {
    loading.value = false;
  }
}

function onLogin() {
  authed.value = true;
  load();
}

async function onLogout() {
  await logout();
  authed.value = false;
  displayName.value = '';
}

function startEditName() {
  nameDraft.value = displayName.value;
  editingName.value = true;
}

async function commitName() {
  const next = nameDraft.value.trim();
  editingName.value = false;
  if (!next || next === displayName.value) return;
  try {
    displayName.value = await saveDisplayName(next);
  } catch (err) {
    if (err.status === 401) authed.value = false;
  }
}

function updateRow(next) {
  rows.value = { ...rows.value, [next.date]: next };
  saving.value = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await saveCheckin(next);
    } catch (err) {
      if (err.status === 401) authed.value = false;
    } finally {
      saving.value = false;
    }
  }, 350);
}

watch(selectedDate, () => {
  if (!rows.value[selectedDate.value]) {
    rows.value = { ...rows.value, [selectedDate.value]: emptyDay(selectedDate.value) };
  }
});

onMounted(() => {
  if (demoMode && locallyAuthed()) authed.value = true;
  if (authed.value || !demoMode) load();
  else loading.value = false;
});

onUnmounted(() => clearTimeout(saveTimer));
</script>

<template>
  <LoginView v-if="!authed && !loading" @success="onLogin" />
  <div v-else-if="loading" class="grid min-h-screen place-items-center text-gh-muted">加载中…</div>
  <div v-else class="mx-auto max-w-6xl px-4 py-6 md:py-8">
    <header class="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-base font-semibold md:text-lg">习惯打卡</h1>
        <div class="mt-0.5 flex items-center gap-2 text-xs text-gh-muted">
          <template v-if="editingName">
            <input
              v-model="nameDraft"
              maxlength="16"
              class="w-28 rounded border border-gh-border bg-gh-bg px-1.5 py-0.5 text-xs text-gh-text outline-none focus:border-gh-link"
              @keydown.enter="commitName"
              @keydown.esc="editingName = false"
              @blur="commitName"
            />
          </template>
          <button v-else type="button" class="hover:text-gh-text" @click="startEditName">
            {{ displayName || '未命名' }}
            <span class="ml-1 text-[10px] text-gh-muted">改名字</span>
          </button>
          <span>·</span>
          <span>{{ demoMode ? '本地预览' : '会话 30 天' }}</span>
          <span v-if="saving">· 保存中</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="selectedDate !== today"
          type="button"
          class="rounded-md border border-gh-border px-2 py-1 text-xs text-gh-muted hover:text-gh-text"
          @click="selectedDate = today"
        >
          回到今天
        </button>
        <button
          type="button"
          class="rounded-md border border-gh-border px-2 py-1 text-xs text-gh-muted hover:text-gh-text"
          @click="onLogout"
        >
          退出
        </button>
      </div>
    </header>

    <TodayPanel :row="selectedRow" :today="today" @update="updateRow" />

    <section class="mt-5 rounded-xl border border-gh-border bg-gh-panel p-4 md:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1 rounded-md border border-gh-border p-1">
          <button
            v-for="item in TABS"
            :key="item.id"
            type="button"
            class="rounded px-2.5 py-1 text-xs md:text-sm"
            :class="tab === item.id ? 'bg-[#21262d] text-white' : 'text-gh-muted hover:text-gh-text'"
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </div>
        <p class="text-xs text-gh-muted">
          连续 {{ streak }} 天
          <span class="mx-1">·</span>
          近一年有记录 {{ yearDays.active }} 天
        </p>
      </div>

      <p class="mt-3 text-sm text-gh-text">{{ TAB_HINT[tab] }}</p>

      <div class="mt-4">
        <Heatmap :tab="tab" :map="rows" :today="today" :selected="selectedDate" @select="selectedDate = $event" />
      </div>

      <div class="mt-3 flex items-center gap-2 text-[11px] text-gh-muted">
        <span>少</span>
        <span
          v-for="(c, i) in legend"
          :key="i"
          class="inline-block h-2.5 w-2.5 rounded-[2px] border border-[#1c2128]"
          :style="{ background: c }"
        />
        <span>多</span>
      </div>
    </section>
  </div>
</template>

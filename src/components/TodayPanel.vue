<script setup>
import { computed } from 'vue';
import { dayScore } from '../score.js';

const props = defineProps({
  row: { type: Object, required: true },
  today: { type: String, required: true }
});
const emit = defineEmits(['update']);

const isToday = computed(() => props.row.date === props.today);
const score = computed(() => dayScore(props.row));
const waterPts = computed(() => {
  const w = props.row.water || 0;
  if (w >= 5) return 2;
  if (w >= 3) return 1;
  return 0;
});

function setWater(n) {
  const next = props.row.water === n ? n - 1 : n;
  emit('update', { ...props.row, water: Math.max(0, next) });
}

function toggle(key) {
  emit('update', { ...props.row, [key]: props.row[key] ? 0 : 1 });
}

function formatTitle(iso) {
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  const week = '日一二三四五兦'[dt.getDay()];
  return `${y}年${Number(m)}月${Number(d)}日 星期${week}`;
}
</script>

<template>
  <section class="rounded-xl border border-gh-border bg-gh-panel p-4 md:p-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-widest text-gh-muted">
          {{ isToday ? 'TODAY' : '补打卡' }}
        </p>
        <h2 class="mt-1 text-xl font-semibold md:text-2xl">{{ formatTitle(row.date) }}</h2>
      </div>
      <div class="text-right">
        <p class="text-xs text-gh-muted">当日总分</p>
        <p class="font-mono text-3xl font-semibold tabular-nums">
          {{ score }}<span class="text-lg text-gh-muted">/5</span>
        </p>
      </div>
    </div>

    <div class="mt-5 grid gap-3 md:grid-cols-2">
      <div class="rounded-lg border border-gh-border bg-gh-bg/60 p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm">喝水</span>
          <span class="text-xs text-gh-muted">{{ row.water }}/5 · {{ waterPts }} 分（3–4 杯 1 分，5 杯 2 分）</span>
        </div>
        <div class="mt-3 flex gap-2">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="h-10 flex-1 rounded-md border text-sm transition"
            :class="
              row.water >= n
                ? 'border-[#1f6feb] bg-[#1f6feb] text-white'
                : 'border-gh-border bg-transparent text-gh-muted hover:border-[#1f6feb]/60'
            "
            :aria-label="`喝水 ${n} 次`"
            @click="setWater(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="rounded-lg border px-2 py-3 text-sm transition"
          :class="row.sleep ? 'border-[#d29922] bg-[#9e6a00] text-white' : 'border-gh-border text-gh-muted hover:border-[#d29922]/50'"
          @click="toggle('sleep')"
        >
          <div class="text-lg">{{ row.sleep ? '✓' : '○' }}</div>
          早睡
        </button>
        <button
          type="button"
          class="rounded-lg border px-2 py-3 text-sm transition"
          :class="row.workout ? 'border-[#f85149] bg-[#a40e26] text-white' : 'border-gh-border text-gh-muted hover:border-[#f85149]/50'"
          @click="toggle('workout')"
        >
          <div class="text-lg">{{ row.workout ? '✓' : '○' }}</div>
          锻炼
        </button>
        <button
          type="button"
          class="rounded-lg border px-2 py-3 text-sm transition"
          :class="row.study ? 'border-[#f0883e] bg-[#9e4c00] text-white' : 'border-gh-border text-gh-muted hover:border-[#f0883e]/50'"
          @click="toggle('study')"
        >
          <div class="text-lg">{{ row.study ? '✓' : '○' }}</div>
          学习
        </button>
      </div>
    </div>
  </section>
</template>

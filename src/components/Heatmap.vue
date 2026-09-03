<script setup>
import { computed } from 'vue';
import {
  addDays,
  weekdayMon0,
  cellColor,
  cellValue,
  dayScore
} from '../score.js';

const props = defineProps({
  tab: { type: String, required: true },
  map: { type: Object, required: true },
  today: { type: String, required: true },
  selected: { type: String, required: true }
});
const emit = defineEmits(['select']);

const WEEKS = 53;
const WEEKDAYS = ['', '一', '', '三', '', '五', ''];

const cells = computed(() => {
  const mon0 = weekdayMon0(props.today);
  const weekStart = addDays(props.today, -mon0);
  const start = addDays(weekStart, -(WEEKS - 1) * 7);
  const list = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = addDays(start, i);
    const future = date > props.today;
    const row = props.map[date];
    list.push({
      date,
      future,
      color: future ? 'transparent' : cellColor(props.tab, row),
      value: future ? null : cellValue(props.tab, row),
      score: row ? dayScore(row) : 0
    });
  }
  return list;
});

const monthLabels = computed(() => {
  const labels = [];
  let lastKey = '';
  let lastWeek = -10;
  for (let w = 0; w < WEEKS; w++) {
    const week = cells.value.slice(w * 7, w * 7 + 7);
    const first = week.find((cell) => cell.date.slice(8) === '01' && cell.date <= props.today);
    if (!first) continue;
    const key = first.date.slice(0, 7);
    if (key === lastKey) continue;
    if (w - lastWeek < 2) continue;
    const year = first.date.slice(0, 4);
    const month = Number(first.date.slice(5, 7));
    const showYear = !labels.length || labels[labels.length - 1].year !== year;
    labels.push({
      week: w,
      year,
      text: showYear ? `${year}/ ${month}月` : `${month}月`
    });
    lastKey = key;
    lastWeek = w;
  }
  return labels;
});

const rangeText = computed(() => {
  const first = cells.value.find((cell) => !cell.future)?.date;
  if (!first) return '';
  return `${first.slice(0, 7)} → ${props.today.slice(0, 7)} · 右侧是本周`;
});

function title(cell) {
  if (cell.future) return '';
  if (props.tab === 'overview') return `${cell.date} · ${cell.score}/5`;
  if (props.tab === 'water') return `${cell.date} · 喝水 ${cell.value}/5`;
  return `${cell.date} · ${cell.value ? '已完成' : '未完成'}`;
}
</script>

<template>
  <div class="heatmap-wrap overflow-x-auto pb-1">
    <p class="mb-2 text-[11px] text-gh-muted">{{ rangeText }}</p>
    <div class="min-w-[760px]">
      <div class="relative mb-1 h-4 pl-5">
        <span
          v-for="label in monthLabels"
          :key="label.week + label.text"
          class="absolute top-0 whitespace-nowrap text-[10px] leading-4 text-gh-muted"
          :style="{ left: `calc(1.25rem + ${label.week} * (var(--hm-size) + var(--hm-gap)))` }"
        >{{ label.text }}</span>
      </div>
      <div class="flex items-start gap-1">
        <div
          class="grid w-4 shrink-0 text-[10px] leading-none text-gh-muted"
          :style="{ gridTemplateRows: 'repeat(7, var(--hm-size))', gap: 'var(--hm-gap)' }"
        >
          <span v-for="(d, i) in WEEKDAYS" :key="i" class="flex items-center">{{ d }}</span>
        </div>
        <div class="heatmap-grid">
          <button
            v-for="cell in cells"
            :key="cell.date"
            type="button"
            class="rounded-[2px] outline-none ring-offset-1 ring-offset-gh-panel"
            :class="[
              cell.future ? 'cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-white/40',
              selected === cell.date ? 'ring-1 ring-white' : ''
            ]"
            :style="{ background: cell.future ? '#0d1117' : cell.color, border: '1px solid #1c2128' }"
            :title="title(cell)"
            :disabled="cell.future"
            @click="!cell.future && emit('select', cell.date)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

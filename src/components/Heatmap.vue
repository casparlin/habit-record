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
  let last = '';
  for (let w = 0; w < WEEKS; w++) {
    const date = cells.value[w * 7]?.date;
    if (!date) {
      labels.push('');
      continue;
    }
    const m = date.slice(5, 7);
    if (m !== last) {
      labels.push(String(Number(m)) + '月');
      last = m;
    } else {
      labels.push('');
    }
  }
  return labels;
});

function title(cell) {
  if (cell.future) return '';
  if (props.tab === 'overview') return `${cell.date} · ${cell.score}/5`;
  if (props.tab === 'water') return `${cell.date} · 喝水 ${cell.value}/5`;
  return `${cell.date} · ${cell.value ? '已完成' : '未完成'}`;
}
</script>

<template>
  <div class="overflow-x-auto pb-1">
    <div class="min-w-[720px]">
      <div class="mb-1 grid gap-[3px] pl-5" style="grid-template-columns: repeat(53, 11px)">
        <span
          v-for="(label, i) in monthLabels"
          :key="i"
          class="h-4 text-[10px] leading-4 text-gh-muted"
          >{{ label }}</span
        >
      </div>
      <div class="flex gap-1">
        <div class="flex w-4 flex-col justify-between py-[1px] text-[10px] text-gh-muted">
          <span></span>
          <span>一</span>
          <span></span>
          <span>三</span>
          <span></span>
          <span>五</span>
          <span></span>
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

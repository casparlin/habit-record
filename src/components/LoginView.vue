<script setup>
import { computed, onMounted, ref } from 'vue';

const emit = defineEmits(['success']);
const name = ref('');
const token = ref('');
const error = ref('');
const loading = ref(false);
const debug = ref(null);
const lastRequest = ref(null);
const lastResponse = ref(null);

const inputDebug = computed(() => ({
  value: token.value,
  json: JSON.stringify(token.value),
  length: token.value.length,
  trimmedLength: token.value.trim().length,
  codes: [...token.value].map((ch) => ch.charCodeAt(0)),
  equalsSecret2: debug.value?.secrets?.['2'] === token.value.trim()
}));

onMounted(async () => {
  try {
    const res = await fetch('/api/status', { credentials: 'include' });
    debug.value = await res.json();
  } catch (err) {
    debug.value = { ok: false, error: String(err) };
  }
});

async function submit() {
  error.value = '';
  loading.value = true;
  const payload = { token: token.value.trim(), name: name.value.trim() };
  lastRequest.value = payload;
  lastResponse.value = null;
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({ parseError: true, status: res.status }));
    lastResponse.value = { status: res.status, data };
    if (!res.ok) {
      const extra = data || {};
      if (extra.error === 'no_tokens_configured') error.value = 'Worker 读不到密钥';
      else error.value = `登录失败 HTTP ${res.status} equals2=${extra.debug?.equals2}`;
      return;
    }
    const { login } = await import('../api.js');
    // keep cookie from the request above; just notify app
    emit('success', data || {});
  } catch (err) {
    lastResponse.value = { clientError: String(err) };
    error.value = String(err);
  } finally {
    loading.value = false;
  }
}

function fillSecret2() {
  token.value = debug.value?.secrets?.['2'] || '123456';
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <form
      class="w-full max-w-lg rounded-xl border border-gh-border bg-gh-panel p-6 shadow-xl"
      @submit.prevent="submit"
    >
      <h1 class="text-lg font-semibold tracking-tight">习惯打卡</h1>
      <p class="mt-1 text-sm text-gh-muted">调试中：下方会显示你正在输入的内容。</p>
      <label class="mt-5 block text-xs text-gh-muted">显示名</label>
      <input
        v-model="name"
        type="text"
        maxlength="16"
        class="mt-1 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm outline-none focus:border-gh-link"
      />
      <label class="mt-4 block text-xs text-gh-muted">Access Token</label>
      <input
        v-model="token"
        type="text"
        autocomplete="off"
        class="mt-1 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm outline-none focus:border-gh-link"
        placeholder="直接打明文，方便对照"
      />
      <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
      <div class="mt-4 flex gap-2">
        <button
          type="submit"
          class="flex-1 rounded-md bg-[#238636] px-3 py-2 text-sm font-medium text-white hover:bg-[#2ea043] disabled:opacity-60"
          :disabled="loading || !token"
        >
          {{ loading ? '验证中…' : '进入' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-gh-border px-3 py-2 text-sm text-gh-muted"
          @click="fillSecret2"
        >
          填入 _2
        </button>
      </div>

      <pre class="mt-4 overflow-auto whitespace-pre-wrap break-all rounded-md border border-yellow-700/50 bg-black/40 p-3 text-[11px] leading-5 text-yellow-200">输入框
{{ JSON.stringify(inputDebug, null, 2) }}

上次请求
{{ JSON.stringify(lastRequest, null, 2) }}

上次响应
{{ JSON.stringify(lastResponse, null, 2) }}

/api/status
{{ debug ? JSON.stringify(debug, null, 2) : '加载中…' }}</pre>
    </form>
  </div>
</template>

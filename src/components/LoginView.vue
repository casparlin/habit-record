<script setup>
import { ref } from 'vue';

const emit = defineEmits(['success']);
const name = ref('');
const token = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { login } = await import('../api.js');
    const result = await login(token.value.trim(), name.value.trim());
    emit('success', result || {});
  } catch (err) {
    error.value =
      err?.code === 'no_tokens_configured'
        ? 'Cloudflare 里还没配 Token 变量'
        : 'Token 不正确';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <form
      class="w-full max-w-sm rounded-xl border border-gh-border bg-gh-panel p-6 shadow-xl"
      @submit.prevent="submit"
    >
      <h1 class="text-lg font-semibold tracking-tight">习惯打卡</h1>
      <p class="mt-1 text-sm text-gh-muted">会话 30 天。名字绑在你的 Token 上，后面还可以改。</p>
      <label class="mt-5 block text-xs text-gh-muted">显示名</label>
      <input
        v-model="name"
        type="text"
        name="username"
        autocomplete="username"
        maxlength="16"
        class="mt-1 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm outline-none focus:border-gh-link"
        placeholder="例如小 A，可空着"
      />
      <label class="mt-4 block text-xs text-gh-muted">Access Token</label>
      <input
        v-model="token"
        type="password"
        name="password"
        autocomplete="current-password"
        class="mt-1 w-full rounded-md border border-gh-border bg-gh-bg px-3 py-2 text-sm outline-none focus:border-gh-link"
        placeholder="从 Bitwarden 填充"
      />
      <p v-if="error" class="mt-2 text-sm text-red-400">{{ error }}</p>
      <button
        type="submit"
        class="mt-4 w-full rounded-md bg-[#238636] px-3 py-2 text-sm font-medium text-white hover:bg-[#2ea043] disabled:opacity-60"
        :disabled="loading || !token"
      >
        {{ loading ? '验证中…' : '进入' }}
      </button>
    </form>
  </div>
</template>

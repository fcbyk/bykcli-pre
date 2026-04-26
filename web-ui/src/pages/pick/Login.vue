<template>
  <!-- 弹窗遮罩层 -->
  <div v-if="modelValue" class="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="handleClose">
    <div class="w-full max-w-[400px] p-6 bg-[#1e293b]/95 rounded-[18px] border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md box-border animate-in fade-in zoom-in duration-200">
      <!-- 标题栏 -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="m-0 text-2xl font-bold text-(--text)">管理员登录</h1>
          <p class="m-0 mt-1 text-sm text-(--muted)">请输入管理员密码以进入管理系统</p>
        </div>
        <button 
          class="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-none text-(--muted) text-2xl cursor-pointer hover:text-(--text) transition-colors"
          @click="handleClose"
        >×</button>
      </div>
      
      <!-- 密码输入 -->
      <input
        v-model="password"
        type="password"
        placeholder="请输入管理员密码"
        class="w-full p-3 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-hidden focus:border-(--primary) focus:ring-1 focus:ring-(--primary)/40 transition-all"
        @keypress.enter="handleSubmit"
        ref="inputRef"
      />
      
      <!-- 错误提示 -->
      <p v-if="loginError" class="text-(--danger) text-[13px] mt-2">{{ loginError }}</p>
      
      <!-- 按钮 -->
      <button 
        class="mt-4 w-full rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224]" 
        @click="handleSubmit"
        :disabled="!password"
      >登录</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdmin } from './composables/useAdmin'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'login-success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement | null>(null)

const {
  password,
  loginError,
  handleLogin
} = useAdmin()

// 监听弹窗打开，自动聚焦
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

async function handleSubmit() {
  await handleLogin()
  if (sessionStorage.getItem('admin_authed') === '1') {
    // 登录成功，关闭弹窗并触发事件
    emit('update:modelValue', false)
    emit('login-success')
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* 弹窗动画 */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoom-in {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1);
  }
}

.animate-in {
  animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
}
</style>

<template>
  <div class="w-full h-dvh overflow-hidden flex flex-col">
    <!-- 登录界面 -->
    <LoginView
      v-if="!isAuthenticated"
      :is-loading="isLoading"
      :error-message="errorMessage"
      :show-qr="showQr"
      :qr-login-url="qrLoginUrl"
      :wifi-name="wifiName"
      :qr-token="qrToken"
      @login="handleLogin"
      @clear-error="clearError"
      @regenerate-qr="refreshQr"
    />

    <!-- 触摸板界面 -->
    <TouchpadView v-else />
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref } from 'vue'
import LoginView from './components/LoginView.vue'
import TouchpadView from './components/TouchpadView.vue'
import { useAuth } from './composables/useAuth'
import { useViewport } from './composables/useViewport'
import { useTheme } from './composables/useTheme'
import { initSocket } from './socket'
import { getQrLoginInfo } from './api'

// 修复移动端视口高度
useViewport()

const { initTheme, mediaQuery, handleThemeChange } = useTheme()

async function refreshQr() {
  const info = await getQrLoginInfo()
  if (info && info.loginUrl) {
    showQr.value = true
    qrLoginUrl.value = info.loginUrl
    if (info.wifiName) {
      wifiName.value = info.wifiName
    } else {
      wifiName.value = ''
    }
    try {
      const url = new URL(info.loginUrl)
      qrToken.value = url.searchParams.get('token') || ''
    } catch {
      qrToken.value = ''
    }
  } else {
    showQr.value = false
    qrLoginUrl.value = ''
    wifiName.value = ''
    qrToken.value = ''
  }
}

onMounted(() => {
  initTheme()
  mediaQuery.addEventListener('change', handleThemeChange)
  refreshQr()
})

onUnmounted(() => {
  mediaQuery.removeEventListener('change', handleThemeChange)
})

const { isAuthenticated, isLoading, errorMessage, login, clearError } = useAuth()

const showQr = ref(false)
const qrLoginUrl = ref('')
const wifiName = ref('')
const qrToken = ref('')

// 登录处理
async function handleLogin(password: string) {
  const success = await login(password)
  if (success) {
    // 登录成功，初始化 WebSocket
    initSocket()
  }
}

// 监听认证状态变化
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    // 已认证，初始化 WebSocket
    initSocket()
  }
})
</script>

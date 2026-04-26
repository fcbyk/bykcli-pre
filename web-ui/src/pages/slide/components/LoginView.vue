<template>
  <div
    class="min-h-dvh bg-(--background) text-(--text-primary) flex flex-col overflow-hidden relative select-none font-sans transition-colors duration-300"
  >
    <header class="flex items-center justify-between shrink-0 z-10 pt-[4vh] px-8">
      <div class="flex-1"></div>
      <div class="flex items-center">
        <button
          class="flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer transition-opacity duration-200 active:opacity-50"
          @click="toggleDarkMode"
        >
          <component :is="isDark ? Moon : Sun" class="text-[#8E8E93]" :size="24" :stroke-width="1.5" />
        </button>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center px-10 relative min-h-0">
      <template v-if="props.showQr && props.qrLoginUrl">
        <div class="mb-[4vh] flex justify-center">
          <div
            class="bg-white rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            :class="{ 'opacity-60': qrExpired }"
          >
            <img v-if="qrDataUrl" :src="qrDataUrl" class="block w-[240px] h-[240px]" />
          </div>
        </div>
        <div class="text-center text-[12px] tracking-widest text-(--text-secondary) font-medium mt-2">
          <p class="m-0 mb-1" v-if="!qrExpired">
            请确认手机已连接 Wi‑Fi：{{ wifiLabel }}
          </p>
          <p class="m-0 mb-1 text-[#FF3B30]" v-else>
            当前二维码已失效，请点击下方按钮重新生成
          </p>
          <p v-if="!qrExpired" class="m-0 opacity-80">
            然后使用手机浏览器扫码上方二维码进入控制界面
          </p>
          <button
            v-else
            class="mt-3 px-4 py-2 rounded-full border border-(--border) text-(--text-primary) bg-(--surface) cursor-pointer text-[12px] tracking-[0.2em]"
            @click="handleRegenerate"
          >
            重新生成二维码
          </button>
        </div>
      </template>

      <template v-else>
        <div class="text-center mb-[4vh]">
          <h1
            class="font-['Syncopate',sans-serif] text-[clamp(48px,12vw,72px)] font-bold tracking-[0.25em] mb-4 pl-[0.25em] text-(--text-primary)"
          >
            SLIDE
          </h1>
          <p class="text-[12px] tracking-widest text-(--text-secondary) font-medium m-0">
            准备好控制了吗？请输入访问密码
          </p>
        </div>

        <div class="w-full max-w-[320px] relative">
          <div class="relative flex items-center">
            <Key class="absolute left-0 text-(--text-secondary) opacity-50" :size="20" :stroke-width="1.5" />
            <input
              ref="passwordInputRef"
              v-model="password"
              type="password"
              class="w-full bg-transparent border-0 border-b-2 border-(--border) py-4 pl-10 text-center text-2xl tracking-[0.5em] text-(--text-primary) transition-colors outline-none font-['Space_Mono',monospace] placeholder:text-(--text-secondary) placeholder:opacity-30 focus:border-(--primary)"
              placeholder="••••••"
              autocomplete="off"
              @keypress.enter="handleLogin"
            />
          </div>
          <div v-if="errorMessage" class="text-[#FF3B30] text-xs mt-2 text-center absolute w-full">
            {{ errorMessage }}
          </div>
        </div>
      </template>
    </main>

    <footer v-if="!props.showQr" class="px-8 pb-[8vh] w-full max-w-[512px] mx-auto shrink-0 relative">
      <div
        ref="sliderTrackRef"
        class="relative h-16 w-full bg-(--surface) backdrop-blur border border-(--border) rounded-[32px] flex items-center p-[6px] overflow-hidden"
      >
        <div
          class="absolute inset-0 flex items-center justify-center text-[13px] tracking-[0.2em] text-(--text-secondary) font-medium pl-12 pointer-events-none"
        >
          右滑进入控制界面
        </div>
        <div
          class="h-[52px] w-[52px] bg-(--primary) rounded-[26px] flex items-center justify-center text-white cursor-pointer shadow-[0_4px_15px_rgba(0,122,255,0.4)] border-4 border-(--surface) z-10 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] select-none touch-none active:scale-95"
          :class="{ 'transition-none': isDragging }"
          :style="{ transform: `translateX(${sliderPosition}px)` }"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <ChevronRight :size="24" :stroke-width="1.5" />
        </div>
      </div>
    </footer>

    <div class="fixed bottom-0 left-1/2 -translate-x-1/2 pointer-events-none opacity-50">
      <div
        class="w-[300px] h-[150px] bg-[radial-gradient(circle_at_50%_100%,var(--primary)_0%,transparent_70%)] rounded-t-[150px] opacity-10"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { Sun, Moon, Key, ChevronRight } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'
import { getQrStatus } from '../api'
import '@fontsource/syncopate/700.css'
import '@fontsource/space-mono/400.css'
import QRCode from 'qrcode'

interface Props {
  isLoading?: boolean
  errorMessage?: string
  showQr?: boolean
  qrLoginUrl?: string
  wifiName?: string
  qrToken?: string
}

interface Emits {
  (e: 'login', password: string): void
  (e: 'clear-error'): void
  (e: 'regenerate-qr'): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  errorMessage: '',
  showQr: false,
  qrLoginUrl: '',
  wifiName: '',
  qrToken: ''
})

const emit = defineEmits<Emits>()

const password = ref('')
const passwordInputRef = ref<HTMLInputElement | null>(null)
const qrDataUrl = ref('')
const qrExpired = ref(false)

const wifiLabel = computed(() => {
  if (props.wifiName && props.wifiName.trim()) {
    return props.wifiName
  }
  return '未知 Wi‑Fi'
})

function handleRegenerate() {
  emit('regenerate-qr')
}

let qrStatusTimer: number | null = null

async function checkQrStatusOnce() {
  if (!props.qrToken) {
    return
  }
  const valid = await getQrStatus(props.qrToken)
  if (!valid) {
    qrExpired.value = true
    if (qrStatusTimer !== null) {
      window.clearInterval(qrStatusTimer)
      qrStatusTimer = null
    }
  }
}

function startQrStatusWatch() {
  if (!props.qrToken) {
    qrExpired.value = false
    if (qrStatusTimer !== null) {
      window.clearInterval(qrStatusTimer)
      qrStatusTimer = null
    }
    return
  }
  qrExpired.value = false
  if (qrStatusTimer !== null) {
    window.clearInterval(qrStatusTimer)
    qrStatusTimer = null
  }
  qrStatusTimer = window.setInterval(checkQrStatusOnce, 2000)
}

watch(
  () => props.qrToken,
  () => {
    startQrStatusWatch()
  }
)

onMounted(() => {
  if (props.qrToken) {
    startQrStatusWatch()
  }
})

onUnmounted(() => {
  if (qrStatusTimer !== null) {
    window.clearInterval(qrStatusTimer)
    qrStatusTimer = null
  }
})

// 暗色模式管理
const { isDark, toggleDarkMode } = useTheme()

// 初始化时同步一次状态
onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

async function renderQr() {
  if (!props.showQr || !props.qrLoginUrl) {
    qrDataUrl.value = ''
    return
  }
  try {
    const url = await QRCode.toDataURL(props.qrLoginUrl, {
      width: 240,
      margin: 1
    })
    qrDataUrl.value = url
  } catch {
    qrDataUrl.value = ''
  }
}

onMounted(() => {
  renderQr()
})

watch(
  () => [props.showQr, props.qrLoginUrl],
  () => {
    renderQr()
  }
)

// 监听输入变化，清除错误信息
watch(password, () => {
  if (props.errorMessage) {
    emit('clear-error')
  }
})

// 滑块逻辑
const sliderTrackRef = ref<HTMLElement | null>(null)
const sliderPosition = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const maxSliderDistance = ref(0)

function handleLogin() {
  if (props.isLoading) return
  
  // 触发登录
  emit('login', password.value)

  // 如果触发后依然不是加载状态（说明是同步失败，如空密码），手动重置滑块位置
  // 因为这种情况下 errorMessage 可能没有变化，导致 watch 不会触发
  nextTick(() => {
    if (!props.isLoading) {
      sliderPosition.value = 0
    }
  })
}

// 监听加载状态或错误消息，重置滑块
watch([() => props.isLoading, () => props.errorMessage], ([loading, error]) => {
  if (!loading || error) {
    sliderPosition.value = 0
  }
})

function startDrag(e: MouseEvent | TouchEvent) {
  if (props.isLoading) return
  isDragging.value = true
  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX
  
  if (sliderTrackRef.value) {
    const trackWidth = sliderTrackRef.value.clientWidth
    const thumbWidth = 52 // slider-thumb width
    maxSliderDistance.value = trackWidth - thumbWidth - 12 // 12 is padding (p-1.5 = 6px * 2)
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  
  // 阻止默认滚动行为
  if ('cancelable' in e && e.cancelable) {
    e.preventDefault()
  }

  const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const deltaX = currentX - startX.value
  
  sliderPosition.value = Math.max(0, Math.min(deltaX, maxSliderDistance.value))
  
  // 如果滑到最后，触发登录
  if (sliderPosition.value >= maxSliderDistance.value) {
    stopDrag()
    handleLogin()
  }
}

function stopDrag() {
  isDragging.value = false
  if (sliderPosition.value < maxSliderDistance.value) {
    sliderPosition.value = 0
  }
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

onMounted(() => {
  passwordInputRef.value?.focus()
  renderQr()
})

onUnmounted(() => {
  stopDrag()
})
</script>

<style scoped>
</style>

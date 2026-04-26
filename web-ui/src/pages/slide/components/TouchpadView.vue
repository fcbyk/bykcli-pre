<template>
  <div class="flex flex-col h-full w-full overflow-hidden bg-(--background) text-(--text-primary)">
    <header class="flex items-center justify-between px-6 py-4 shrink-0">
      <div
        class="status-indicator"
        :class="{ 'connected': isSocketConnected, 'connecting': isConnecting }"
        @click="handleReconnect"
      >
        <div
          class="dot w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.4)] transition-all"
        ></div>
        <span class="status-text text-sm font-semibold text-(--text-secondary)">
          {{ statusText }}
        </span>
        <span v-if="isSocketConnected" class="latency-text text-xs text-[#22C55E] font-mono opacity-80">
          {{ latency }}ms
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="w-10 h-10 rounded-full bg-(--icon-bg) flex items-center justify-center border border-(--border) shadow-sm cursor-pointer text-(--text-primary) transition-colors active:scale-95 hover:bg-(--icon-hover)"
          @click="toggleDarkMode"
        >
          <component :is="isDark ? Moon : Sun" class="w-5 h-5" />
        </button>
        <div class="relative inline-block" v-click-outside="closeSettings">
          <button
            class="w-10 h-10 rounded-full bg-(--icon-bg) flex items-center justify-center border border-(--border) shadow-sm cursor-pointer text-(--text-primary) transition-colors active:scale-95 hover:bg-(--icon-hover)"
            @click.stop="toggleSettings"
            @touchend.stop.prevent="toggleSettings"
          >
            <Settings class="w-5 h-5" />
          </button>

          <Transition name="fade-slide">
            <div
              v-if="showSettings"
              class="absolute right-0 mt-2 bg-(--surface) border border-(--border) rounded-xl shadow-lg min-w-max max-w-[50vw] z-999 overflow-hidden p-1 pointer-events-auto appearance-none"
            >
              <div
                class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-(--text-primary) cursor-pointer rounded-lg transition-colors whitespace-nowrap hover:bg-(--icon-hover) active:bg-(--border)"
                @click="toggleMouseMode"
                @touchend.stop.prevent="toggleMouseMode"
              >
                <component :is="isMouseMode ? Presentation : Mouse" class="shrink-0" :size="18" />
                <span>{{ isMouseMode ? '退出鼠标模式' : '进入鼠标模式' }}</span>
              </div>
              <div
                class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-(--text-primary) cursor-pointer rounded-lg transition-colors whitespace-nowrap hover:bg-(--icon-hover) active:bg-(--border)"
                @click="toggleDragMode"
                @touchend.stop.prevent="toggleDragMode"
              >
                <Mouse class="shrink-0" :size="18" />
                <span>{{ isDragMode ? '关闭拖拽模式' : '开启拖拽模式' }}</span>
              </div>
              <div
                class="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#EF4444] cursor-pointer rounded-lg transition-colors whitespace-nowrap hover:bg-[rgba(239,68,68,0.05)] active:bg-[rgba(239,68,68,0.1)]"
                @click="handleLogout"
                @touchend.stop.prevent="handleLogout"
              >
                <LogOut class="shrink-0" :size="18" />
                <span>退出登录</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <main
      class="flex-1 px-4 py-2 md:px-6 md:py-4 flex flex-col overflow-hidden transition-all duration-300"
      :class="{ 'pb-8': isMouseMode }"
    >
      <div
        ref="touchpadRef"
        class="touchpad-area flex-1 border-2 border-dashed border-(--border) rounded-3xl relative flex items-center justify-center bg-(--touchpad-bg) shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] touch-none bg-[radial-gradient(circle,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-size-[24px_24px]"
      >
        <div
          class="touchpad-hint text-center pointer-events-none select-none opacity-40 flex flex-col items-center gap-3"
        >
          <Hand class="hint-icon w-10 h-10 text-(--text-secondary)" />
          <div class="hint-text flex flex-col gap-1">
            <p class="text-sm font-medium text-(--text-secondary)">单指移动鼠标</p>
            <p class="text-sm font-medium text-(--text-secondary)">单指点击左键</p>
            <p class="text-sm font-medium text-(--text-secondary)">双指滑动滚动</p>
            <p class="text-sm font-medium text-(--text-secondary)">双指点击右键</p>
          </div>
        </div>
        <div
          class="touchpad-label absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-(--icon-bg) rounded-full border border-(--border)"
        >
          <div class="pulse-dot w-2 h-2 rounded-full bg-[#22C55E]"></div>
          <span
            class="label-text text-[0.625rem] uppercase font-bold tracking-[0.05em] text-(--text-secondary)"
          >
            触控区域
          </span>
        </div>
      </div>
    </main>

    <footer
      v-if="!isMouseMode"
      class="px-4 py-4 md:px-6 grid grid-cols-2 gap-4 shrink-0 mb-6"
    >
      <button
        class="control-btn flex flex-col items-center justify-center py-6 rounded-3xl cursor-pointer transition-transform duration-200 active:scale-95 bg-(--surface) text-(--text-primary) border border-(--border) shadow-md"
        @click="handlePrev"
      >
        <span class="btn-label text-xl font-bold">上一页</span>
        <span
          class="btn-sub-label text-xs mt-1 uppercase tracking-[0.05em] text-(--text-secondary)"
        >
          PREVIOUS
        </span>
      </button>
      <button
        class="control-btn flex flex-col items-center justify-center py-6 rounded-3xl cursor-pointer transition-transform duration-200 active:scale-95 bg-(--primary) text-white shadow-lg"
        @click="handleNext"
      >
        <span class="btn-label text-xl font-bold">下一页</span>
        <span
          class="btn-sub-label text-xs mt-1 uppercase tracking-[0.05em] text-[rgba(255,255,255,0.6)]"
        >
          NEXT SLIDE
        </span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Sun, Moon, Settings, Hand, LogOut, Mouse, Presentation } from 'lucide-vue-next'
import { useTouchpad } from '../composables/useTouchpad'
import { useTheme } from '../composables/useTheme'
import { prevSlide, nextSlide, logout } from '../api'
import { isConnected, getLatency, disconnectSocket, connectSocket } from '../socket'

const isMouseMode = ref(false)
const isDragMode = ref(false)
const { touchpadRef, bindTouchEvents, unbindTouchEvents } = useTouchpad(() => isDragMode.value)

// 状态追踪
const isSocketConnected = ref(isConnected())
const isConnecting = ref(false)
const latency = ref(getLatency())
let statusTimer: any = null

const statusText = computed(() => {
  if (isSocketConnected.value) return '已连接'
  if (isConnecting.value) return '连接中...'
  return '未连接 (点击重连)'
})

// 设置菜单
const showSettings = ref(false)
function toggleSettings() {
  showSettings.value = !showSettings.value
}
function closeSettings() {
  showSettings.value = false
}

function toggleMouseMode() {
  isMouseMode.value = !isMouseMode.value
  showSettings.value = false
}

function toggleDragMode() {
  isDragMode.value = !isDragMode.value
  showSettings.value = false
}

async function handleLogout() {
  await logout()
  disconnectSocket()
  window.location.reload() // 刷新页面回到登录页
}

// 指令
const vClickOutside = {
  mounted(el: any, binding: any) {
    el._clickOutside = (event: Event) => {
      // 如果点击的是元素本身或其子元素，则不触发
      if (el === event.target || el.contains(event.target)) {
        return
      }
      binding.value(event)
    }
    // 使用 capture 模式，确保在冒泡到按钮的 stopPropagation 之前不会被意外触发
    // 或者干脆只监听 click，因为我们在按钮上已经处理了 touchend
    document.addEventListener('click', el._clickOutside)
    document.addEventListener('touchstart', el._clickOutside)
  },
  unmounted(el: any) {
    document.removeEventListener('click', el._clickOutside)
    document.removeEventListener('touchstart', el._clickOutside)
  }
}

// 暗色模式管理
const { isDark, toggleDarkMode } = useTheme()

// 初始化时同步一次状态
onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

function handlePrev() {
  prevSlide()
}

function handleNext() {
  nextSlide()
}

function handleReconnect() {
  if (isSocketConnected.value || isConnecting.value) return
  
  isConnecting.value = true
  connectSocket()
  
  // 3秒后如果还没连上，取消连接中状态
  setTimeout(() => {
    isConnecting.value = false
  }, 3000)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && !isConnected()) {
    console.log('Page visible, attempting to reconnect socket...')
    handleReconnect()
  }
}

onMounted(() => {
  if (touchpadRef.value) {
    bindTouchEvents(touchpadRef.value)
  }

  // 监听可见性变化，实现自动重连
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // 定时更新状态
  statusTimer = setInterval(() => {
    const connected = isConnected()
    isSocketConnected.value = connected
    if (connected) {
      isConnecting.value = false
    }
    latency.value = getLatency()
  }, 1000)
})

onUnmounted(() => {
  if (touchpadRef.value) {
    unbindTouchEvents(touchpadRef.value)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (statusTimer) {
    clearInterval(statusTimer)
  }
})
</script>

<style scoped>
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.status-indicator:active {
  transform: scale(0.95);
  background: rgba(0, 0, 0, 0.1);
}

.dark .status-indicator {
  background: rgba(255, 255, 255, 0.1);
}

.status-indicator.connecting .dot {
  background-color: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
  animation: pulse 1.5s infinite;
}

.status-indicator.connected .dot {
  background-color: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
}

.pulse-dot {
  animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-yellow {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

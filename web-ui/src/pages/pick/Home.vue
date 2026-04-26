<template>
  <main class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[1200px] p-8 mx-auto min-[881px]:h-auto max-[880px]:h-full max-[880px]:w-full max-[880px]:overflow-y-auto">
      <!-- 普通抽奖 -->
      <div 
        class="group relative rounded-[18px] p-6 bg-linear-to-br from-(--primary)/15 to-(--accent)/15 border border-white/8 hover:border-(--primary)/30 transition-all duration-300 cursor-pointer overflow-hidden"
        @click="navigateTo('/item-pick')"
      >
        <!-- 背景装饰 -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-(--primary)/10 rounded-full blur-3xl group-hover:bg-(--primary)/20 transition-all duration-500"></div>
        
        <!-- 图标 -->
        <div class="relative z-10 w-16 h-16 rounded-2xl bg-linear-to-br from-(--primary) to-(--accent) flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(34,211,238,0.3)] group-hover:scale-110 transition-transform duration-300">
          <span class="text-3xl">🎲</span>
        </div>

        <!-- 标题 -->
        <h2 class="relative z-10 text-xl font-bold text-(--text) mb-2">普通抽奖</h2>
        
        <!-- 描述 -->
        <p class="relative z-10 text-(--muted) text-sm leading-relaxed mb-4">
          从自定义列表中随机抽取，支持无放回模式、速度调节等功能
        </p>

        <!-- 特性标签 -->
        <div class="relative z-10 flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">列表抽奖</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">动画效果</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">可配置</span>
        </div>

        <!-- 悬停箭头 -->
        <div class="absolute top-6 right-6 text-(--muted) group-hover:text-(--primary) group-hover:translate-x-1 transition-all duration-300">
          <span class="text-xl">→</span>
        </div>
      </div>

      <!-- 文件抽奖 -->
      <div 
        :class="[
          'group relative rounded-[18px] p-6 border transition-all duration-300 overflow-hidden',
          isFilesMode 
            ? 'bg-linear-to-br from-(--accent)/15 to-(--primary)/15 border-white/8 hover:border-(--accent)/30 cursor-pointer'
            : 'bg-white/2 border-white/4 opacity-60 cursor-not-allowed'
        ]"
        @click="isFilesMode && navigateTo('/f')"
      >
        <!-- 背景装饰 -->
        <div v-if="isFilesMode" class="absolute -top-20 -right-20 w-40 h-40 bg-(--accent)/10 rounded-full blur-3xl group-hover:bg-(--accent)/20 transition-all duration-500"></div>
        
        <!-- 图标 -->
        <div :class="[
          'relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300',
          isFilesMode 
            ? 'bg-linear-to-br from-(--accent) to-(--primary) shadow-[0_8px_24px_rgba(34,211,238,0.3)] group-hover:scale-110'
            : 'bg-white/10 shadow-none grayscale'
        ]">
          <span class="text-3xl">📁</span>
        </div>

        <!-- 标题 -->
        <h2 :class="[
          'relative z-10 text-xl font-bold mb-2',
          isFilesMode ? 'text-(--text)' : 'text-(--muted)'
        ]">文件抽奖</h2>
        
        <!-- 描述 -->
        <p :class="[
          'relative z-10 text-sm leading-relaxed mb-4',
          isFilesMode ? 'text-(--muted)' : 'text-(--muted)/60'
        ]">
          从文件或目录中随机抽取，支持兑换码和 IP 限制模式
        </p>

        <!-- 特性标签 -->
        <div v-if="isFilesMode" class="relative z-10 flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">文件模式</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">兑换码</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">下载</span>
        </div>
        <div v-else class="relative z-10 flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--muted)">需要 -f 参数</span>
        </div>

        <!-- 状态指示器 -->
        <div v-if="!isFilesMode" class="absolute top-6 right-6 text-(--muted)">
          <span class="text-xl">⊘</span>
        </div>
        <div v-else class="absolute top-6 right-6 text-(--muted) group-hover:text-(--accent) group-hover:translate-x-1 transition-all duration-300">
          <span class="text-xl">→</span>
        </div>
      </div>

      <!-- 管理后台 -->
      <div 
        class="group relative rounded-[18px] p-6 bg-linear-to-br from-(--primary)/10 to-transparent border border-white/8 hover:border-(--primary)/30 transition-all duration-300 cursor-pointer overflow-hidden"
        @click="handleAdminClick"
      >
        <!-- 背景装饰 -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-(--primary)/5 rounded-full blur-3xl group-hover:bg-(--primary)/15 transition-all duration-500"></div>
        
        <!-- 图标 -->
        <div class="relative z-10 w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(255,255,255,0.15)] group-hover:scale-110 transition-all duration-300">
          <span class="text-3xl">⚙️</span>
        </div>

        <!-- 标题 -->
        <h2 class="relative z-10 text-xl font-bold text-(--text) mb-2">管理后台</h2>
        
        <!-- 描述 -->
        <p class="relative z-10 text-sm text-(--muted) leading-relaxed mb-4">
          管理抽奖元素、兑换码、批量生成、查看使用状态等
        </p>

        <!-- 特性标签 -->
        <div class="relative z-10 flex flex-wrap gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">元素管理</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">兑换码管理</span>
          <span class="px-2.5 py-1 rounded-lg bg-white/5 border border-white/6 text-xs text-(--text)">批量生成</span>
        </div>

        <!-- 悬停箭头 -->
        <div class="absolute top-6 right-6 text-(--muted) group-hover:text-(--primary) group-hover:translate-x-1 transition-all duration-300">
          <span class="text-xl">→</span>
        </div>
      </div>

    <!-- 登录弹窗 -->
    <LoginModal 
      v-model="showLoginModal" 
      @login-success="handleLoginSuccess"
    />
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchInfo } from './api'
import LoginModal from './Login.vue'

const router = useRouter()
const isFilesMode = ref(false)
const loading = ref(true)
const showLoginModal = ref(false)

// 获取启动信息
async function loadInfo() {
  try {
    const info = await fetchInfo()
    isFilesMode.value = info.files_mode
  } catch (error) {
    console.error('Failed to load info:', error)
    isFilesMode.value = false
  } finally {
    loading.value = false
  }
}

// 导航到指定页面
function navigateTo(path: string) {
  router.push(path)
}

// 处理管理后台点击
function handleAdminClick() {
  // 检查是否已登录
  if (sessionStorage.getItem('admin_authed') === '1') {
    router.push('/admin')
  } else {
    showLoginModal.value = true
  }
}

// 处理登录成功
function handleLoginSuccess() {
  router.push('/admin')
}

// 初始化
onMounted(() => {
  loadInfo()
})
</script>

<style scoped>
.bg-linear-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}
</style>

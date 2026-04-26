<template>
  <div v-if="previewFile" class="flex flex-col h-full min-h-0">
    <div class="flex-1 overflow-hidden w-full h-full p-0 min-h-0 flex justify-center items-stretch">
      <div v-if="previewLoading" class="p-10 text-center text-[#999]">加载中...</div>
      <div v-else-if="previewError" class="p-10 text-center text-[#e74c3c]">
        <div class="mb-4">{{ previewError }}</div>
        <a
          v-if="shouldShowOpenInBrowser"
          :href="openInBrowserHref"
          class="bg-[#2ecc71] text-white border-none px-[10px] py-[5px] rounded cursor-pointer no-underline text-[12px] flex-none ml-2.5 hover:bg-[#27ae60]"
          target="_blank"
          rel="noopener noreferrer"
        >
          在浏览器打开
        </a>
      </div>
      <div v-else-if="isVideo" class="flex flex-col justify-center items-center gap-3 min-h-[200px] max-w-full max-h-full relative">
        <div v-if="videoLoading" class="flex flex-col items-center justify-center min-h-[240px] p-8">
          <div class="w-10 h-10 border-4 border-[#e5e7eb] border-t-[#3b82f6] rounded-full animate-spin mb-4"></div>
          <div class="text-[#6b7280] text-[0.9rem]">视频加载中，请稍候...</div>
        </div>
        <video 
          v-show="!videoLoading"
          ref="videoPlayer"
          class="max-w-full max-h-full object-contain rounded"
          :src="videoSrc" 
          controls 
          preload="metadata" 
          playsinline 
          @loadeddata="onVideoLoaded"
          @error="onVideoError"
        />
      </div>
      <div v-else-if="previewFile.is_image" class="relative flex justify-center items-center min-h-[200px] w-full h-full">
        <!-- 上一张图片按钮 -->
        <button
          v-if="canGoPrev"
          type="button"
          class="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none w-10 h-10 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          @click="handlePrevImage"
          title="上一张"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        
        <!-- 图片显示 -->
        <img class="max-w-full max-h-full object-contain" :src="imageSrc" :alt="previewFile.name" />
        
        <!-- 下一张图片按钮 -->
        <button
          v-if="canGoNext"
          type="button"
          class="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white border-none w-10 h-10 rounded-full cursor-pointer flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          @click="handleNextImage"
          title="下一张"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        
        <!-- 图片计数器 -->
        <div v-if="totalImages > 0" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {{ currentImageIndex + 1 }} / {{ totalImages }}
        </div>
      </div>
      <div v-else-if="previewFile.is_binary" class="p-10 text-center flex flex-col items-center justify-center">
        <p class="mb-5 text-[#666]">无法预览二进制文件</p>
        <a :href="`/api/preview/${encodeURIComponent(previewFile.path)}`" class="bg-[#2ecc71] text-white border-none px-[10px] py-[5px] rounded cursor-pointer no-underline text-[12px] flex-none ml-2.5 hover:bg-[#27ae60]" target="_blank">在浏览器打开</a>
      </div>
      <div v-else class="flex-1 min-h-0 w-full h-full relative group">
        <button
          type="button"
          class="select-none absolute top-[15px] right-[25px] z-3 appearance-none border border-[rgba(0,0,0,0.12)] bg-[rgba(255,255,255,0.9)] text-[#374151] text-[12px] leading-none px-2.5 py-[7px] rounded-lg cursor-pointer opacity-0 pointer-events-none transition-all duration-150 -translate-y-0.5 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 active:translate-y-0 active:scale-95 hover:border-[rgba(0,0,0,0.18)] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed md:opacity-100 md:pointer-events-auto md:translate-y-0"
          :disabled="!previewFile?.content"
          @click="onCopyClick"
        >
          {{ copyStateLabel }}
        </button>
        <div class="flex items-start w-full h-full min-h-0 overflow-auto touch-pan-x touch-pan-y rounded">
          <div class="flex-none px-2 py-0 text-[#9ca3af] bg-[#fafafa] border-r border-[#eee] text-right select-none font-mono text-sm leading-relaxed sticky left-0 z-1" aria-hidden="true">
            <div v-for="n in lineCount" :key="n" class="leading-relaxed whitespace-nowrap">{{ n }}</div>
          </div>
          <pre class="m-0 py-0 px-2 font-mono text-sm leading-relaxed whitespace-pre word-wrap-normal flex-auto min-w-0 overflow-visible"><code class="hljs p-0! font-inherit text-[#333] overflow-x-visible!" v-html="highlightedHtml"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(pre code.hljs) {
  padding: 0 !important;
}
</style>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import type { PreviewFile } from '../types'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import cpp from 'highlight.js/lib/languages/cpp'
import 'highlight.js/styles/github.css'

// 只注册需要的语言
hljs.registerLanguage('python', python)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c++', cpp) // 同时注册 c++ 别名



const copyState = ref<'idle' | 'success' | 'error'>('idle')
const copyStateLabel = computed(() => {
  switch (copyState.value) {
    case 'success':
      return 'Copied!'
    case 'error':
      return 'Copy failed'
    default:
      return 'Copy'
  }
})

const onCopyClick = async () => {
  if (!props.previewFile?.content) return

  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(props.previewFile.content)
    } else {
      // 降级方案：使用 document.execCommand
      const textarea = document.createElement('textarea')
      textarea.value = props.previewFile.content
      textarea.style.position = 'fixed' // 避免滚动到页面底部
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    
    copyState.value = 'success'
  } catch (err) {
    console.error('复制失败:', err)
    copyState.value = 'error'
  }

  // 2秒后恢复初始状态
  const timer = setTimeout(() => {
    copyState.value = 'idle'
    clearTimeout(timer)
  }, 2000)
}

const props = defineProps<{
  previewFile: PreviewFile | null
  previewLoading: boolean
  previewError: string
  videoLoading: boolean
  canGoPrev: boolean
  canGoNext: boolean
  currentImageIndex: number
  totalImages: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'videoLoaded'): void
  (e: 'videoError'): void
  (e: 'prevImage'): void
  (e: 'nextImage'): void
}>()

const handlePrevImage = () => {
  emit('prevImage')
}

const handleNextImage = () => {
  emit('nextImage')
}

const videoPlayer = ref<HTMLVideoElement | null>(null)

function abortVideoDownload() {
  const el = videoPlayer.value
  if (!el) return

  try {
    // 强制中止当前媒体下载：pause + 清空 src + load
    el.pause()
    el.removeAttribute('src')
    // 某些浏览器会保留 currentSrc，调用 load() 可让其进入空资源状态
    el.load()
  } catch (err) {
    console.warn('abortVideoDownload failed:', err)
  }
}

const onVideoLoaded = () => {
  emit('videoLoaded')
}

const onVideoError = (e: Event) => {
  console.error('视频加载失败:', e)
  emit('videoError')
}

// 只要预览文件切换，若上一个是视频，主动中止旧视频下载，避免后端连接堆积
watch(
  () => props.previewFile,
  (_newFile, oldFile) => {
    if (oldFile) {
      // 判断旧文件是否为视频
      const wasVideo = typeof oldFile.is_video === 'boolean' ? oldFile.is_video : isVideoFileName(oldFile.name)
      if (wasVideo) {
        abortVideoDownload()
      }
    }
  }
)

onBeforeUnmount(() => {
  abortVideoDownload()
})

function isVideoFileName(name: string) {
  const lower = (name || '').toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')
}

const isVideo = computed(() => {
  const file = props.previewFile
  if (!file) return false
  // 以服务端标记为准；缺失时用后缀兜底
  if (typeof file.is_video === 'boolean') return file.is_video
  return isVideoFileName(file.name)
})

const videoSrc = computed(() => {
  if (!props.previewFile) return ''
  // 走后端新增的 Range 预览接口，支持拖动进度条/快进
  return `/api/preview/${encodeURIComponent(props.previewFile.path)}`
})

const imageSrc = computed(() => {
  if (!props.previewFile) return ''
  return `/api/download/${encodeURIComponent(props.previewFile.path)}`
})

const openInBrowserHref = computed(() => {
  if (!props.previewFile) return ''
  // 对视频优先走 /api/preview（Range），其它默认走 /api/preview（通常会直接在浏览器打开或下载）
  // 图片走 /api/download 也可以打开，但为保持与二进制一致，这里统一走 preview
  return `/api/preview/${encodeURIComponent(props.previewFile.path)}`
})

const shouldShowOpenInBrowser = computed(() => {
  // 只要预览失败（有 previewError）且存在文件信息，就显示“在浏览器打开”
  return !!props.previewFile && !!props.previewError
})

function guessLangByName(name: string) {
  const lower = name.toLowerCase()
  if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript'
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.cts')) return 'typescript'
  if (lower.endsWith('.vue')) return 'xml'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.scss')) return 'scss'
  if (lower.endsWith('.html') || lower.endsWith('.xml')) return 'xml'
  if (lower.endsWith('.md')) return 'markdown'
  if (lower.endsWith('.py')) return 'python'
  // 只支持 cpp/py 高亮，其它都不做高亮（避免把更多语言打进包里）
  if (
    lower.endsWith('.cc') ||
    lower.endsWith('.cpp') ||
    lower.endsWith('.cxx') ||
    lower.endsWith('.hpp') ||
    lower.endsWith('.hxx')
  )
    return 'cpp'
  return ''
}

const lineCount = computed(() => {
  const file = props.previewFile
  if (!file?.content) return 0
  const maxChars = 400_000
  const content = file.content.length > maxChars ? file.content.slice(0, maxChars) : file.content
  // 兼容 \n / \r\n
  return content.split(/\r\n|\n/).length
})

const highlightedHtml = computed(() => {
  const file = props.previewFile
  if (!file?.content) return ''

  const maxChars = 400_000
  const content = file.content.length > maxChars ? file.content.slice(0, maxChars) : file.content

  const lang = guessLangByName(file.name || '')
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(content, { language: lang }).value
    }
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  } catch {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
})
</script>
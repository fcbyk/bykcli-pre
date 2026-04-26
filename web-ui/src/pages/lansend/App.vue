<template>
  <div class="main-container flex flex-col md:flex-row gap-0 w-full max-w-full m-0 h-dvh max-h-dvh items-stretch relative min-h-0 overflow-hidden">
    <div class="hidden md:flex flex-none min-w-[200px] max-w-[calc(100%-320px)] min-h-0 bg-white px-5 py-[15px] rounded-l-lg shadow-md flex-col h-full overflow-visible" :style="{ width: fileContainerWidth + 'px' }">
      <FileList
        :share-name="shareName"
        :path-parts="pathParts"
        :items="items"
        :loading="loading"
        :error="error"
        :un-download="unDownload"
        :can-upload="canUpload"
        :is-drag-over="isDragOver"
        :is-uploading="isUploading"
        :show-progress="showProgress"
        :queue-length="queueLength"
        :overall-progress="overallProgress"
        :upload-status="uploadStatus"
        :upload-stats-text="uploadStatsText"
        :upload-path-hint="uploadPathHint"
        :complete-info="completeInfo"
        :show-complete-info-flag="showCompleteInfoFlag"
        :require-password="requirePassword"
        :password="password"
        :password-error="passwordError"
        :un-upload="unUpload"
        :upload-tasks="uploadTasks"
        :upload-speed="uploadSpeedBytesPerSec"
        :selection-mode="selectionMode"
        :selected-paths="selectedPaths"
        @navigate="navigateToPath"
        @item-click="handleItemClick"
        @toggle-select-mode="toggleSelectMode"
        @toggle-item-select="toggleItemSelect"
        @download-selected="handleDownloadSelected"
        @download-selected-files="handleDownloadSelectedFiles"
        @clear-selection="clearSelection"
        @dragover="handleDragOver"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @files-selected="handleFiles"
        @cancel-upload="handleCancelUpload"
        @clear-all-tasks="clearAllTasks"
        @show-details="handleShowDetails"
        @close-complete-info="closeCompleteInfo"
        @update:password="password = $event; passwordError = ''"
        @verify-password="handleVerifyPassword"
      />
    </div>

    <div class="hidden md:block w-1 bg-[#e4e7ed] cursor-col-resize flex-none relative transition-colors duration-200 z-10 hover:bg-[#409eff] before:content-[''] before:absolute before:-left-0.5 before:-right-0.5 before:top-0 before:bottom-0 before:cursor-col-resize" @mousedown="startResize" @touchstart="startResize"></div>

    <div class="flex-auto min-w-0 min-h-0 bg-white rounded-lg md:rounded-l-none md:rounded-r-lg shadow-md flex flex-col h-full overflow-hidden relative" :style="!isMobileLayout ? { width: tabsContainerWidth + 'px' } : {}">
      <div class="flex border-b border-[#e4e7ed] bg-white shrink-0 items-stretch overflow-x-auto overflow-y-hidden z-10">
        <div
          class="px-5 py-3 cursor-pointer text-[#606266] text-sm border-b-2 transition-all duration-300 select-none relative flex-none hover:text-[#409eff] block md:hidden"
          :class="activeTab === 'directory' ? 'text-[#409eff] border-b-[#409eff] font-medium' : 'border-transparent'"
          @click="activeTab = 'directory'"
        >
          文件夹
        </div>
        <div
          v-if="chatEnabled"
          class="px-5 py-3 cursor-pointer text-[#606266] text-sm border-b-2 transition-all duration-300 select-none relative flex-none hover:text-[#409eff]"
          :class="activeTab === 'chat' ? 'text-[#409eff] border-b-[#409eff] font-medium' : 'border-transparent'"
          @click="activeTab = 'chat'"
        >
          聊天
        </div>

        <div
          class="px-5 py-3 cursor-pointer text-[#606266] text-sm border-b-2 transition-all duration-300 select-none relative flex-none hover:text-[#409eff] inline-flex items-center gap-2 max-w-[220px]"
          v-show="showUploadDetailsTab"
          :class="activeTab === 'upload-details' ? 'text-[#409eff] border-b-[#409eff] font-medium' : 'border-transparent'"
          @click="openUploadDetails"
        >
          <span class="overflow-hidden text-ellipsis whitespace-nowrap">上传详细</span>
          <button class="border-none bg-transparent text-[#909399] cursor-pointer p-0 w-[18px] h-[18px] leading-[18px] rounded flex items-center justify-center hover:bg-[#f0f0f0] hover:text-[#333]" @click.stop="closeUploadDetails" aria-label="关闭">×</button>
        </div>

        <div
          class="px-5 py-3 cursor-pointer text-[#606266] text-sm border-b-2 transition-all duration-300 select-none relative flex-none hover:text-[#409eff] inline-flex items-center gap-2 max-w-[220px]"
          v-show="previewFile"
          :class="activeTab === 'preview' ? 'text-[#409eff] border-b-[#409eff] font-medium' : 'border-transparent'"
          @click="activeTab = 'preview'"
          :title="previewFile?.name"
        >
          <span class="overflow-hidden text-ellipsis whitespace-nowrap max-w-[170px]">{{ previewFile?.name }}</span>
          <button class="border-none bg-transparent text-[#909399] cursor-pointer p-0 w-[18px] h-[18px] leading-[18px] rounded flex items-center justify-center hover:bg-[#f0f0f0] hover:text-[#333]" @click.stop="closePreview" aria-label="关闭">×</button>
        </div>

        <div class="ml-auto flex items-center gap-1 text-[#666] text-[13px] cursor-pointer px-5 py-3 md:px-3 border-l border-[#eee] hover:text-[#007bff] hover:bg-[#f8f9fa]" @click="startSpeedTest" title="局域网测速">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="select-none hidden md:inline">测速</span>
        </div>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col">
        <div v-if="activeTab === 'empty' && !previewFile" class="flex-1 flex items-center justify-center p-[15px] md:p-5">
          <div class="text-center text-[#9ca3af] text-sm leading-relaxed px-4 py-3 border border-dashed border-[#e5e7eb] rounded-[10px] bg-[#fafafa]">点击左侧文件进行预览</div>
        </div>
        <div v-show="activeTab === 'directory'" class="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          <FileList
            :share-name="shareName"
            :path-parts="pathParts"
            :items="items"
            :loading="loading"
            :error="error"
            :un-download="unDownload"
            :can-upload="canUpload"
            :is-drag-over="isDragOver"
            :is-uploading="isUploading"
            :show-progress="showProgress"
            :queue-length="queueLength"
            :overall-progress="overallProgress"
            :upload-status="uploadStatus"
            :upload-stats-text="uploadStatsText"
            :upload-path-hint="uploadPathHint"
            :complete-info="completeInfo"
            :show-complete-info-flag="showCompleteInfoFlag"
            :require-password="requirePassword"
            :password="password"
            :password-error="passwordError"
            :un-upload="unUpload"
            :upload-tasks="uploadTasks"
            :upload-speed="uploadSpeedBytesPerSec"
            :selection-mode="selectionMode"
            :selected-paths="selectedPaths"
            @navigate="navigateToPath"
            @item-click="handleItemClick"
            @toggle-select-mode="toggleSelectMode"
            @toggle-item-select="toggleItemSelect"
            @download-selected="handleDownloadSelected"
            @download-selected-files="handleDownloadSelectedFiles"
            @clear-selection="clearSelection"
            @dragover="handleDragOver"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
            @files-selected="handleFiles"
            @cancel-upload="handleCancelUpload"
            @clear-all-tasks="clearAllTasks"
            @show-details="handleShowDetails"
            @close-complete-info="closeCompleteInfo"
            @update:password="password = $event; passwordError = ''"
            @verify-password="handleVerifyPassword"
          />
        </div>

        <div v-if="chatEnabled" v-show="activeTab === 'chat'" class="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 overscroll-contain touch-manipulation">
          <ChatTab />
        </div>

        <div v-show="activeTab === 'upload-details'" class="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 bg-white">
          <UploadDetailsTab
            :upload-tasks="uploadTasks"
            @cancel-upload="handleCancelUpload"
            @clear-group="handleClearGroupTasks"
          />
        </div>
      </div>

      <div v-show="activeTab === 'preview' && previewFile" class="absolute inset-0 z-5 bg-white flex flex-col pt-[45px]">
        <PreviewTab
          :preview-file="previewFile"
          :preview-loading="previewLoading"
          :preview-error="previewError"
          :video-loading="previewVideoLoading"
          :can-go-prev="canGoPrev"
          :can-go-next="canGoNext"
          :current-image-index="currentImageIndex"
          :total-images="imageFiles.length"
          @videoLoaded="onPreviewVideoLoaded"
          @videoError="onPreviewVideoError"
          @close="closePreview"
          @prevImage="prevImage"
          @nextImage="nextImage"
        />
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-if="isSpeedTestVisible" class="select-none absolute top-[55px] md:top-[60px] right-2.5 md:right-5 w-[calc(100%-20px)] md:w-[280px] max-w-[300px] md:max-w-none bg-white rounded-xl shadow-2xl border border-[#eee] z-100 flex flex-col overflow-hidden">
        <div class="px-4 py-3 border-b border-[#eee] flex justify-between items-center bg-[#f8f9fa]">
          <h3 class="m-0 text-[15px] font-semibold text-[#333]">局域网测速</h3>
          <button class="border-none bg-none text-xl text-[#999] cursor-pointer leading-none p-1 hover:text-[#666]" @click="closeSpeedTest">×</button>
        </div>
        <div class="p-4 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <span class="text-[13px] text-[#666]">延迟 (Ping):</span>
            <span class="text-sm font-semibold text-[#333] font-mono">{{ speedResult.ping }} ms</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center">
              <span class="text-[13px]" :class="speedResult.status === 'downloading' ? 'text-[#007bff] font-semibold' : 'text-[#666]'">下载速度:</span>
              <span class="text-sm font-semibold text-[#333] font-mono">{{ formatSpeed(speedResult.download) }}</span>
            </div>
            <div v-if="speedResult.status === 'downloading'" class="h-1 bg-[#eee] rounded-sm overflow-hidden">
              <div class="h-full bg-[#007bff] transition-[width] duration-200 ease-out" :style="{ width: currentProgress + '%' }"></div>
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center">
              <span class="text-[13px]" :class="speedResult.status === 'uploading' ? 'text-[#007bff] font-semibold' : 'text-[#666]'">上传速度:</span>
              <span class="text-sm font-semibold text-[#333] font-mono">{{ formatSpeed(speedResult.upload) }}</span>
            </div>
            <div v-if="speedResult.status === 'uploading'" class="h-1 bg-[#eee] rounded-sm overflow-hidden">
              <div class="h-full bg-[#007bff] transition-[width] duration-200 ease-out" :style="{ width: currentProgress + '%' }"></div>
            </div>
          </div>
          <div v-if="speedResult.status === 'error'" class="text-[12px] text-[#dc3545] p-2 bg-[#fff5f5] rounded">
            {{ speedResult.error }}
          </div>

          <div v-if="speedResult.status === 'completed'" class="mt-2 p-3 bg-[#f0f7ff] rounded-lg border border-[#d0e7ff]">
            <div class="text-[12px] text-[#666] mb-2">传输 1GB 文件预计耗时：</div>
            <div class="flex gap-3">
              <div class="flex-1 flex flex-col gap-0.5">
                <span class="text-[11px] text-[#999]">下载</span>
                <span class="text-sm font-semibold text-[#0056b3]">{{ formatDuration(1024 * 1024 * 1024 / speedResult.download) }}</span>
              </div>
              <div class="flex-1 flex flex-col gap-0.5">
                <span class="text-[11px] text-[#999]">上传</span>
                <span class="text-sm font-semibold text-[#0056b3]">{{ formatDuration(1024 * 1024 * 1024 / speedResult.upload) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="p-3 border-t border-[#eee]">
          <button 
            class="w-full p-2 bg-[#007bff] text-white border-none rounded-md text-sm cursor-pointer transition-colors duration-200 hover:bg-[#0056b3] disabled:bg-[#ccc] disabled:cursor-not-allowed" 
            :disabled="speedResult.status !== 'completed' && speedResult.status !== 'error' && speedResult.status !== 'idle'"
            @click="startSpeedTest"
          >
            {{ speedResult.status === 'completed' || speedResult.status === 'error' ? '重新测速' : '正在测速...' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import FileList from './components/FileList.vue'
import ChatTab from './components/ChatTab.vue'
import PreviewTab from './components/PreviewTab.vue'
import UploadDetailsTab from './components/UploadDetailsTab.vue'
import { useLansendDirectory } from './composables/useLansendDirectory'
import { useLansendUpload } from './composables/useLansendUpload'
import { useLansendPreview } from './composables/useLansendPreview'
import { useLansendSpeed } from './composables/useLansendSpeed'
import { getLansendConfig, downloadZip } from './api'
import type { DirectoryItem } from './types'
const {
  shareName,
  pathParts,
  items,
  loading,
  error,
  requirePassword,
  currentPath,
  loadDirectory,
  restorePathFromSession,
  startPolling,
  stopPolling
} = useLansendDirectory()

const unDownload = ref(false)
const unUpload = ref(false)
const chatEnabled = ref(false)
onMounted(async () => {
  try {
    const config = await getLansendConfig()
    unDownload.value = config.un_download === true
    unUpload.value = config.un_upload === true
    chatEnabled.value = config.chat_enabled === true
    
    if (unUpload.value) {
      // 移动端：如果不允许上传且当前没有预览，回到目录页
      if (isMobileLayout.value && !previewFile.value) {
        activeTab.value = 'directory'
      }
    }
  } catch (e) {
    console.error('Failed to fetch config:', e)
  }
})

const dragCounter = ref(0)
const showUploadDetailsTab = ref(false)
const {
  isDragOver,
  isUploading,
  password,
  passwordError,
  isPasswordVerified,
  canUpload: canUploadVerified,
  showProgress,
  queueLength,
  overallProgress,
  uploadStatus,
  uploadStatsText,
  uploadSpeedBytesPerSec,
  completeInfo,
  showCompleteInfoFlag,
  verifyPassword,
  restorePasswordFromSession,
  enqueueFiles,
  processUploadQueue,
  uploadTasks,
  cancelTask,
  clearTasksByPath,
  clearAllTasks,
  closeCompleteInfo
} = useLansendUpload()

function handleCancelUpload(taskId: string) {
  cancelTask(taskId)
}

function handleClearGroupTasks(path: string) {
  clearTasksByPath(path)
}

function handleShowDetails() {
  showUploadDetailsTab.value = true
  activeTab.value = 'upload-details'
}

function closeUploadDetails() {
  showUploadDetailsTab.value = false
  if (activeTab.value === 'upload-details') {
    const mobile = window.matchMedia('(max-width: 768px)').matches
    activeTab.value = mobile ? 'directory' : 'empty'
  }
}

function openUploadDetails() {
  showUploadDetailsTab.value = true
  activeTab.value = 'upload-details'
}

const {
  previewFile,
  previewLoading,
  previewError,
  activeTab,
  previewVideoLoading,
  previewFileContent,
  closePreview: originalClosePreview,
  onPreviewVideoLoaded,
  onPreviewVideoError,
  prevImage,
  nextImage,
  canGoPrev,
  canGoNext,
  currentImageIndex,
  imageFiles
} = useLansendPreview()

const {
  isSpeedTestVisible,
  speedResult,
  currentProgress,
  startSpeedTest,
  closeSpeedTest,
  formatSpeed,
  formatDuration
} = useLansendSpeed()

const canUpload = computed(() => {
  return !requirePassword.value || canUploadVerified.value
})

const selectionMode = ref(false)
const selectedPaths = ref<string[]>([])

function toggleSelectMode() {
  if (unDownload.value) return
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedPaths.value = []
  }
}

function clearSelection() {
  selectionMode.value = false
  selectedPaths.value = []
}

function toggleItemSelect(item: DirectoryItem) {
  if (!selectionMode.value) return
  const path = item.path
  if (!path) return
  if (selectedPaths.value.includes(path)) {
    selectedPaths.value = selectedPaths.value.filter(p => p !== path)
  } else {
    selectedPaths.value = [...selectedPaths.value, path]
  }
}

async function handleDownloadSelected() {
  if (selectedPaths.value.length === 0) return
  try {
    const { blob, filename } = await downloadZip(selectedPaths.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    clearSelection()
  } catch (e) {
    console.error('download zip failed', e)
  }
}

function handleDownloadSelectedFiles() {
  const filePaths = items.value
    .filter(item => !item.is_dir && selectedPaths.value.includes(item.path))
    .map(item => item.path)
  if (filePaths.length === 0) return
  filePaths.forEach(path => {
    const link = document.createElement('a')
    link.href = `/api/download/${path}`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    link.remove()
  })
}

const currentUploadPath = computed(() => {
  if (!shareName.value) return ''
  const parts = pathParts.value.map(p => p.name).join('/')
  if (parts) {
    return `/${shareName.value}/${parts}`
  }
  return `/${shareName.value}`
})

const uploadPathHint = computed(() => {
  const path = currentUploadPath.value
  if (!path) return ''
  return `文件将上传到：${path}`
})

type FileWithSubdir = {
  file: File
  subdir: string
}

function joinPathSegment(basePath: string, name: string): string {
  if (!basePath) return name
  if (!name) return basePath
  return `${basePath}/${name}`
}

function joinUploadPath(base: string, subdir: string): string {
  const b = (base || '').trim()
  const s = (subdir || '').trim()
  if (!b && !s) return ''
  if (!b) return s
  if (!s) return b
  return `${b}/${s}`.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function readEntriesAsync(reader: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    reader.readEntries(
      (entries: any[]) => resolve(entries),
      (error: any) => reject(error)
    )
  })
}

async function walkEntry(entry: any, basePath: string, includeSelf: boolean): Promise<FileWithSubdir[]> {
  if (entry.isFile) {
    return new Promise((resolve, reject) => {
      entry.file(
        (file: File) => {
          resolve([{ file, subdir: basePath }])
        },
        (error: any) => reject(error)
      )
    })
  }
  if (entry.isDirectory) {
    const dirPath = includeSelf ? joinPathSegment(basePath, entry.name) : basePath
    const reader = entry.createReader()
    const result: FileWithSubdir[] = []
    while (true) {
      const entries = await readEntriesAsync(reader)
      if (!entries.length) break
      for (const child of entries) {
        const childFiles = await walkEntry(child, dirPath, true)
        result.push(...childFiles)
      }
    }
    return result
  }
  return []
}

async function extractFilesFromDataTransfer(event: DragEvent): Promise<FileWithSubdir[]> {
  const dt = event.dataTransfer
  if (!dt) return []
  const items = dt.items
  const result: FileWithSubdir[] = []
  let usedEntries = false
  if (items && items.length > 0) {
    const entriesToProcess = []
    const filesToProcess = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind !== 'file') continue
      const anyItem = item as any
      const entry = anyItem.webkitGetAsEntry ? anyItem.webkitGetAsEntry() : null
      if (entry) {
        usedEntries = true
        entriesToProcess.push(entry)
      } else {
        const file = item.getAsFile && item.getAsFile()
        if (file) {
          filesToProcess.push({ file, subdir: '' })
        }
      }
    }
    
    if (usedEntries) {
      for (const entry of entriesToProcess) {
        const files = await walkEntry(entry, '', entry.isDirectory)
        result.push(...files)
      }
      return result
    } else {
      result.push(...filesToProcess)
    }
  }
  
  if (usedEntries) {
    return result
  }
  const files: FileWithSubdir[] = []
  for (let i = 0; i < dt.files.length; i++) {
    const file = dt.files[i]
    files.push({ file, subdir: '' })
  }
  return files
}

function groupFilesByTargetPath(files: FileWithSubdir[]): Record<string, File[]> {
  const groups: Record<string, File[]> = {}
  files.forEach(item => {
    const targetPath = joinUploadPath(currentPath.value, item.subdir)
    const key = targetPath || ''
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item.file)
  })
  return groups
}

function startUploadForGroups(groups: Record<string, File[]>) {
  const entries = Object.entries(groups).filter(([, files]) => files.length > 0)
  if (entries.length === 0) return
  stopPolling()
  entries.forEach(([targetPath, files]) => {
    enqueueFiles(files, targetPath)
  })
  processUploadQueue({
    requirePassword: requirePassword.value,
    getPassword: () => password.value,
    onWrongPassword: () => {
      passwordError.value = '密码错误，请重试'
    },
    onRefresh: async () => {
      await loadDirectoryWithAuth(currentPath.value, true)
      startPolling()
    }
  })
}

function closePreview() {
  originalClosePreview({ unUpload: unUpload.value })
}

const fileContainerWidth = ref(400)
const tabsContainerWidth = ref(0)
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartFileWidth = ref(0)

const isMobileLayout = ref(false)

function syncLayoutByWidth() {
  const mobile = window.matchMedia('(max-width: 768px)').matches
  // 从移动端切到桌面端时，不应继续停留在 directory tab，否则会出现左右两边都是"文件目录"
  if (isMobileLayout.value && !mobile) {
    // 从移动端切到桌面端：左侧已经是"文件目录"，右侧就不要再停留在 directory。
    if (activeTab.value === 'directory') {
      activeTab.value = previewFile.value ? 'preview' : 'empty'
    }
  }
  isMobileLayout.value = mobile
}

function initContainerWidths() {
  const container = document.querySelector('.main-container') as HTMLElement
  if (container) {
    const totalWidth = container.offsetWidth
    const savedFileWidth = sessionStorage.getItem('lansendFileContainerWidth')
    if (savedFileWidth && !isResizing.value) {
      const savedWidth = parseInt(savedFileWidth, 10)
      // 确保保存的宽度在合理范围内
      const minFileWidth = 200
      const maxFileWidth = totalWidth - 304 // 300 (tabs min) + 4 (resizer)
      const fileWidth = Math.max(minFileWidth, Math.min(maxFileWidth, savedWidth))
      fileContainerWidth.value = fileWidth
      tabsContainerWidth.value = totalWidth - fileWidth - 4 // 减去分隔条宽度
    } else if (!savedFileWidth) {
      fileContainerWidth.value = Math.floor(totalWidth * 0.4)
      tabsContainerWidth.value = totalWidth - fileContainerWidth.value - 4
    }
  }
}

function startResize(e: MouseEvent | TouchEvent) {
  isResizing.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  resizeStartX.value = clientX
  resizeStartFileWidth.value = fileContainerWidth.value
  e.preventDefault()

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', handleResize)
  document.addEventListener('touchend', stopResize)
}

function handleResize(e: MouseEvent | TouchEvent) {
  if (!isResizing.value) return

  const container = document.querySelector('.main-container') as HTMLElement
  if (!container) return

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const deltaX = clientX - resizeStartX.value
  const containerRect = container.getBoundingClientRect()
  const newFileWidth = Math.max(200, Math.min(containerRect.width - 304, resizeStartFileWidth.value + deltaX))
  const newTabsWidth = containerRect.width - newFileWidth - 4 // 减去分隔条宽度

  fileContainerWidth.value = newFileWidth
  tabsContainerWidth.value = newTabsWidth

  // 保存到 sessionStorage
  sessionStorage.setItem('lansendFileContainerWidth', newFileWidth.toString())

  e.preventDefault()
}

// 停止拖拽调整
function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', handleResize)
  document.removeEventListener('touchend', stopResize)
}

// 加载目录数据：由 useLansendDirectory 承担（这里保留一个薄封装，统一处理密码初始化）
async function loadDirectoryWithAuth(path: string = '', silent: boolean = false) {
  const data = await loadDirectory(path, silent)

  // 初始化密码验证
  if (requirePassword.value) {
    const storedPassword = restorePasswordFromSession()
    if (storedPassword) {
      await verifyPassword(storedPassword, true)
    }
  } else {
    // 不需要密码时视为已验证
    isPasswordVerified.value = true
  }

  return data
}

function navigateToPath(path: string) {
  loadDirectoryWithAuth(path)
}

async function handleItemClick(item: DirectoryItem) {
  if (item.is_dir) {
    navigateToPath(item.path)
  } else {
    await previewFileContent(item.path, item.name, items.value)
  }
}

function handleVerifyPassword() {
  verifyPassword(password.value, false)
}

function preventGlobalDefault(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'none'
  }
}

function handleDragOver(e?: DragEvent) {
  if (!canUpload.value) return
  if (e) {
    e.preventDefault()
  }
}

function handleDragEnter(_e?: DragEvent) {
  if (!canUpload.value) return
  dragCounter.value++
  isDragOver.value = true
}

function handleDragLeave(_e?: DragEvent) {
  if (!canUpload.value) return
  dragCounter.value--
  if (dragCounter.value <= 0) {
    dragCounter.value = 0
    isDragOver.value = false
  }
}

async function handleDrop(e?: DragEvent) {
  if (!canUpload.value) return
  dragCounter.value = 0
  isDragOver.value = false
  if (e) {
    e.preventDefault()
  }
  if (e?.dataTransfer) {
    const extracted = await extractFilesFromDataTransfer(e)
    if (extracted.length === 0) return
    const groups = groupFilesByTargetPath(extracted)
    startUploadForGroups(groups)
  }
}

function handleFiles(files: File[]) {
  if (files.length === 0) return

  const groups: Record<string, File[]> = {}
  const path = currentPath.value || ''
  groups[path] = files.slice()
  startUploadForGroups(groups)
}

onMounted(() => {
  initContainerWidths()
  syncLayoutByWidth()

  window.addEventListener('resize', initContainerWidths)
  window.addEventListener('resize', syncLayoutByWidth)

  window.addEventListener('dragover', preventGlobalDefault)
  window.addEventListener('drop', preventGlobalDefault)

  const mobile = window.matchMedia('(max-width: 768px)').matches
  if (mobile && !previewFile.value) {
    activeTab.value = 'directory'
  }

  const initialPath = restorePathFromSession()
  loadDirectoryWithAuth(initialPath).then(() => {
    startPolling()
  })
})

watch(
  () => currentPath.value,
  () => {
    clearSelection()
  }
)

watch(
  () => unDownload.value,
  (v) => {
    if (v) clearSelection()
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', initContainerWidths)
  window.removeEventListener('resize', syncLayoutByWidth)
  window.removeEventListener('dragover', preventGlobalDefault)
  window.removeEventListener('drop', preventGlobalDefault)
  stopPolling()
})
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>

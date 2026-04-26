<template>
  <div v-if="globalUploadStats" class="flex flex-col gap-1.5">
    <div
      class="relative border rounded-md overflow-hidden transition-all duration-300"
      :class="globalUploadStats.remainingSize === 0 ? 'bg-[#f0f9eb] border-[#67c23a]/50' : 'bg-white border-[#b3e19d]'"
    >
      <div
        v-if="globalUploadStats.remainingSize > 0"
        class="absolute inset-0 bg-[#f0f9eb] transition-[width] duration-500 ease-linear pointer-events-none"
        :style="{ width: `${globalUploadStats.totalProgress}%` }"
      ></div>

      <div class="relative px-2 py-2 flex items-center justify-between transition-colors">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <div
            class="p-1 rounded-md text-white flex-none border border-black/5"
            :class="globalUploadStats.remainingSize === 0 ? 'bg-[#67c23a]' : 'bg-[#2ecc71]'"
          >
            <Check v-if="globalUploadStats.remainingSize === 0" class="w-3.5 h-3.5 stroke-3" />
            <Layers v-else class="w-3.5 h-3.5" />
          </div>
          <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <span class="text-sm font-bold text-[#2c3e50] truncate" :title="globalUploadStats.statusText">
              {{ globalUploadStats.statusText }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-none ml-2">
          <div class="flex flex-col items-end leading-none gap-0.5">
            <span v-if="globalUploadStats.remainingSize > 0" class="text-[12px] font-bold text-[#2ecc71]">
              {{ Math.round(globalUploadStats.totalProgress) }}%
            </span>
            <div
              v-if="globalUploadStats.remainingSize > 0"
              class="flex items-center gap-1.5 text-[10px] text-[#909399] font-normal"
            >
              <span v-if="globalUploadStats.remainingTimeText" class="whitespace-nowrap">
                {{ globalUploadStats.remainingTimeText }}
              </span>
              <span class="whitespace-nowrap">
                / 剩 {{ formatFileSize(globalUploadStats.remainingSize) }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-none ml-1 relative z-10">
            <button
              v-if="globalUploadStats.remainingSize === 0"
              type="button"
              @click="onClearAll($event)"
              @touchend="onClearAll($event)"
              class="px-2 py-1 flex items-center justify-center rounded-md touch-manipulation text-[12px] text-[#ef4444] hover:bg-[#fee2e2] active:bg-[#fee2e2] transition-colors border border-[#fecaca] bg-[#fee2e2]/60 cursor-pointer"
              title="移除所有已完成记录"
            >
              关闭
            </button>
            <button
              type="button"
              class="px-2 py-1 flex items-center justify-center rounded-md touch-manipulation text-[12px] text-[#409eff] hover:bg-[#ecf5ff] active:bg-[#ecf5ff] transition-colors border border-[#d9ecff] bg-[#ecf5ff]/50 cursor-pointer ml-1"
              @click.stop="showDetails"
            >
              详细
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UploadTask } from '../composables/useLansendUpload'
import { Layers, Check } from 'lucide-vue-next'
import { formatFileSize } from '@/utils/files'

const props = defineProps<{
  uploadTasks?: UploadTask[]
  uploadSpeed?: number
}>()

const emit = defineEmits<{
  (e: 'cancel-upload', taskId: string): void
  (e: 'clear-all-tasks'): void
  (e: 'show-details'): void
}>()

const globalUploadStats = computed(() => {
  const tasks = props.uploadTasks || []
  if (tasks.length === 0) return null

  const totalSize = tasks.reduce((sum, t) => sum + t.total, 0)
  const loadedSize = tasks.reduce((sum, t) => sum + t.loaded, 0)
  const totalProgress = totalSize > 0 ? (loadedSize / totalSize) * 100 : 0

  const activeTasks = tasks.filter(t => t.status === 'uploading' || t.status === 'pending')

  const totalDirSet = new Set<string>()
  tasks.forEach(t => {
    const p = t.targetPath || '/'
    if (p !== '/') {
      totalDirSet.add(p)
    }
  })
  const totalDirCount = totalDirSet.size
  const totalFileCount = tasks.length

  const activeDirSet = new Set<string>()
  activeTasks.forEach(t => {
    const p = t.targetPath || '/'
    if (p !== '/') {
      activeDirSet.add(p)
    }
  })
  const activeDirCount = activeDirSet.size
  const activeFileCount = activeTasks.length

  let statusText = ''
  if (activeTasks.length > 0) {
    statusText = `剩余 ${activeDirCount > 0 ? activeDirCount + ' 个目录，' : ''}${activeFileCount} 个文件`
  } else {
    statusText = `${totalDirCount > 0 ? totalDirCount + ' 个目录，' : ''}${totalFileCount} 个文件已上传完成`
  }

  const remainingSize = tasks
    .filter(t => t.status !== 'completed')
    .reduce((sum, t) => sum + (t.total - t.loaded), 0)

  let remainingTimeText = ''
  const speed = props.uploadSpeed
  if (remainingSize > 0 && speed && speed > 0) {
    const seconds = remainingSize / speed
    if (seconds > 3600) {
      remainingTimeText = `预计还需 ${(seconds / 3600).toFixed(1)} 小时`
    } else if (seconds > 60) {
      remainingTimeText = `预计还需 ${Math.ceil(seconds / 60)} 分钟`
    } else {
      remainingTimeText = `预计还需 ${Math.ceil(seconds)} 秒`
    }
  }

  return {
    totalProgress,
    remainingSize,
    remainingTimeText,
    statusText
  }
})

function showDetails() {
  emit('show-details')
}

function onClearAll(ev: Event) {
  ev.stopPropagation()
  ev.preventDefault()
  emit('clear-all-tasks')
}
</script>

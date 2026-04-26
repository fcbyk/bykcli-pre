<template>
  <div class="flex flex-col h-full bg-white">
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="groupedUploads.length === 0" class="text-center text-[#999] py-8">
        暂无上传任务
      </div>
      <div v-else class="flex flex-col gap-4">
        <div v-for="group in sortedGroups" :key="group.path" class="border border-[#e5e7eb] rounded-xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <button
            type="button"
            class="w-full px-4 py-3 bg-[#f8fafc] border-b border-[#e5e7eb] flex items-center justify-between gap-3 text-left transition-colors hover:bg-[#f1f5f9]"
            @click="toggleGroup(group.path || '/')"
            :aria-expanded="isGroupExpanded(group.path || '/')"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="flex-none text-[#64748b]">
                <ChevronDown v-if="isGroupExpanded(group.path || '/')" class="w-4 h-4" />
                <ChevronRight v-else class="w-4 h-4" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-[13px] text-[#1f2937] truncate" :title="group.path || '/'">
                  {{ group.path || '/' }}
                </div>
                <div class="text-[12px] text-[#94a3b8] mt-0.5 truncate">
                  {{ group.statusText }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-none">
              <span class="text-[12px] text-[#64748b] font-medium">
                {{ group.tasks.filter(t => t.status === 'completed').length }} / {{ group.tasks.length }}
              </span>
              <span class="text-[12px] text-[#1f2937] font-semibold">
                {{ Math.round(group.totalProgress) }}%
              </span>
              <button
                type="button"
                class="p-1 text-[#94a3b8] hover:text-[#ef4444] active:text-[#ef4444] active:bg-[#fee2e2] rounded-md transition-all touch-manipulation cursor-pointer border-none bg-transparent"
                @click.stop="emitClearGroup(group.path || '/')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </button>
          <div class="h-1 bg-[#eef2ff]">
            <div
              class="h-full transition-[width] duration-300"
              :class="isGroupActive(group) ? 'bg-linear-to-r from-[#3b82f6] to-[#22c55e]' : 'bg-linear-to-r from-[#22c55e] to-[#16a34a]'"
              :style="{ width: `${Math.round(group.totalProgress)}%` }"
            ></div>
          </div>
          <div
            class="grid transition-all duration-300"
            :class="isGroupExpanded(group.path || '/') ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
          >
            <div class="min-h-0 overflow-hidden bg-white">
              <div
                v-for="task in group.tasks"
                :key="task.id"
                class="px-4 py-3 border-b border-[#f1f5f9] last:border-0 flex flex-col gap-2 hover:bg-[#f8fafc] transition-colors"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <FileText class="w-4 h-4 text-[#94a3b8] flex-none" />
                    <span
                      class="text-[13px] text-[#334155] truncate flex-1"
                      :title="task.file.name"
                    >
                      {{ task.file.name }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 flex-none">
                    <span v-if="task.status === 'completed' && task.completedAt" class="text-[11px] text-[#94a3b8] whitespace-nowrap">
                      {{ formatCompletedAt(task.completedAt) }}
                    </span>
                    <span
                      class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      :class="{
                        'bg-[#fee2e2] text-[#b91c1c]': task.status === 'error',
                        'bg-[#dcfce7] text-[#15803d]': task.status === 'completed',
                        'bg-[#dbeafe] text-[#1d4ed8]': task.status === 'uploading',
                        'bg-[#e2e8f0] text-[#64748b]': task.status === 'pending'
                      }"
                    >
                      <template v-if="task.status === 'uploading'">
                        {{ Math.round(task.progress) }}%
                      </template>
                      <template v-else-if="task.status === 'pending'">
                        等待
                      </template>
                      <template v-else-if="task.status === 'error'">
                        失败
                      </template>
                      <template v-else-if="task.status === 'completed'">
                        已完成
                      </template>
                    </span>
                    <button
                      v-if="task.status !== 'completed'"
                      @click.stop="emitCancelUpload(task.id)"
                      class="p-1 text-[#94a3b8] hover:text-[#ef4444] active:text-[#ef4444] active:bg-[#fee2e2] rounded-md transition-all touch-manipulation cursor-pointer border-none bg-transparent"
                      title="取消上传"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UploadTask } from '../composables/useLansendUpload'
import { ChevronDown, ChevronRight, FileText, X } from 'lucide-vue-next'
import { useUploadTaskGroups } from '../composables/useUploadTaskGroups'

const props = defineProps<{
  uploadTasks: UploadTask[]
}>()

const emit = defineEmits<{
  (e: 'cancel-upload', taskId: string): void
  (e: 'clear-group', path: string): void
}>()

const { groupedUploads } = useUploadTaskGroups(
  () => props.uploadTasks,
  () => 0
)

const expandedPaths = ref<Set<string>>(new Set())
const manualCollapsedPaths = ref<Set<string>>(new Set())
const lastActivePaths = ref<Set<string>>(new Set())

const sortedGroups = computed(() => {
  const groups = groupedUploads.value.slice()
  return groups.sort((a, b) => {
    const aActive = isGroupActive(a)
    const bActive = isGroupActive(b)
    if (aActive !== bActive) return aActive ? -1 : 1
    const aPath = a.path || '/'
    const bPath = b.path || '/'
    return aPath.localeCompare(bPath, 'zh-Hans-CN')
  })
})

watch(
  sortedGroups,
  groups => {
    const nextActivePaths = new Set<string>()
    groups.forEach(group => {
      const path = group.path || '/'
      const active = isGroupActive(group)
      if (active) {
        nextActivePaths.add(path)
        if (!lastActivePaths.value.has(path) && !manualCollapsedPaths.value.has(path)) {
          expandedPaths.value.add(path)
        }
      } else if (lastActivePaths.value.has(path)) {
        expandedPaths.value.delete(path)
        manualCollapsedPaths.value.delete(path)
      }
    })
    lastActivePaths.value = nextActivePaths
    expandedPaths.value = new Set(expandedPaths.value)
    manualCollapsedPaths.value = new Set(manualCollapsedPaths.value)
  },
  { immediate: true }
)

function isGroupActive(group: { tasks: UploadTask[] }) {
  return group.tasks.some(t => t.status === 'uploading')
}

function toggleGroup(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
    if (lastActivePaths.value.has(path)) {
      manualCollapsedPaths.value.add(path)
    }
  } else {
    expandedPaths.value.add(path)
    manualCollapsedPaths.value.delete(path)
  }
  expandedPaths.value = new Set(expandedPaths.value)
  manualCollapsedPaths.value = new Set(manualCollapsedPaths.value)
}

function isGroupExpanded(path: string) {
  return expandedPaths.value.has(path)
}

function emitCancelUpload(taskId: string) {
  emit('cancel-upload', taskId)
}

function emitClearGroup(path: string) {
  emit('clear-group', path)
}

function formatCompletedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}
</script>

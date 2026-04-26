import { computed } from 'vue'
import type { UploadTask } from './useLansendUpload'

export interface UploadTaskGroup {
  path: string
  tasks: UploadTask[]
  totalProgress: number
  remainingSize: number
  remainingTimeText: string
  statusText: string
}

export function useUploadTaskGroups(
  getTasks: () => UploadTask[] | undefined,
  getUploadSpeed: () => number | undefined
) {
  const groupedUploads = computed<UploadTaskGroup[]>(() => {
    const tasks = getTasks() || []
    if (tasks.length === 0) return []

    const groups: Record<string, UploadTaskGroup> = {}

    tasks.forEach(task => {
      const path = task.targetPath || '/'
      if (!groups[path]) {
        groups[path] = {
          path,
          tasks: [],
          totalProgress: 0,
          remainingSize: 0,
          remainingTimeText: '',
          statusText: ''
        }
      }
      groups[path].tasks.push(task)
    })

    Object.values(groups).forEach(group => {
      const total = group.tasks.reduce((sum, t) => sum + t.total, 0)
      const loaded = group.tasks.reduce((sum, t) => sum + t.loaded, 0)
      group.totalProgress = total > 0 ? (loaded / total) * 100 : 0

      const activeTasks = group.tasks.filter(
        t => t.status === 'uploading' || t.status === 'pending'
      )
      if (activeTasks.length > 0) {
        group.statusText = `${activeTasks.length} 个文件上传到 ${
          group.path === '' ? '根目录' : group.path
        }`
      } else {
        group.statusText = `${group.tasks.length} 个文件已上传至 ${
          group.path === '' ? '根目录' : group.path
        }`
      }

      group.remainingSize = group.tasks
        .filter(t => t.status !== 'completed')
        .reduce((sum, t) => sum + (t.total - t.loaded), 0)

      const speed = getUploadSpeed()
      if (group.remainingSize > 0 && speed && speed > 0) {
        const seconds = group.remainingSize / speed
        if (seconds > 3600) {
          group.remainingTimeText = `预计还需 ${(seconds / 3600).toFixed(1)} 小时`
        } else if (seconds > 60) {
          group.remainingTimeText = `预计还需 ${Math.ceil(seconds / 60)} 分钟`
        } else {
          group.remainingTimeText = `预计还需 ${Math.ceil(seconds)} 秒`
        }
      } else {
        group.remainingTimeText = ''
      }
    })

    return Object.values(groups)
  })

  return {
    groupedUploads
  }
}


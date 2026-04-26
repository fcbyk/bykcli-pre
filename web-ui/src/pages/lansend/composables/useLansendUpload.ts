import { computed, ref } from 'vue'
import { verifyUploadPassword, uploadFile } from '../api'
import { formatFileSize } from '@/utils/files'

let completeInfoTimer: ReturnType<typeof setTimeout> | null = null

const PASSWORD_KEY = 'lansendUploadPassword'

export interface UploadTask {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  loaded: number
  total: number
  targetPath: string // 新增：记录上传的目标路径
  completedAt?: number
  error?: string
  cancel?: () => void
}

type UploadQueueParams = {
  requirePassword: boolean
  getPassword: () => string
  onWrongPassword?: () => void
  onRefresh?: () => void
}

export function useLansendUpload() {
  const isDragOver = ref(false)
  const isUploading = ref(false)
  const password = ref('')
  const passwordError = ref('')
  const isPasswordVerified = ref(false)

  const uploadTasks = ref<UploadTask[]>([])
  const renamedFiles = ref<string[]>([])
  const completeInfo = ref('')
  const showCompleteInfoFlag = ref(false)

  const canUpload = computed(() => isPasswordVerified.value)

  const showProgress = computed(() => uploadTasks.value.some(t => t.status === 'uploading' || t.status === 'pending'))

  const queueLength = computed(() => uploadTasks.value.filter(t => t.status === 'pending').length)

  // overallProgress 以“字节”加权
  const totalBytes = computed(() => uploadTasks.value.reduce((sum, t) => sum + t.total, 0))
  const uploadedBytes = computed(() => uploadTasks.value.reduce((sum, t) => sum + t.loaded, 0))

  const overallProgress = computed(() => {
    const total = totalBytes.value
    if (total === 0) return 0
    const p = (uploadedBytes.value / total) * 100
    return Math.min(100, Math.max(0, p))
  })

  const uploadHint = computed(() => {
    return isUploading.value ? '上传中...可继续拖拽文件添加到队列' : '拖拽文件到此处或点击选择文件'
  })

  const uploadSpeedBytesPerSec = ref(0)
  const lastTickAtMs = ref<number | null>(null)
  const lastUploadedTotalBytes = ref(0)

  const remainingBytes = computed(() => Math.max(0, totalBytes.value - uploadedBytes.value))

  const etaSeconds = computed(() => {
    const speed = uploadSpeedBytesPerSec.value
    if (!isUploading.value || speed <= 0) return null
    return Math.ceil(remainingBytes.value / speed)
  })

  function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return ''
    const s = Math.floor(seconds % 60)
    const m = Math.floor((seconds / 60) % 60)
    const h = Math.floor(seconds / 3600)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const uploadStatsText = computed(() => {
    if (!showProgress.value) return ''
    const total = totalBytes.value
    const remain = remainingBytes.value
    const speed = uploadSpeedBytesPerSec.value

    const parts: string[] = []
    if (total > 0) parts.push(`总 ${formatFileSize(total)}`)
    if (remain > 0) parts.push(`剩余 ${formatFileSize(remain)}`)
    if (isUploading.value && speed > 0) parts.push(`速度 ${formatFileSize(speed)}/s`)
    if (isUploading.value && etaSeconds.value != null) parts.push(`预计 ${formatDuration(etaSeconds.value)}`)
    return parts.join(' · ')
  })

  function showCompleteInfo(renamed: number) {
    if (completeInfoTimer) {
      clearTimeout(completeInfoTimer)
      completeInfoTimer = null
    }

    showCompleteInfoFlag.value = true
    if (renamed > 0) {
      completeInfo.value = `${renamed} 个文件因重名已自动重命名`
    } else {
      completeInfo.value = ''
    }

    completeInfoTimer = setTimeout(() => {
      closeCompleteInfo()
    }, 15000)
  }

  function closeCompleteInfo() {
    showCompleteInfoFlag.value = false
    completeInfo.value = ''
    if (completeInfoTimer) {
      clearTimeout(completeInfoTimer)
      completeInfoTimer = null
    }
  }

  const uploadStatus = computed(() => {
    const currentTask = uploadTasks.value.find(t => t.status === 'uploading')
    if (currentTask) {
      const uploadedSize = formatFileSize(currentTask.loaded)
      const totalSize = formatFileSize(currentTask.total)
      return `正在上传: ${currentTask.file.name} (${uploadedSize} / ${totalSize}) - ${Math.round(currentTask.progress)}%`
    }
    return ''
  })

  async function verifyPassword(passwordToVerify: string, isAuto = false) {
    if (!passwordToVerify.trim()) {
      if (!isAuto) passwordError.value = '请输入密码'
      return false
    }

    passwordError.value = ''

    const result = await verifyUploadPassword(passwordToVerify)
    if (result.success) {
      isPasswordVerified.value = true
      password.value = passwordToVerify
      sessionStorage.setItem(PASSWORD_KEY, passwordToVerify)
      return true
    }

    passwordError.value = result.error || '密码错误，请重试'
    sessionStorage.removeItem(PASSWORD_KEY)
    isPasswordVerified.value = false
    return false
  }

  function restorePasswordFromSession() {
    const storedPassword = sessionStorage.getItem(PASSWORD_KEY)
    if (storedPassword) {
      password.value = storedPassword
      return storedPassword
    }
    return null
  }

  function resetUploadState() {
    isUploading.value = false
    isDragOver.value = false
    uploadTasks.value = []
    renamedFiles.value = []
  }

  function enqueueFiles(files: File[], targetPath: string) {
    if (files.length === 0) return
    const newTasks: UploadTask[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11) + Date.now(),
      file,
      status: 'pending',
      progress: 0,
      loaded: 0,
      total: file.size,
      targetPath,
    }))
    uploadTasks.value.push(...newTasks)
  }

  function cancelTask(taskId: string) {
    const task = uploadTasks.value.find(t => t.id === taskId)
    if (task) {
      if (task.status === 'uploading' && task.cancel) {
        task.cancel()
      }
      uploadTasks.value = uploadTasks.value.filter(t => t.id !== taskId)
      if (!uploadTasks.value.some(t => t.status === 'uploading' || t.status === 'pending')) {
        isUploading.value = false
      }
    }
  }

  function clearTasksByPath(path: string) {
    const target = path || '/'
    uploadTasks.value.forEach(task => {
      if ((task.targetPath || '/') === target && task.status === 'uploading' && task.cancel) {
        task.cancel()
      }
    })
    uploadTasks.value = uploadTasks.value.filter(t => (t.targetPath || '/') !== target)
    if (!uploadTasks.value.some(t => t.status === 'uploading' || t.status === 'pending')) {
      isUploading.value = false
    }
  }

  function clearAllTasks() {
    uploadTasks.value = uploadTasks.value.filter(t => t.status === 'uploading' || t.status === 'pending')
    if (!uploadTasks.value.some(t => t.status === 'uploading' || t.status === 'pending')) {
      isUploading.value = false
    }
  }

  let processingPromise: Promise<void> | null = null

  async function processUploadQueue(params: UploadQueueParams) {
    if (processingPromise) return processingPromise

    processingPromise = (async () => {
      showCompleteInfoFlag.value = false
      isUploading.value = true

      lastTickAtMs.value = Date.now()
      lastUploadedTotalBytes.value = uploadedBytes.value
      uploadSpeedBytesPerSec.value = 0

      while (true) {
        const task = uploadTasks.value.find(t => t.status === 'pending')
        if (!task) break

        task.status = 'uploading'

        try {
          const result = await uploadFile(
            task.file,
            task.targetPath,
            params.requirePassword ? params.getPassword() : null,
            (progress, meta) => {
              task.progress = progress
              if (meta) {
                task.loaded = meta.loaded
                task.total = meta.total
              } else {
                task.loaded = (task.file.size * progress) / 100
              }

              const now = Date.now()
              if (lastTickAtMs.value && now - lastTickAtMs.value >= 800) {
                const currentUploaded = uploadedBytes.value
                const deltaBytes = currentUploaded - lastUploadedTotalBytes.value
                const deltaSec = (now - lastTickAtMs.value) / 1000
                if (deltaSec > 0 && deltaBytes >= 0) {
                  const inst = deltaBytes / deltaSec
                  uploadSpeedBytesPerSec.value = uploadSpeedBytesPerSec.value > 0
                    ? uploadSpeedBytesPerSec.value * 0.7 + inst * 0.3
                    : inst
                }
                lastTickAtMs.value = now
                lastUploadedTotalBytes.value = currentUploaded
              }
            },
            (cancelFn) => {
              task.cancel = cancelFn
            }
          )

          if (!result.success) {
            if (result.error === 'wrong password') {
              isPasswordVerified.value = false
              isUploading.value = false
              passwordError.value = '密码错误，请重试'
              sessionStorage.removeItem(PASSWORD_KEY)
              params.onWrongPassword?.()
              return
            }

            if (result.error === 'upload password required') {
              isPasswordVerified.value = false
              isUploading.value = false
              return
            }

            task.status = 'error'
            task.error = result.error || '上传失败'
            continue
          }

          task.status = 'completed'
          task.progress = 100
          task.loaded = task.total
          task.completedAt = Date.now()

          if (result.data?.renamed) {
            renamedFiles.value.push(result.data.filename)
          }

          params.onRefresh?.()
        } catch (e: any) {
          task.status = 'error'
          task.error = e.message || '未知错误'
        }
      }

      const renamed = renamedFiles.value.length

      if (renamed > 0) {
        showCompleteInfo(renamed)
      } else {
        showCompleteInfoFlag.value = false
      }

      isUploading.value = false
      renamedFiles.value = []
      uploadSpeedBytesPerSec.value = 0
    })().finally(() => {
      processingPromise = null
    })

    return processingPromise
  }

  return {
    isDragOver,
    isUploading,
    password,
    passwordError,
    isPasswordVerified,
    uploadTasks,
    uploadStatsText,
    completeInfo,
    showCompleteInfoFlag,
    canUpload,
    showProgress,
    queueLength,
    overallProgress,
    uploadHint,
    uploadStatus,
    uploadSpeedBytesPerSec,
    verifyPassword,
    restorePasswordFromSession,
    resetUploadState,
    enqueueFiles,
    processUploadQueue,
    cancelTask,
    clearTasksByPath,
    clearAllTasks,
    closeCompleteInfo
  }
}

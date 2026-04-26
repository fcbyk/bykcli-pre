import { ref } from 'vue'
import { getDirectory } from '../api'
import type { DirectoryItem, PathPart } from '../types'

const PATH_KEY = 'lansendCurrentPath'

export function useLansendDirectory() {
  const shareName = ref('')
  const pathParts = ref<PathPart[]>([])
  const items = ref<DirectoryItem[]>([])
  const loading = ref(true)
  const error = ref('')
  const requirePassword = ref(false)
  const currentPath = ref('')

  // 轮询相关
  let pollTimer: number | null = null
  let isPolling = false
  let visibilityHandler: (() => void) | null = null
  const POLL_INTERVAL = 5000 // 5秒轮询一次

  async function loadDirectory(path: string = '', silent: boolean = false) {
    if (!silent) {
      loading.value = true
      error.value = ''
    }
    currentPath.value = path

    try {
      const data = await getDirectory(path)
      requirePassword.value = data.require_password
      currentPath.value = data.relative_path
      shareName.value = data.share_name
      pathParts.value = data.path_parts || []
      items.value = data.items || []

      // 保存当前路径到会话存储
      sessionStorage.setItem(PATH_KEY, data.relative_path || '')

      return data
    } catch (err) {
      console.error('加载目录失败:', err)
      if (!silent) {
        error.value = '加载失败，请刷新页面重试'
      }
      return null
    } finally {
      if (!silent) {
        loading.value = false
      }
    }
  }

  function restorePathFromSession() {
    const savedPath = sessionStorage.getItem(PATH_KEY)
    return savedPath !== null ? savedPath : ''
  }

  // 开始轮询
  function startPolling() {
    if (isPolling) return
    isPolling = true

    // 页面可见性检测
    visibilityHandler = () => {
      if (document.hidden) {
        // 页面不可见时暂停轮询
        if (pollTimer !== null) {
          clearTimeout(pollTimer)
          pollTimer = null
        }
      } else {
        // 页面可见时恢复轮询
        if (isPolling && pollTimer === null) {
          const poll = async () => {
            // 只在页面可见时执行轮询
            if (!document.hidden && currentPath.value !== undefined) {
              await loadDirectory(currentPath.value, true) // silent模式，不显示loading，轮询当前目录
            }
            
            if (isPolling && !document.hidden) {
              pollTimer = window.setTimeout(poll, POLL_INTERVAL)
            }
          }
          pollTimer = window.setTimeout(poll, POLL_INTERVAL)
        }
      }
    }

    document.addEventListener('visibilitychange', visibilityHandler)

    const poll = async () => {
      // 只在页面可见时执行轮询
      // 注意：currentPath.value 是响应式的，会自动跟随用户导航到的目录
      if (!document.hidden && currentPath.value !== undefined) {
        await loadDirectory(currentPath.value, true) // silent模式，不显示loading，轮询当前目录
      }
      
      if (isPolling && !document.hidden) {
        pollTimer = window.setTimeout(poll, POLL_INTERVAL)
      }
    }

    // 立即开始第一次轮询
    pollTimer = window.setTimeout(poll, POLL_INTERVAL)
  }

  // 停止轮询
  function stopPolling() {
    isPolling = false
    if (pollTimer !== null) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  return {
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
  }
}


/**
 * 文件抽奖核心逻辑组合式函数
 */

import { ref, computed } from 'vue'
import { fetchFiles, pickFile, getFileResult } from '../api'
import type { FileInfo, FileListApiResponse, HistoryItem, StatusType } from '../types'

const HISTORY_KEY = 'file_pick_history'
const SESSION_KEY = 'file_pick_session'
const PENDING_RESULT_KEY = 'file_pick_pending_result'

export function useFilePick() {
  // 状态
  const files = ref<FileInfo[]>([])
  const history = ref<HistoryItem[]>([])
  const drawSpeed = ref(3)
  const isDrawing = ref(false)
  const statusText = ref('正在加载文件列表...')
  const statusType = ref<StatusType>('')
  const selectedFile = ref<FileInfo | null>(null)
  const downloadUrl = ref<string>('')
  const codeInput = ref('')
  const mode = ref<'code' | 'ip'>('ip')
  const usedCodes = ref(0)
  const totalCodes = ref(0)
  const drawCount = ref(0)
  const sessionId = ref('')

  // 计算属性
  const hasFiles = computed(() => files.value.length > 0)
  const hasHistory = computed(() => history.value.length > 0)
  const counterText = computed(() => {
    if (mode.value === 'code') {
      return `已使用抽奖码：${usedCodes.value} / ${totalCodes.value}`
    }
    return `抽奖次数（按 IP 统计）：${drawCount.value}`
  })
  const limitHint = computed(() => {
    if (mode.value === 'code') {
      return '提示：每个抽奖码只能成功抽取一次，可在命令行生成多个抽奖码发给学生。'
    }
    return '提示：同一 IP 只能抽一次，抽中后可反复下载。'
  })

  // 从 localStorage 加载历史记录
  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      history.value = saved ? JSON.parse(saved) : []
    } catch (e) {
      history.value = []
    }
  }

  // 保存历史记录
  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
    } catch (e) {
      console.warn('Failed to save history:', e)
    }
  }

  // 设置状态
  function setStatus(text: string, type: StatusType = '') {
    statusText.value = text
    statusType.value = type
  }

  // 格式化文件大小
  function formatSize(size: number): string {
    if (size >= 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB'
    if (size >= 1024) return (size / 1024).toFixed(1) + ' KB'
    return size + ' B'
  }

  // 加载文件列表
  async function loadFiles() {
    setStatus('正在加载文件列表...')
    try {
      const data: FileListApiResponse = await fetchFiles()
      files.value = Array.isArray(data.files) ? data.files : []
      mode.value = data.mode || 'ip'
      usedCodes.value = data.used_codes || 0
      totalCodes.value = data.total_codes || 0
      drawCount.value = data.draw_count || 0
      sessionId.value = data.session_id || ''

      // 检查会话是否变化
      const lastSession = localStorage.getItem(SESSION_KEY)
      if (lastSession && lastSession !== sessionId.value) {
        // 服务器已重启，清空历史
        history.value = []
        localStorage.removeItem(HISTORY_KEY)
        localStorage.removeItem(PENDING_RESULT_KEY)
      }
      localStorage.setItem(SESSION_KEY, sessionId.value)

      if (!files.value.length) {
        setStatus('目录中没有可用文件', 'err')
      } else {
        setStatus(`已加载 ${files.value.length} 个文件，请输入兑换码后抽取`)
      }

      // 恢复未完成的抽奖结果
      await restorePendingResult()
    } catch (error) {
      setStatus((error as Error).message || '加载失败，请重试', 'err')
    }
  }

  // 恢复未完成的抽奖结果
  async function restorePendingResult() {
    try {
      const pendingStr = localStorage.getItem(PENDING_RESULT_KEY)
      if (!pendingStr) return

      const pending = JSON.parse(pendingStr)
      const code = pending.code
      if (!code) return

      // 从服务器查询该兑换码的结果
      try {
        const result = await getFileResult(code)
        const targetName = result.file.name
        const targetIndex = files.value.findIndex(f => f.name === targetName)

        if (targetIndex >= 0) {
          selectedFile.value = result.file
          downloadUrl.value = result.download_url

          // 检查历史记录中是否已有该文件
          const existsInHistory = history.value.some(h => h.name === targetName)
          if (!existsInHistory) {
            history.value.push(result.file)
            saveHistory()
          }

          setStatus('已恢复上次抽奖结果')
        }
      } catch (e) {
        console.warn('Failed to restore pending result:', e)
      }

      // 清除待恢复标记
      localStorage.removeItem(PENDING_RESULT_KEY)
    } catch (e) {
      localStorage.removeItem(PENDING_RESULT_KEY)
    }
  }

  // 开始抽奖
  async function startDraw() {
    if (!files.value.length) return

    const code = (codeInput.value || '').trim().toUpperCase()
    if (!code) {
      setStatus('请输入兑换码', 'err')
      return
    }

    isDrawing.value = true
    setStatus('正在使用兑换码抽取...')
    
    try {
      const data = await pickFile(code)
      const targetName = data.file.name
      const resultCode = data.code || code

      // 立即保存结果到 localStorage
      localStorage.setItem(PENDING_RESULT_KEY, JSON.stringify({
        code: resultCode,
        file: data.file,
        download_url: data.download_url,
      }))

      const updateHistory = () => {
        // 更新历史记录
        const existsInHistory = history.value.some(h => h.name === targetName)
        if (!existsInHistory) {
          history.value.push(data.file)
          saveHistory()
        }

        // 更新计数器
        mode.value = data.mode || 'ip'
        usedCodes.value = data.used_codes ?? data.draw_count ?? 0
        totalCodes.value = data.total_codes ?? 0
        drawCount.value = data.draw_count ?? 0
      }

      // 返回目标文件信息，供动画使用
      return {
        targetName,
        targetIndex: files.value.findIndex(f => f.name === targetName),
        file: data.file,
        downloadUrl: data.download_url,
        updateHistory
      }
    } catch (error) {
      localStorage.removeItem(PENDING_RESULT_KEY)
      throw error
    }
  }

  // 完成抽奖（动画完成后调用）
  function completeDraw(file: FileInfo, downloadUrlValue: string) {
    selectedFile.value = file
    downloadUrl.value = downloadUrlValue
    localStorage.removeItem(PENDING_RESULT_KEY)
    setStatus('抽取完成！可点击下方按钮下载文件')
    codeInput.value = '' // 清空输入
    isDrawing.value = false
  }

  // 抽奖失败
  function failDraw() {
    localStorage.removeItem(PENDING_RESULT_KEY)
    isDrawing.value = false
  }

  // 更新速度
  function updateSpeed(speed: number) {
    drawSpeed.value = speed
  }

  // 初始化（需要在组件中调用）
  function init() {
    loadHistory()
    loadFiles()
  }

  return {
    // 状态
    files,
    history,
    drawSpeed,
    isDrawing,
    statusText,
    statusType,
    selectedFile,
    downloadUrl,
    codeInput,
    mode,
    usedCodes,
    totalCodes,
    drawCount,
    
    // 计算属性
    hasFiles,
    hasHistory,
    counterText,
    limitHint,
    
    // 方法
    setStatus,
    formatSize,
    loadFiles,
    startDraw,
    completeDraw,
    failDraw,
    updateSpeed,
    init
  }
}


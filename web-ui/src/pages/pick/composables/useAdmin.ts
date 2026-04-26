/**
 * 管理员功能组合式函数
 */

import { ref, computed } from 'vue'
import {
  adminLogin,
  fetchAdminCodes,
  addAdminCode,
  genAdminCodes,
  deleteAdminCode,
  clearAdminCodes,
  resetAdminCode
} from '../api'
import type { CodeInfo } from '../types'

const KEY_AUTH = 'admin_authed'
const KEY_PW = 'admin_pw'

export function useAdmin() {
  // 登录状态
  const password = ref('')
  const loginError = ref('')
  const isAuthenticated = ref(false)
  const adminPw = ref('')

  // 兑换码列表
  const codes = ref<CodeInfo[]>([])
  const revealedCodes = ref(new Set<string>())
  const copiedCode = ref('')

  // 新增兑换码
  const newCode = ref('')
  const addCodeMsg = ref('')
  const addCodeMsgType = ref<'success' | 'error' | ''>('')

  // 批量生成
  const genMsg = ref('')
  const genMsgType = ref<'success' | 'error' | ''>('')

  // 清空
  const clearMsg = ref('')
  const clearMsgType = ref<'success' | 'error' | ''>('')

  // 导出
  const exportMsg = ref('')
  const exportMsgType = ref<'success' | 'error' | ''>('')

  // 统计信息（优先使用后端返回的统计字段；否则回退本地计算）
  const statsTotal = ref<number | null>(null)
  const statsUsed = ref<number | null>(null)
  const statsLeft = ref<number | null>(null)

  // 轮询
  const polling = ref(false)
  let pollTimer: number | null = null

  const stats = computed(() => {
    const totalLocal = codes.value.length
    const usedLocal = codes.value.filter((c) => c.used).length

    const total = typeof statsTotal.value === 'number' ? statsTotal.value : totalLocal
    const used = typeof statsUsed.value === 'number' ? statsUsed.value : usedLocal
    const left = typeof statsLeft.value === 'number' ? statsLeft.value : (total - used)

    return {
      total,
      used,
      left
    }
  })

  // 遮罩兑换码
  function maskCode(code: string): string {
    return '████████'.slice(0, code.length)
  }

  function _setTimedMsg(
    msgRef: { value: string },
    typeRef: { value: any },
    msg: string,
    type: 'success' | 'error' | ''
  ) {
    msgRef.value = msg
    typeRef.value = type
    if (msg) {
      setTimeout(() => {
        msgRef.value = ''
        typeRef.value = ''
      }, 2000)
    }
  }

  function _stopPolling() {
    polling.value = false
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function _startPolling() {
    if (pollTimer !== null) return
    polling.value = true

    // 10 秒轮询一次（足够及时，又不会太频繁）
    pollTimer = window.setInterval(() => {
      // 避免未登录时请求
      if (!isAuthenticated.value || !adminPw.value) return
      loadCodes(true)
    }, 10 * 1000)
  }

  // 登录
  async function handleLogin() {
    if (!password.value) {
      loginError.value = '请输入密码'
      return
    }

    try {
      await adminLogin(password.value)
      sessionStorage.setItem(KEY_AUTH, '1')
      sessionStorage.setItem(KEY_PW, password.value)
      adminPw.value = password.value
      isAuthenticated.value = true
      loginError.value = ''
      await loadCodes()
      _startPolling()
    } catch (error) {
      loginError.value = (error as Error).message
    }
  }

  // 加载兑换码列表
  async function loadCodes(silent: boolean = false) {
    try {
      const data = await fetchAdminCodes(adminPw.value)
      codes.value = data.codes
      statsTotal.value = data.total_codes
      statsUsed.value = data.used_codes
      statsLeft.value = data.left_codes
    } catch (error) {
      if (!silent) {
        console.error('Failed to load codes:', error)
      }
    }
  }

  // 切换显示/隐藏兑换码
  function toggleReveal(code: string) {
    if (revealedCodes.value.has(code)) {
      revealedCodes.value.delete(code)
    } else {
      revealedCodes.value.add(code)
    }
  }

  // 复制兑换码
  async function copyCode(code: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      copiedCode.value = code
      setTimeout(() => {
        copiedCode.value = ''
      }, 800)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // 新增兑换码
  async function handleAddCode() {
    const code = newCode.value.trim().toUpperCase()

    if (!code) {
      addCodeMsg.value = '请输入兑换码'
      addCodeMsgType.value = 'error'
      return
    }

    // 验证格式：只允许字母和数字
    if (!/^[A-Z0-9]+$/.test(code)) {
      addCodeMsg.value = '兑换码只能包含字母和数字'
      addCodeMsgType.value = 'error'
      return
    }

    try {
      const data = await addAdminCode(adminPw.value, code)
      if ((data as any).error) {
        addCodeMsg.value = (data as any).error
        addCodeMsgType.value = 'error'
      } else {
        addCodeMsg.value = `成功新增兑换码: ${code}`
        addCodeMsgType.value = 'success'
        newCode.value = ''
        await loadCodes(true)
        setTimeout(() => {
          addCodeMsg.value = ''
          addCodeMsgType.value = ''
        }, 2000)
      }
    } catch (error) {
      addCodeMsg.value = '添加失败: ' + (error as Error).message
      addCodeMsgType.value = 'error'
    }
  }

  // 批量生成兑换码（固定每次生成 5 个）
  async function handleGenCodes() {
    try {
      const data = await genAdminCodes(adminPw.value, 5)
      _setTimedMsg(genMsg, genMsgType, `已生成 ${data.generated_count} 个兑换码`, 'success')
      await loadCodes(true)

      // 生成后自动复制新生成的兑换码（便于发放）
      if (data.generated && data.generated.length) {
        copyCode(data.generated.join('\n'))
      }
    } catch (error) {
      _setTimedMsg(genMsg, genMsgType, '生成失败: ' + (error as Error).message, 'error')
    }
  }

  // 删除兑换码
  async function handleDeleteCode(code: string) {
    if (!code) return
    if (!confirm(`确定删除兑换码 ${code} ？`)) return

    try {
      await deleteAdminCode(adminPw.value, code)
      await loadCodes(true)
    } catch (error) {
      alert('删除失败: ' + (error as Error).message)
    }
  }

  // 重置兑换码
  async function handleResetCode(code: string) {
    if (!code) return
    if (!confirm(`确定将兑换码 ${code} 重置为未使用？`)) return

    try {
      await resetAdminCode(adminPw.value, code)
      await loadCodes(true)
    } catch (error) {
      alert('重置失败: ' + (error as Error).message)
    }
  }

  // 清空兑换码
  async function handleClearCodes() {
    if (!confirm('确定清空所有兑换码？此操作不可恢复。')) return

    try {
      const data = await clearAdminCodes(adminPw.value, true)
      _setTimedMsg(clearMsg, clearMsgType, `已清空 ${data.cleared || 0} 个兑换码`, 'success')
      await loadCodes(true)
    } catch (error) {
      _setTimedMsg(clearMsg, clearMsgType, '清空失败: ' + (error as Error).message, 'error')
    }
  }

  // 导出兑换码（复制到剪贴板）
  async function handleExportCodes() {
    try {
      const response = await fetch('/api/admin/codes/export?only_unused=1&format=text', {
        headers: {
          'X-Admin-Password': adminPw.value
        }
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const text = await response.text()
      await copyCode(text)

      const n = text
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean).length

      _setTimedMsg(exportMsg, exportMsgType, `已导出 ${n} 个未使用兑换码（已复制）`, 'success')
    } catch (error) {
      _setTimedMsg(exportMsg, exportMsgType, '导出失败: ' + (error as Error).message, 'error')
    }
  }

  // 检查兑换码是否已显示
  function isCodeRevealed(code: string): boolean {
    return revealedCodes.value.has(code)
  }

  // 检查兑换码是否已复制
  function isCodeCopied(code: string): boolean {
    return copiedCode.value === code
  }

  // 初始化（自动恢复登录状态）
  function init() {
    if (sessionStorage.getItem(KEY_AUTH) === '1') {
      adminPw.value = sessionStorage.getItem(KEY_PW) || ''
      if (adminPw.value) {
        isAuthenticated.value = true
        loadCodes(true)
        _startPolling()
      }
    }
  }

  return {
    // 登录状态
    password,
    loginError,
    isAuthenticated,

    // 兑换码列表
    codes,
    revealedCodes,
    copiedCode,

    // 新增兑换码
    newCode,
    addCodeMsg,
    addCodeMsgType,

    // 批量生成
    genMsg,
    genMsgType,

    // 清空
    clearMsg,
    clearMsgType,

    // 导出
    exportMsg,
    exportMsgType,

    // 轮询状态
    polling,

    // 计算属性
    stats,

    // 方法
    maskCode,
    handleLogin,
    loadCodes,
    toggleReveal,
    copyCode,
    handleAddCode,
    handleGenCodes,
    handleDeleteCode,
    handleResetCode,
    handleClearCodes,
    handleExportCodes,
    isCodeRevealed,
    isCodeCopied,
    init,
    _stopPolling
  }
}

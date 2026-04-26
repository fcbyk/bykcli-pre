/**
 * 认证逻辑组合式函数
 */

import { ref, onMounted } from 'vue'
import { checkAuth, login as apiLogin } from '../api'

export function useAuth() {
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const errorMessage = ref('')

  /** 检查认证状态 */
  async function checkAuthStatus() {
    const authenticated = await checkAuth()
    if (authenticated) {
      isAuthenticated.value = true
    }
  }

  /** 登录 */
  async function login(password: string) {
    errorMessage.value = ''
    
    if (!password.trim()) {
      errorMessage.value = '请输入密码'
      return false
    }

    isLoading.value = true
    errorMessage.value = ''

    try {
      const result = await apiLogin(password)

      if (result.code === 200) {
        isAuthenticated.value = true
        return true
      } else {
        // 将可能的英文错误消息映射为中文
        const msg = result.message || ''
        if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid')) {
          errorMessage.value = '密码错误'
        } else {
          errorMessage.value = msg || '登录失败'
        }
        return false
      }
    } catch (error) {
      errorMessage.value = '服务器异常，请稍后重试'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /** 清除错误信息 */
  function clearError() {
    errorMessage.value = ''
  }

  // 组件挂载时检查认证状态
  onMounted(() => {
    checkAuthStatus()
    window.addEventListener('unauthorized', () => {
      isAuthenticated.value = false
    })
  })

  return {
    isAuthenticated,
    isLoading,
    errorMessage,
    login,
    clearError
  }
}

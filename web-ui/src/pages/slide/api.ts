/**
 * Slide API 服务
 * 处理所有 HTTP 请求
 */

import type { ApiResponse, MouseMoveData, MouseScrollData } from './types'

/** 检查响应是否授权并解析为 R 对象 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json()

  if (response.status === 401) {
    if (!response.url.endsWith('/api/login')) {
      window.dispatchEvent(new CustomEvent('unauthorized'))
    }
  }

  return data as ApiResponse<T>
}

/** 检查认证状态 */
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/check_auth')
    const result = await handleResponse<{ authenticated: boolean }>(response)
    if (!response.ok || result.code !== 200) {
      return false
    }
    return !!result.data?.authenticated
  } catch (error) {
    return false
  }
}

export async function getQrLoginInfo(): Promise<{ loginUrl: string; wifiName?: string } | null> {
  try {
    const response = await fetch('/internal/qr/info')
    if (!response.ok) {
      return null
    }
    const result = await handleResponse<{ login_url: string; wifi_name?: string }>(response)
    if (result.code !== 200 || !result.data || !result.data.login_url) {
      return null
    }
    return { loginUrl: result.data.login_url, wifiName: result.data.wifi_name }
  } catch {
    return null
  }
}

export async function getQrStatus(token: string): Promise<boolean> {
  if (!token) {
    return false
  }
  try {
    const url = `/internal/qr/status?token=${encodeURIComponent(token)}`
    const response = await fetch(url)
    if (!response.ok) {
      return false
    }
    const result = await handleResponse<{ valid: boolean }>(response)
    if (result.code !== 200 || !result.data) {
      return false
    }
    return !!result.data.valid
  } catch {
    return false
  }
}

/** 登录 */
export async function login(password: string): Promise<ApiResponse<{ authenticated: boolean } | null>> {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    })
    return await handleResponse<{ authenticated: boolean }>(response)
  } catch (error) {
    return {
      code: 0,
      message: '网络错误，请重试',
      data: null
    }
  }
}

/** 退出登录 */
export async function logout(): Promise<void> {
  try {
    const response = await fetch('/api/logout', { method: 'POST' })
    await handleResponse<null>(response)
  } catch (error) {
    // 静默处理
  }
}

/** PPT 控制 - 下一页 */
export async function nextSlide(): Promise<void> {
  try {
    const response = await fetch('/api/next', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

/** PPT 控制 - 上一页 */
export async function prevSlide(): Promise<void> {
  try {
    const response = await fetch('/api/prev', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

/** 鼠标移动 (HTTP 降级) */
export async function httpMouseMove(data: MouseMoveData): Promise<void> {
  try {
    const response = await fetch('/api/mouse/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

/** 鼠标点击 (HTTP 降级) */
export async function httpMouseClick(): Promise<void> {
  try {
    const response = await fetch('/api/mouse/click', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

/** 鼠标右键 (HTTP 降级) */
export async function httpMouseRightClick(): Promise<void> {
  try {
    const response = await fetch('/api/mouse/rightclick', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

/** 鼠标滚动 (HTTP 降级) */
export async function httpMouseScroll(data: MouseScrollData): Promise<void> {
  try {
    const response = await fetch('/api/mouse/scroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
    // 静默处理错误
  }
}

export async function httpMouseDown(): Promise<void> {
  try {
    const response = await fetch('/api/mouse/down', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
  }
}

export async function httpMouseUp(): Promise<void> {
  try {
    const response = await fetch('/api/mouse/up', { method: 'POST' })
    await handleResponse<{ action: string }>(response)
  } catch (error) {
  }
}

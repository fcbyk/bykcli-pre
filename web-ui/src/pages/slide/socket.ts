/**
 * Slide WebSocket 服务
 * 处理 Socket.io 连接和事件
 */

import { io, Socket } from 'socket.io-client'
import { checkAuth } from './api'

let socket: Socket | null = null
let latency = 0
let latencyTimer: any = null

/** 初始化 WebSocket 连接 */
export function initSocket(onConnect?: () => void, onDisconnect?: () => void): Socket {
  if (socket) {
    return socket
  }

  socket = io()

  socket.on('connect', () => {
    console.log('WebSocket connected')
    startLatencyMeasurement()
    onConnect?.()
  })

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected')
    stopLatencyMeasurement()
    onDisconnect?.()
  })

  socket.on('connect_error', (error) => {
    console.log('WebSocket connection error:', error)
    // 只有在连接建立失败时检查认证状态
    // 如果是服务器关闭导致的错误，checkAuth 也会失败或返回 false
    // 但我们的 handleResponse 会在 401 时触发 unauthorized 事件
    checkAuth()
  })

  return socket
}

/** 开始延迟测量 */
function startLatencyMeasurement() {
  if (latencyTimer) return
  
  const measure = () => {
    if (socket && socket.connected) {
      const start = Date.now()
      socket.emit('ping_server', () => {
        latency = Date.now() - start
      })
    }
  }

  measure()
  latencyTimer = setInterval(measure, 3000) // 每 3 秒测量一次
}

/** 停止延迟测量 */
function stopLatencyMeasurement() {
  if (latencyTimer) {
    clearInterval(latencyTimer)
    latencyTimer = null
  }
  latency = 0
}

/** 获取当前延迟 (ms) */
export function getLatency(): number {
  return latency
}

/** 获取 Socket 实例 */
export function getSocket(): Socket | null {
  return socket
}

/** 手动连接 Socket */
export function connectSocket(): void {
  if (socket && !socket.connected) {
    socket.connect()
  }
}

/** 检查连接状态 */
export function isConnected(): boolean {
  return socket?.connected ?? false
}

/** 发送鼠标移动事件 */
export function emitMouseMove(dx: number, dy: number): void {
  if (socket && socket.connected) {
    socket.emit('mouse_move', { 
      dx: Math.round(dx), 
      dy: Math.round(dy) 
    })
  }
}

/** 发送鼠标点击事件 */
export function emitMouseClick(): void {
  if (socket && socket.connected) {
    socket.emit('mouse_click')
  }
}

export function emitMouseDown(): void {
  if (socket && socket.connected) {
    socket.emit('mouse_down')
  }
}

export function emitMouseUp(): void {
  if (socket && socket.connected) {
    socket.emit('mouse_up')
  }
}

/** 发送鼠标右键事件 */
export function emitMouseRightClick(): void {
  if (socket && socket.connected) {
    socket.emit('mouse_rightclick')
  }
}

/** 发送鼠标滚动事件 */
export function emitMouseScroll(dx: number, dy: number): void {
  if (socket && socket.connected) {
    socket.emit('mouse_scroll', { dx, dy })
  }
}

/** 断开连接 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

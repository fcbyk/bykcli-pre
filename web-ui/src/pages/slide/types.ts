/**
 * Slide 页面类型定义
 */

/** API 响应基础类型，对应后端 R 对象 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

/** 鼠标移动数据 */
export interface MouseMoveData {
  dx: number
  dy: number
}

/** 鼠标滚动数据 */
export interface MouseScrollData {
  dx: number
  dy: number
}

/** 触摸状态 */
export interface TouchState {
  count: number
  startTime: number
  isMoving: boolean
  isDragging: boolean
  twoFingerMoved: boolean
  lastX: number
  lastY: number
  lastTwoFingerY: number
  moveAccumulator: {
    dx: number
    dy: number
  }
  rafId: number | null
  lastTapTime: number
  lastTapWasClick: boolean
  longPressTimer: number | null
  pendingClickTimer: number | null
  isSecondTapCandidate: boolean
}

/** WebSocket 连接状态 */
export interface SocketState {
  connected: boolean
  instance: any | null
}

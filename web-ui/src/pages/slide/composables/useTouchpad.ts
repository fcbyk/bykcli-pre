/**
 * 触摸板交互逻辑组合式函数
 */

import { ref, reactive, onUnmounted } from 'vue'
import type { TouchState } from '../types'
import { isConnected, emitMouseMove, emitMouseClick, emitMouseRightClick, emitMouseScroll, emitMouseDown, emitMouseUp } from '../socket'
import { httpMouseMove, httpMouseClick, httpMouseRightClick, httpMouseScroll, httpMouseDown, httpMouseUp } from '../api'

const MOUSE_SENSITIVITY = 1.5
const CLICK_MAX_DURATION = 200
const DOUBLE_TAP_INTERVAL = 200
const LONG_PRESS_THRESHOLD = 300

export function useTouchpad(getDragMode?: () => boolean) {
  const touchpadRef = ref<HTMLElement | null>(null)

  const touchState = reactive<TouchState>({
    count: 0,
    startTime: 0,
    isMoving: false,
    isDragging: false,
    twoFingerMoved: false,
    lastX: 0,
    lastY: 0,
    lastTwoFingerY: 0,
    moveAccumulator: {
      dx: 0,
      dy: 0
    },
    rafId: null,
    lastTapTime: 0,
    lastTapWasClick: false,
    longPressTimer: null,
    pendingClickTimer: null,
    isSecondTapCandidate: false
  })

  /** 发送鼠标移动（优先 WebSocket） */
  function sendMouseMove(dx: number, dy: number) {
    if (isConnected()) {
      emitMouseMove(dx, dy)
    } else {
      httpMouseMove({ dx: Math.round(dx), dy: Math.round(dy) })
    }
  }

  /** 发送鼠标点击 */
  function sendMouseClick() {
    if (isConnected()) {
      emitMouseClick()
    } else {
      httpMouseClick()
    }
  }

  function sendMouseDown() {
    if (isConnected()) {
      emitMouseDown()
    } else {
      httpMouseDown()
    }
  }

  function sendMouseUp() {
    if (isConnected()) {
      emitMouseUp()
    } else {
      httpMouseUp()
    }
  }

  /** 发送鼠标右键 */
  function sendMouseRightClick() {
    if (isConnected()) {
      emitMouseRightClick()
    } else {
      httpMouseRightClick()
    }
  }

  /** 发送鼠标滚动 */
  function sendMouseScroll(dx: number, dy: number) {
    if (isConnected()) {
      emitMouseScroll(dx, dy)
    } else {
      httpMouseScroll({ dx, dy })
    }
  }

  /** 批量发送累积的移动 */
  function flushMouseMove() {
    if (touchState.moveAccumulator.dx !== 0 || touchState.moveAccumulator.dy !== 0) {
      sendMouseMove(
        touchState.moveAccumulator.dx * MOUSE_SENSITIVITY,
        touchState.moveAccumulator.dy * MOUSE_SENSITIVITY
      )
      touchState.moveAccumulator.dx = 0
      touchState.moveAccumulator.dy = 0
    }
    touchState.rafId = null
  }

  /** 触摸开始 */
  function handleTouchStart(e: TouchEvent) {
    e.preventDefault()
    touchState.count = e.touches.length
    touchState.startTime = Date.now()
    touchState.isMoving = false
    touchState.isDragging = false
    touchState.twoFingerMoved = false
    touchState.moveAccumulator.dx = 0
    touchState.moveAccumulator.dy = 0
    touchState.isSecondTapCandidate = false

    if (touchState.count === 1) {
      const touch = e.touches[0]
      touchState.lastX = touch.clientX
      touchState.lastY = touch.clientY
      const dragMode = getDragMode ? getDragMode() : false
      if (dragMode) {
        touchState.isDragging = true
        sendMouseDown()
      } else {
        const now = Date.now()
        const isSecondTap = touchState.lastTapWasClick && now - touchState.lastTapTime <= DOUBLE_TAP_INTERVAL
        touchState.isSecondTapCandidate = isSecondTap
        if (touchState.longPressTimer) {
          clearTimeout(touchState.longPressTimer)
          touchState.longPressTimer = null
        }
        if (isSecondTap) {
          if (touchState.pendingClickTimer) {
            clearTimeout(touchState.pendingClickTimer)
            touchState.pendingClickTimer = null
          }
          touchState.longPressTimer = window.setTimeout(() => {
            touchState.isDragging = true
            sendMouseDown()
          }, LONG_PRESS_THRESHOLD)
        }
      }
    } else if (touchState.count === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      touchState.lastX = (touch1.clientX + touch2.clientX) / 2
      touchState.lastY = (touch1.clientY + touch2.clientY) / 2
      touchState.lastTwoFingerY = 0
    }
  }

  /** 触摸移动 */
  function handleTouchMove(e: TouchEvent) {
    e.preventDefault()
    touchState.count = e.touches.length

    if (touchState.count === 1) {
      // 单指移动鼠标
      const touch = e.touches[0]
      const dx = touch.clientX - touchState.lastX
      const dy = touch.clientY - touchState.lastY

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        touchState.isMoving = true
        touchState.moveAccumulator.dx += dx
        touchState.moveAccumulator.dy += dy
        touchState.lastX = touch.clientX
        touchState.lastY = touch.clientY

        // 使用 requestAnimationFrame 批量发送
        if (!touchState.rafId) {
          touchState.rafId = requestAnimationFrame(flushMouseMove)
        }
      }
    } else if (touchState.count === 2) {
      // 双指滚动
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2

      if (touchState.lastTwoFingerY === 0) {
        touchState.lastTwoFingerY = centerY
      } else {
        const dy = centerY - touchState.lastTwoFingerY

        if (Math.abs(dy) > 0.1) {
          touchState.twoFingerMoved = true
          touchState.isMoving = true
          const scrollValue = dy * 20
          sendMouseScroll(0, scrollValue)
          touchState.lastTwoFingerY = centerY
        }
      }

      touchState.lastX = centerX
      touchState.lastY = centerY
    }
  }

  /** 触摸结束 */
  function handleTouchEnd(e: TouchEvent) {
    e.preventDefault()

    const touchDuration = Date.now() - touchState.startTime

    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer)
      touchState.longPressTimer = null
    }

    if (touchState.rafId) {
      cancelAnimationFrame(touchState.rafId)
      flushMouseMove()
    }

    if (touchState.isDragging) {
      if (touchState.pendingClickTimer) {
        clearTimeout(touchState.pendingClickTimer)
        touchState.pendingClickTimer = null
      }
      sendMouseUp()
      touchState.lastTapWasClick = false
    } else {
      if (!touchState.isMoving && touchDuration < CLICK_MAX_DURATION) {
        if (touchState.count === 1) {
          const now = Date.now()
          if (touchState.isSecondTapCandidate) {
            if (touchState.pendingClickTimer) {
              clearTimeout(touchState.pendingClickTimer)
              touchState.pendingClickTimer = null
            }
            sendMouseClick()
            sendMouseClick()
            touchState.lastTapTime = now
            touchState.lastTapWasClick = false
          } else {
            if (touchState.pendingClickTimer) {
              clearTimeout(touchState.pendingClickTimer)
            }
            touchState.pendingClickTimer = window.setTimeout(() => {
              sendMouseClick()
              touchState.pendingClickTimer = null
            }, DOUBLE_TAP_INTERVAL)
            touchState.lastTapTime = now
            touchState.lastTapWasClick = true
          }
        } else if (touchState.count === 2 && !touchState.twoFingerMoved) {
          if (touchState.pendingClickTimer) {
            clearTimeout(touchState.pendingClickTimer)
            touchState.pendingClickTimer = null
          }
          sendMouseRightClick()
          touchState.lastTapWasClick = false
        }
      } else {
        if (touchState.pendingClickTimer) {
          clearTimeout(touchState.pendingClickTimer)
          touchState.pendingClickTimer = null
        }
        touchState.lastTapWasClick = false
      }
    }

    touchState.count = 0
    touchState.isMoving = false
    touchState.isDragging = false
    touchState.twoFingerMoved = false
    touchState.moveAccumulator.dx = 0
    touchState.moveAccumulator.dy = 0
    touchState.lastTwoFingerY = 0
    touchState.isSecondTapCandidate = false
  }

  /** 绑定触摸事件 */
  function bindTouchEvents(element: HTMLElement) {
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
  }

  /** 解绑触摸事件 */
  function unbindTouchEvents(element: HTMLElement) {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
  }

  // 组件卸载时清理
  onUnmounted(() => {
    if (touchpadRef.value) {
      unbindTouchEvents(touchpadRef.value)
    }
    if (touchState.rafId) {
      cancelAnimationFrame(touchState.rafId)
    }
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer)
      touchState.longPressTimer = null
    }
    if (touchState.pendingClickTimer) {
      clearTimeout(touchState.pendingClickTimer)
      touchState.pendingClickTimer = null
    }
  })

  return {
    touchpadRef,
    bindTouchEvents,
    unbindTouchEvents
  }
}

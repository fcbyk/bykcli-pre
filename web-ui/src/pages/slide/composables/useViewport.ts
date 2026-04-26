/**
 * 移动端视口高度修复
 * 解决移动浏览器地址栏影响视口高度的问题
 */

import { onMounted, onUnmounted } from 'vue'

export function useViewport() {
  /** 设置视口高度 CSS 变量 */
  function setViewportHeight() {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  onMounted(() => {
    setViewportHeight()
    window.addEventListener('resize', setViewportHeight)
    window.addEventListener('orientationchange', setViewportHeight)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', setViewportHeight)
    window.removeEventListener('orientationchange', setViewportHeight)
  })

  return {
    setViewportHeight
  }
}
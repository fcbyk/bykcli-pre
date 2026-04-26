import { ref, reactive } from 'vue'
import { pingTest, downloadSpeedTest, uploadSpeedTest } from '../api'
import type { SpeedTestResult } from '../types'
import { formatFileSize } from '@/utils/files'

export function useLansendSpeed() {
  const isSpeedTestVisible = ref(false)
  const speedResult = reactive<SpeedTestResult>({
    ping: 0,
    download: 0,
    upload: 0,
    status: 'idle'
  })

  const currentProgress = ref(0)

  async function startSpeedTest() {
    isSpeedTestVisible.value = true
    speedResult.status = 'pinging'
    speedResult.ping = 0
    speedResult.download = 0
    speedResult.upload = 0
    speedResult.error = undefined
    currentProgress.value = 0

    try {
      // 1. Ping test
      speedResult.status = 'pinging'
      const pings = []
      for (let i = 0; i < 3; i++) {
        pings.push(await pingTest())
      }
      speedResult.ping = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length)

      // 2. Download test
      speedResult.status = 'downloading'
      currentProgress.value = 0
      speedResult.download = await downloadSpeedTest(50, (loaded, total, instantSpeed) => {
        currentProgress.value = (loaded / total) * 100
        speedResult.download = instantSpeed // 实时更新显示瞬时速度
      })

      // 3. Upload test
      speedResult.status = 'uploading'
      currentProgress.value = 0
      speedResult.upload = await uploadSpeedTest(30, (loaded, total, instantSpeed) => {
        currentProgress.value = (loaded / total) * 100
        speedResult.upload = instantSpeed
      })

      speedResult.status = 'completed'
    } catch (err: any) {
      console.error('Speed test error:', err)
      speedResult.status = 'error'
      speedResult.error = err.message || '测速失败'
    }
  }

  function closeSpeedTest() {
    isSpeedTestVisible.value = false
    // 如果正在测速，这里可以考虑取消请求，但为了简单暂不实现
  }

  function formatSpeed(bytesPerSec: number) {
    if (bytesPerSec === 0) return '0 B/s'
    return `${formatFileSize(bytesPerSec)}/s`
  }

  function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return ''
    if (seconds < 60) return `${Math.round(seconds)}秒`
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    if (mins < 60) return `${mins}分${secs}秒`
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}小时${remainingMins}分`
  }

  return {
    isSpeedTestVisible,
    speedResult,
    currentProgress,
    startSpeedTest,
    closeSpeedTest,
    formatSpeed,
    formatDuration
  }
}

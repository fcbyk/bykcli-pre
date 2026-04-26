import { ref, watch } from 'vue'

export function usePasswordShake(
  getError: () => string | undefined,
  getVisible: () => boolean
) {
  const shouldShake = ref(false)
  let shakeTimer: number | undefined

  function onShakeEnd() {
    shouldShake.value = false
  }

  watch(
    () => getError(),
    msg => {
      if (!msg) return
      if (!getVisible()) return

      shouldShake.value = false
      if (shakeTimer) window.clearTimeout(shakeTimer)
      shakeTimer = window.setTimeout(() => {
        shouldShake.value = true
      }, 0)
    }
  )

  return {
    shouldShake,
    onShakeEnd
  }
}


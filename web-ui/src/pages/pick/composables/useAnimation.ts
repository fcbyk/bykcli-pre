/**
 * 抽奖动画逻辑组合式函数
 */

import { ref } from 'vue'
import type { AnimationStage } from '../types'

export function useAnimation() {
  const currentHighlightIndex = ref<number>(-1)
  let animationTimer: any = null

  // 睡眠函数
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      animationTimer = setTimeout(resolve, ms)
    })
  }

  // 高亮指定索引
  function highlight(index: number) {
    currentHighlightIndex.value = index
  }

  // 清除高亮
  function clearHighlight() {
    currentHighlightIndex.value = -1
  }

  // 停止动画
  function stopAnimation() {
    if (animationTimer) {
      clearInterval(animationTimer)
      clearTimeout(animationTimer)
      animationTimer = null
    }
    clearHighlight()
  }

  // 旋转到目标索引
  async function spinToTarget(
    targetIndex: number,
    availableIndices: number[],
    speedFactor: number
  ): Promise<number> {
    const indexMap = new Map<number, number>()
    availableIndices.forEach((origIdx, pos) => {
      indexMap.set(origIdx, pos)
    })

    const targetPos = indexMap.get(targetIndex)
    if (targetPos === undefined) return targetIndex

    let currentPos = -1
    const availableCount = availableIndices.length

    // 计算动画阶段
    const fastMinCircles = 2.5
    const fastMaxCircles = 4.0
    const fastBaseSteps = Math.floor(
      availableCount * (fastMinCircles + Math.random() * (fastMaxCircles - fastMinCircles))
    )
    const fastExtraSteps = Math.floor(fastBaseSteps * Math.random() * 0.6)
    const fastSteps = fastBaseSteps + fastExtraSteps

    const transitionMinCircles = 0.6
    const transitionMaxCircles = 1.2
    const transitionBaseSteps = Math.floor(
      availableCount * (transitionMinCircles + Math.random() * (transitionMaxCircles - transitionMinCircles))
    )
    const transitionExtraSteps = Math.floor(transitionBaseSteps * Math.random() * 0.4)
    const transitionSteps = transitionBaseSteps + transitionExtraSteps

    const stages: AnimationStage[] = [
      { steps: fastSteps, delay: 50 },
      { steps: transitionSteps, delay: 120 }
    ]

    // 快速和过渡阶段
    for (const stage of stages) {
      for (let i = 0; i < stage.steps; i++) {
        currentPos = (currentPos + 1) % availableCount
        const currentIndex = availableIndices[currentPos]
        highlight(currentIndex)
        await sleep(stage.delay * speedFactor)
      }
    }

    // 减速到目标
    const distance = ((targetPos - currentPos) % availableCount + availableCount) % availableCount
    const totalSteps = distance + availableCount * 2
    const finalDelayStart = 180
    const finalDelayEnd = 550

    for (let step = 0; step < totalSteps; step++) {
      currentPos = (currentPos + 1) % availableCount
      const currentIndex = availableIndices[currentPos]
      highlight(currentIndex)
      
      const t = step / Math.max(1, totalSteps - 1)
      const delay = (finalDelayStart + (finalDelayEnd - finalDelayStart) * t) * speedFactor
      await sleep(delay)
    }

    return availableIndices[currentPos]
  }

  return {
    currentHighlightIndex,
    highlight,
    clearHighlight,
    stopAnimation,
    spinToTarget
  }
}
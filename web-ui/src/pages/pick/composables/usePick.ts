/**
 * Pick 核心逻辑组合式函数
 */

import { ref, computed } from 'vue'
import { fetchItems } from '../api'
import type { StatusType } from '../types'

export function usePick() {
  // 状态
  const items = ref<string[]>([])
  const drawnIndices = ref(new Set<number>())
  const noRepeatMode = ref(false)
  const drawSpeed = ref(3)
  const isDrawing = ref(false)
  const statusText = ref('正在加载列表...')
  const statusType = ref<StatusType>('')
  const selectedWinner = ref<string>('')

  // 计算属性
  const hasItems = computed(() => items.value.length > 0)
  const hasDrawn = computed(() => drawnIndices.value.size > 0)
  const availableIndices = computed(() => {
    if (!noRepeatMode.value) {
      return items.value.map((_, idx) => idx)
    }
    return items.value.map((_, idx) => idx).filter(idx => !drawnIndices.value.has(idx))
  })

  // 设置状态
  function setStatus(text: string, type: StatusType = '') {
    statusText.value = text
    statusType.value = type
  }

  // 加载列表
  async function loadItems() {
    setStatus('正在加载列表...')
    try {
      const data = await fetchItems()
      items.value = data
      drawnIndices.value.clear()
      
      if (!data.length) {
        setStatus('列表为空，请先在命令行使用 --add 添加项目', 'err')
      } else {
        setStatus(`已加载 ${data.length} 条候选项`, 'ok')
      }
    } catch (error) {
      setStatus((error as Error).message, 'err')
    }
  }

  // 重置已抽取
  function resetDrawn() {
    drawnIndices.value.clear()
    setStatus('已重置，所有项目可重新抽取', 'ok')
  }

  // 切换无放回模式
  function toggleNoRepeatMode() {
    noRepeatMode.value = !noRepeatMode.value
  }

  // 更新速度
  function updateSpeed(speed: number) {
    drawSpeed.value = speed
  }

  // 标记为已抽取
  function markAsDrawn(index: number) {
    if (noRepeatMode.value) {
      drawnIndices.value.add(index)
    }
  }

  // 设置选中结果
  function setWinner(winner: string) {
    selectedWinner.value = winner
  }

  return {
    // 状态
    items,
    drawnIndices,
    noRepeatMode,
    drawSpeed,
    isDrawing,
    statusText,
    statusType,
    selectedWinner,
    
    // 计算属性
    hasItems,
    hasDrawn,
    availableIndices,
    
    // 方法
    setStatus,
    loadItems,
    resetDrawn,
    toggleNoRepeatMode,
    updateSpeed,
    markAsDrawn,
    setWinner
  }
}
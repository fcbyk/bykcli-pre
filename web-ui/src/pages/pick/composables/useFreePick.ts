/**
 * 自由抽奖元素管理组合式函数
 */

import { ref, computed } from 'vue'
import {
  fetchItems,
  addItem,
  addItems,
  removeItem,
  clearItems,
  updateItems
} from '../api'

export function useFreePick() {
  // 抽奖元素列表
  const items = ref<string[]>([])
  
  // 新增元素
  const newItem = ref('')
  const addMsg = ref('')
  const addMsgType = ref<'success' | 'error' | ''>('')
  
  // 批量添加
  const batchInput = ref('')
  const batchMsg = ref('')
  const batchMsgType = ref<'success' | 'error' | ''>('')
  
  // 清空提示
  const clearMsg = ref('')
  const clearMsgType = ref<'success' | 'error' | ''>('')
  
  // 编辑状态
  const editingIndex = ref<number | null>(null)
  const editingValue = ref('')
  
  // 复制状态
  const copiedItem = ref('')
  
  // 统计信息
  const stats = computed(() => ({
    total: items.value.length
  }))

  // 设置定时消息
  function _setTimedMsg(
    msgRef: { value: string },
    typeRef: { value: any },
    msg: string,
    type: 'success' | 'error' | ''
  ) {
    msgRef.value = msg
    typeRef.value = type
    if (msg) {
      setTimeout(() => {
        msgRef.value = ''
        typeRef.value = ''
      }, 2000)
    }
  }

  // 加载列表
  async function loadItems(silent: boolean = false) {
    try {
      items.value = await fetchItems()
    } catch (error) {
      if (!silent) {
        console.error('Failed to load items:', error)
      }
    }
  }

  // 新增单个元素
  async function handleAddItem() {
    const item = newItem.value.trim()
    
    if (!item) {
      addMsg.value = '请输入元素'
      addMsgType.value = 'error'
      return
    }
    
    try {
      await addItem(item)
      addMsg.value = `成功添加：${item}`
      addMsgType.value = 'success'
      newItem.value = ''
      await loadItems(true)
      setTimeout(() => {
        addMsg.value = ''
        addMsgType.value = ''
      }, 2000)
    } catch (error) {
      addMsg.value = '添加失败：' + (error as Error).message
      addMsgType.value = 'error'
    }
  }

  // 批量添加元素
  async function handleBatchAdd() {
    const input = batchInput.value.trim()
    
    if (!input) {
      batchMsg.value = '请输入元素列表'
      batchMsgType.value = 'error'
      return
    }
    
    try {
      const result = await addItems(input)
      const addedCount = result.addedCount
      const duplicates = result.duplicates
      
      let msg = `成功添加 ${addedCount} 个元素`
      if (duplicates.length > 0) {
        msg += `（跳过 ${duplicates.length} 个重复项）`
      }
      
      batchMsg.value = msg
      batchMsgType.value = 'success'
      batchInput.value = ''
      await loadItems(true)
      setTimeout(() => {
        batchMsg.value = ''
        batchMsgType.value = ''
      }, 3000)
    } catch (error) {
      batchMsg.value = '批量添加失败：' + (error as Error).message
      batchMsgType.value = 'error'
    }
  }

  // 删除元素
  async function handleDeleteItem(item: string) {
    if (!item) return
    if (!confirm(`确定删除元素 "${item}"？`)) return
    
    try {
      await removeItem(item)
      await loadItems(true)
    } catch (error) {
      alert('删除失败：' + (error as Error).message)
    }
  }

  // 清空列表
  async function handleClear() {
    if (!items.value.length) {
      clearMsg.value = '列表已为空'
      clearMsgType.value = 'error'
      return
    }
    
    if (!confirm(`确定清空所有 ${items.value.length} 个元素？此操作不可恢复。`)) return
    
    try {
      const count = await clearItems()
      clearMsg.value = `已清空 ${count} 个元素`
      clearMsgType.value = 'success'
      await loadItems(true)
      setTimeout(() => {
        clearMsg.value = ''
        clearMsgType.value = ''
      }, 2000)
    } catch (error) {
      clearMsg.value = '清空失败：' + (error as Error).message
      clearMsgType.value = 'error'
    }
  }

  // 开始编辑
  function startEdit(index: number, item: string) {
    editingIndex.value = index
    editingValue.value = item
  }

  // 保存编辑
  async function saveEdit() {
    if (editingIndex.value === null) return
    
    const newValue = editingValue.value.trim()
    if (!newValue) {
      alert('元素不能为空')
      return
    }
    
    const oldItem = items.value[editingIndex.value]
    if (newValue === oldItem) {
      editingIndex.value = null
      return
    }
    
    // 检查是否重复
    if (items.value.includes(newValue)) {
      alert('该元素已存在')
      return
    }
    
    // 更新列表
    const newItems = [...items.value]
    newItems[editingIndex.value] = newValue
    
    try {
      await updateItems(newItems)
      editingIndex.value = null
      await loadItems(true)
    } catch (error) {
      alert('更新失败：' + (error as Error).message)
    }
  }

  // 取消编辑
  function cancelEdit() {
    editingIndex.value = null
    editingValue.value = ''
  }

  // 复制元素
  async function copyItem(item: string) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(item)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = item
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      copiedItem.value = item
      setTimeout(() => {
        copiedItem.value = ''
      }, 800)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // 检查是否已复制
  function isItemCopied(item: string): boolean {
    return copiedItem.value === item
  }

  // 初始化
  function init() {
    loadItems()
  }

  return {
    // 数据
    items,
    newItem,
    addMsg,
    addMsgType,
    batchInput,
    batchMsg,
    batchMsgType,
    clearMsg,
    clearMsgType,
    editingIndex,
    editingValue,
    
    // 计算属性
    stats,
    
    // 方法
    loadItems,
    handleAddItem,
    handleBatchAdd,
    handleDeleteItem,
    handleClear,
    startEdit,
    saveEdit,
    cancelEdit,
    copyItem,
    isItemCopied,
    init
  }
}

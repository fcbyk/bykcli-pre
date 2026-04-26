<template>
  <main class="w-full max-w-[960px] p-7 bg-[#1e293b]/85 rounded-[18px] border border-white/6 shadow-(--shadow) backdrop-blur-md min-[881px]:h-auto max-[880px]:h-full max-[880px]:w-full max-[880px]:overflow-y-auto max-[880px]:rounded-none">
    <!-- 顶部工具栏 -->
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-center gap-3">
        <label class="text-sm text-(--muted)">数据模式：</label>
        <select 
          v-model="dataMode"
          class="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-(--text) text-sm outline-none focus:border-(--primary) cursor-pointer min-w-[200px]"
          @change="handleModeChange"
        >
          <option value="backend">后端数据（只读，管理员页面管理）</option>
          <option value="local">本地数据（仅本地，可添加删除）</option>
          <option value="combined">混合模式（后端 + 本地数据）</option>
        </select>
      </div>
      <button 
        class="rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-(--text) bg-white/12 border border-white/6 shadow-none active:translate-y-px active:shadow-none"
        @click="showAddModal = true"
      >
        添加元素
      </button>
    </div>

    <!-- 工具栏 -->
    <div class="flex flex-wrap gap-3 mb-[18px]">
      <button id="start-btn" 
        class="rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-[#0b1224] border-none bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] active:translate-y-px active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none" 
        :disabled="isDrawing" @click="handleStartDraw">
        开始选择
      </button>
      <button class="rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-(--text) bg-white/12 border border-white/6 shadow-none active:translate-y-px active:shadow-none" @click="handleRefresh">刷新列表</button>

      <div class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/6 cursor-pointer select-none transition-all hover:bg-white/6 hover:border-white/10" @click="toggleNoRepeatMode">
        <input type="checkbox" :checked="noRepeatMode" class="w-11 h-6 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors duration-300 checked:bg-(--primary) before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform before:duration-300 before:shadow-[0_2px_4px_rgba(0,0,0,0.2)] checked:before:translate-x-5" @click.stop @change="toggleNoRepeatMode">
        <label class="text-(--text) text-sm cursor-pointer">无放回模式</label>
      </div>

      <div class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/4 border border-white/6 text-sm">
        <label for="speed-slider" class="text-(--muted)">抽奖速度：</label>
        <input type="range" id="speed-slider" min="1" max="8" :value="drawSpeed" step="0.5" 
          class="flex-1 min-w-[120px] h-1.5 appearance-none bg-white/10 rounded-lg cursor-pointer accent-(--primary)" 
          @input="handleSpeedChange">
        <span class="text-(--primary) font-semibold min-w-[45px] text-right">{{ drawSpeed }}秒</span>
      </div>

      <button v-if="hasDrawn" class="rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-(--text) bg-white/12 border border-white/6 shadow-none active:translate-y-px active:shadow-none" @click="resetDrawn">
        重置已抽取
      </button>
    </div>

    <!-- 状态提示 -->
    <div :class="['px-3.5 py-3 rounded-xl bg-white/6 border border-white/5 text-sm flex items-center gap-2.5 mb-3.5', 
      statusType === 'ok' ? 'text-(--success)' : statusType === 'err' ? 'text-(--danger)' : 'text-(--muted)']">
      <span :class="['w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.7)]', 
        statusType === 'ok' ? 'bg-(--success)' : statusType === 'err' ? 'bg-(--danger)' : 'bg-(--primary)']"></span>
      {{ statusText }}
    </div>

    <!-- 主内容区 -->
    <div class="grid grid-cols-1 min-[881px]:grid-cols-[1fr_320px] gap-4">
      <!-- 候选列表 -->
      <section class="bg-white/4 border border-white/5 rounded-[14px] p-4">
        <h3 class="m-0 text-[17px] text-(--text)">候选列表</h3>
        <div v-if="hasItems" class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 p-3 max-h-[50dvh] overflow-y-auto scrollbar-hide">
          <div v-for="(item, idx) in items" :key="idx" 
            :class="['flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/6 text-(--text) transition-all duration-150 wrap-break-word group', 
              { 'border-(--primary)/80! shadow-[0_4px_12px_rgba(34,211,238,0.35)] -translate-y-0.5 scale-103 bg-(--primary)/12! z-10': currentHighlightIndex === idx },
              { 'opacity-40 bg-white/2 border-white/3 pointer-events-none': drawnIndices.has(idx) }]">
            <span :class="['w-[30px] h-[30px] rounded-[10px] inline-flex items-center justify-center font-bold text-[13px] transition-all duration-150', 
              drawnIndices.has(idx) ? 'bg-gray-500/20 text-gray-500/60' : currentHighlightIndex === idx ? 'bg-(--primary)! text-white! scale-105 shadow-[0_2px_8px_rgba(34,211,238,0.4)]' : 'bg-(--primary)/20 text-(--primary)']">{{ idx + 1 }}</span>
            <span class="flex-1 break-all">{{ item }}</span>
            <button 
              v-if="dataMode !== 'backend'"
              class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-(--danger)/20 border border-(--danger)/30 text-(--danger) hover:bg-(--danger)/30 cursor-pointer flex items-center justify-center transition-all duration-200"
              @click="deleteLocalItem(idx)"
              title="删除此元素"
            >
              🗑️
            </button>
          </div>
        </div>
        <p v-else class="text-(--muted) text-[13px]">
          列表为空，请点击右上角「添加元素」或批量导入。
        </p>
      </section>

      <!-- 结果面板 -->
      <section class="bg-white/4 border border-white/5 rounded-[14px] p-4 flex flex-col">
        <h3 class="m-0 mb-2.5 text-[17px] text-(--text)">最终结果</h3>
        <div class="bg-linear-to-br from-(--primary)/12 to-(--accent)/12 border border-(--primary)/35 rounded-[14px] p-[18px] min-h-[140px] flex flex-col justify-center gap-2.5 text-center flex-1">
          <div v-if="selectedWinner" class="text-(--muted) tracking-[0.4px]">本轮选中</div>
          <div v-else class="text-(--muted) tracking-[0.4px]">点击「开始」随机选出一项</div>

          <div class="text-[32px] font-extrabold text-(--primary) [text-shadow:0_6px_24px_rgba(34,211,238,0.3)] wrap-break-word">{{ selectedWinner || '—' }}</div>

          <div v-if="noRepeatMode && hasDrawn" class="text-(--muted) text-[13px]">
            已抽取 {{ drawnIndices.size }}/{{ items.length }} 项
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- 添加元素弹窗 -->
  <div v-if="showAddModal" class="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click="showAddModal = false">
    <div class="w-full max-w-[500px] bg-[#1e293b] rounded-[18px] border border-white/10 shadow-2xl overflow-hidden" @click.stop>
        <!-- 标题 -->
        <div class="flex justify-between items-center p-5 border-b border-white/10">
          <h3 class="text-xl font-bold text-(--text) m-0">添加抽奖元素</h3>
          <button class="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-(--muted) hover:text-(--text) hover:bg-white/10 cursor-pointer flex items-center justify-center transition-all" @click="showAddModal = false">
            ✕
          </button>
        </div>

        <!-- 内容 -->
        <div class="p-5">
          <label class="block text-sm text-(--muted) mb-2">
            输入元素（支持多个元素，使用以下方式分隔）：
          </label>
          <ul class="text-xs text-(--muted) mb-3 space-y-1">
            <li>• 回车换行</li>
            <li>• 逗号 ,</li>
            <li>• 分号 ;</li>
          </ul>
          <textarea 
            v-model="addItemsInput"
            placeholder="例如：&#10;张三&#10;李四&#10;王五"
            rows="8"
            class="w-full p-4 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-none focus:border-(--primary) focus:shadow-[0_0_0_1px_rgba(34,211,238,0.4)] resize-none scrollbar-hide"
            @keydown.meta.enter="handleBatchAdd"
          ></textarea>
          
          <!-- 提示信息 -->
          <div v-if="addMessage" :class="['mt-3 p-3 rounded-xl text-sm', 
            addMessageType === 'success' ? 'bg-(--success)/10 text-(--success) border border-(--success)/30' : 
            addMessageType === 'error' ? 'bg-(--danger)/10 text-(--danger) border border-(--danger)/30' : 
            'bg-white/5 text-(--muted) border border-white/10']">
            {{ addMessage }}
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex justify-end gap-3 p-5 border-t border-white/10 bg-white/2">
          <button 
            class="rounded-xl px-5 py-2.5 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-(--text) bg-white/10 border border-white/10 hover:bg-white/15"
            @click="showAddModal = false"
          >
            取消
          </button>
          <button 
            class="rounded-xl px-5 py-2.5 text-[15px] font-semibold cursor-pointer transition-all duration-150 text-white bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_8px_20px_rgba(34,211,238,0.25)] active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!addItemsInput.trim() || isAdding"
            @click="handleBatchAdd"
          >
            {{ isAdding ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePick } from './composables/usePick'
import { useAnimation } from './composables/useAnimation'
import { addItems as apiAddItems } from './api'

const {
  items,
  drawnIndices,
  noRepeatMode,
  drawSpeed,
  isDrawing,
  statusText,
  statusType,
  selectedWinner,
  hasItems,
  hasDrawn,
  availableIndices,
  setStatus,
  loadItems,
  resetDrawn,
  toggleNoRepeatMode,
  updateSpeed,
  markAsDrawn,
  setWinner
} = usePick()

const {
  currentHighlightIndex,
  stopAnimation,
  spinToTarget
} = useAnimation()

// 添加元素相关状态
const showAddModal = ref(false)
const addItemsInput = ref('')
const addMessage = ref('')
const addMessageType = ref<'success' | 'error' | ''>('')
const isAdding = ref(false)

// 数据模式相关
const dataMode = ref<'backend' | 'local' | 'combined'>('backend')
const localItems = ref<string[]>([])
const BACKEND_ITEMS_KEY = 'pick_backend_items'
const LOCAL_ITEMS_KEY = 'pick_local_items'
const DATA_MODE_KEY = 'pick_data_mode'

// 从 localStorage 加载数据模式和临时数据
function loadFromStorage() {
  // 加载数据模式
  const savedMode = localStorage.getItem(DATA_MODE_KEY) as 'backend' | 'local' | 'combined'
  if (savedMode && ['backend', 'local', 'combined'].includes(savedMode)) {
    dataMode.value = savedMode
  }
  
  // 加载临时数据
  const savedLocalItems = localStorage.getItem(LOCAL_ITEMS_KEY)
  if (savedLocalItems) {
    try {
      localItems.value = JSON.parse(savedLocalItems)
    } catch (e) {
      console.error('Failed to load local items:', e)
      localItems.value = []
    }
  }
}

// 保存临时数据到 localStorage
function saveLocalItems() {
  localStorage.setItem(LOCAL_ITEMS_KEY, JSON.stringify(localItems.value))
}

// 保存数据模式到 localStorage
function saveDataMode() {
  localStorage.setItem(DATA_MODE_KEY, dataMode.value)
}

// 根据模式更新显示的列表
async function updateItemsByMode() {
  if (dataMode.value === 'backend') {
    // 只使用后端数据
    await loadItems()
  } else if (dataMode.value === 'local') {
    // 只使用本地数据
    items.value = [...localItems.value]
  } else if (dataMode.value === 'combined') {
    // 后端 + 本地数据
    const backendItems = JSON.parse(localStorage.getItem(BACKEND_ITEMS_KEY) || '[]')
    items.value = [...backendItems, ...localItems.value]
  }
}

// 处理模式变化
async function handleModeChange() {
  saveDataMode()
  await updateItemsByMode()
  setStatus(`已切换到${dataMode.value === 'backend' ? '后端数据' : dataMode.value === 'local' ? '临时数据' : '追加模式'}模式`)
}

// 删除本地元素
function deleteLocalItem(index: number) {
  let itemToDelete: string
  let localIndex: number
  
  if (dataMode.value === 'local') {
    // 纯本地模式：直接使用索引
    itemToDelete = localItems.value[index]
    localIndex = index
  } else if (dataMode.value === 'combined') {
    // 追加模式：需要找到在 localItems 中的索引
    const backendItems = JSON.parse(localStorage.getItem(BACKEND_ITEMS_KEY) || '[]')
    const backendCount = backendItems.length
    
    if (index < backendCount) {
      // 删除的是后端数据，不允许
      setStatus('后端数据无法删除', 'err')
      return
    }
    
    localIndex = index - backendCount
    itemToDelete = localItems.value[localIndex]
  } else {
    // 后端模式：不应该出现删除按钮
    return
  }
  
  if (!confirm(`确定删除元素 "${itemToDelete}"？`)) {
    return
  }
  
  // 从本地数组中删除
  localItems.value.splice(localIndex, 1)
  saveLocalItems()
  
  // 刷新列表
  updateItemsByMode()
  setStatus(`已删除元素：${itemToDelete}`, 'ok')
}

// 刷新列表（根据当前模式）
async function handleRefresh() {
  if (dataMode.value === 'backend') {
    // 后端模式：重新加载后端数据
    await loadItems()
    localStorage.setItem(BACKEND_ITEMS_KEY, JSON.stringify(items.value))
    setStatus('后端数据已刷新', 'ok')
  } else if (dataMode.value === 'local') {
    // 本地模式：从 localStorage 重新加载
    const savedLocalItems = localStorage.getItem(LOCAL_ITEMS_KEY)
    if (savedLocalItems) {
      try {
        localItems.value = JSON.parse(savedLocalItems)
      } catch (e) {
        console.error('Failed to load local items:', e)
        localItems.value = []
      }
    }
    items.value = [...localItems.value]
    setStatus('本地数据已刷新', 'ok')
  } else if (dataMode.value === 'combined') {
    // 追加模式：重新加载后端 + 本地
    await loadItems()
    localStorage.setItem(BACKEND_ITEMS_KEY, JSON.stringify(items.value))
    const backendItems = JSON.parse(localStorage.getItem(BACKEND_ITEMS_KEY) || '[]')
    items.value = [...backendItems, ...localItems.value]
    setStatus('追加数据已刷新', 'ok')
  }
}

// 处理速度变化
function handleSpeedChange(e: Event) {
  const target = e.target as HTMLInputElement
  updateSpeed(parseFloat(target.value))
}

// 批量添加元素
async function handleBatchAdd() {
  if (!addItemsInput.value.trim()) {
    return
  }

  isAdding.value = true
  addMessage.value = ''
  addMessageType.value = ''

  try {
    // 所有模式都只添加到本地存储
    const input = addItemsInput.value.trim()
    const newItems = input.split(/[\n\r,;]+/).map(s => s.trim()).filter(s => s)
    
    let addedCount = 0
    let duplicates = 0
    
    newItems.forEach(item => {
      if (localItems.value.includes(item)) {
        duplicates++
      } else {
        localItems.value.push(item)
        addedCount++
      }
    })
    
    saveLocalItems()
    
    if (addedCount > 0) {
      addMessage.value = `成功添加 ${addedCount} 个元素`
      addMessageType.value = 'success'
      addItemsInput.value = ''
      updateItemsByMode()
      setTimeout(() => {
        showAddModal.value = false
      }, 1000)
    }
    
    if (duplicates > 0) {
      addMessage.value = `添加了 ${addedCount} 个元素，${duplicates} 个重复项已跳过`
      addMessageType.value = addedCount > 0 ? 'success' : ''
    }
  } catch (error) {
    addMessage.value = (error as Error).message || '添加失败'
    addMessageType.value = 'error'
  } finally {
    isAdding.value = false
  }
}

// 开始抽奖
async function handleStartDraw() {
  if (!hasItems.value) {
    setStatus('列表为空，请先添加候选项', 'err')
    return
  }

  if (availableIndices.value.length === 0) {
    setStatus('所有项目已抽取完毕，请点击「重置已抽取」或刷新列表', 'err')
    return
  }

  isDrawing.value = true
  setStatus('正在选择...')
  stopAnimation()

  try {
    // 从可用索引中随机选择
    const randomPos = Math.floor(Math.random() * availableIndices.value.length)
    const targetIndex = availableIndices.value[randomPos]
    const winner = items.value[targetIndex]

    // 计算速度因子
    const speedFactor = drawSpeed.value / 3

    // 执行动画
    await spinToTarget(targetIndex, availableIndices.value, speedFactor)

    // 标记为已抽取
    markAsDrawn(targetIndex)

    // 设置结果
    setWinner(winner)
    setStatus('选择完成！', 'ok')
  } catch (error) {
    stopAnimation()
    setStatus((error as Error).message || '随机选择失败', 'err')
  } finally {
    isDrawing.value = false
  }
}

// 初始化
onMounted(async () => {
  // 加载存储的数据模式和临时数据
  loadFromStorage()
  
  // 初始加载后端数据并缓存
  await loadItems()
  // 缓存后端数据到 localStorage
  localStorage.setItem(BACKEND_ITEMS_KEY, JSON.stringify(items.value))
  // 根据模式更新显示
  await updateItemsByMode()
})
</script>

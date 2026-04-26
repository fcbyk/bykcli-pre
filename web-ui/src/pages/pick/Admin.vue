<template>
  <main class="flex gap-5 w-full max-w-[1200px] h-screen p-8 max-[900px]:p-0 max-[900px]:pt-14 mx-auto items-start box-border max-[900px]:flex-col max-[900px]:items-stretch max-[900px]:overflow-x-hidden">
    <!-- 移动端标题栏 -->
    <header class="hidden max-[900px]:flex fixed top-0 left-0 w-full h-14 bg-[#1e293b]/90 backdrop-blur-sm z-990 px-3 items-center justify-between border-b border-white/5 box-border">
      <button class="flex max-[900px]:flex w-10 h-10 rounded-xl bg-transparent border-none text-(--text) text-xl cursor-pointer items-center justify-center" @click="isSidebarOpen = true">
        <span class="icon">☰</span>
      </button>
      <h1 class="text-[17px] font-semibold m-0 text-(--text) tracking-[0.5px]">管理后台</h1>
      <div class="w-10"></div>
    </header>

    <!-- 侧边栏遮罩层 -->
    <div 
      v-if="isSidebarOpen" 
      class="hidden max-[900px]:block fixed top-0 left-0 w-screen h-screen bg-black/50 backdrop-blur-xs z-998" 
      @click="isSidebarOpen = false"
    ></div>

    <!-- 侧边栏 -->
    <aside :class="['w-[240px] h-full shrink-0 bg-[#1e293b]/90 py-5 flex flex-col transition-transform duration-300 ease-out rounded-[18px] border border-white/5 shadow-(--shadow) backdrop-blur-md max-[900px]:fixed max-[900px]:left-0 max-[900px]:top-0 max-[900px]:bottom-0 max-[900px]:z-1000 max-[900px]:w-[260px] max-[900px]:h-screen max-[900px]:rounded-r-[20px] max-[900px]:rounded-l-none max-[900px]:shadow-none max-[900px]:invisible max-[900px]:transition-[transform,visibility]', { 'max-[900px]:translate-x-0 max-[900px]:shadow-[10px_0_30px_rgba(0,0,0,0.4)] max-[900px]:visible': isSidebarOpen, 'max-[900px]:-translate-x-full': !isSidebarOpen }]">
      <div class="px-5 pb-4 border-b border-white/5 mb-3 flex items-center justify-between">
        <h2 class="text-lg m-0 text-(--primary) tracking-[1px] font-bold">管理后台</h2>
        <button class="hidden max-[900px]:block bg-transparent border-none text-(--muted) text-2xl cursor-pointer p-1" @click="isSidebarOpen = false">×</button>
      </div>
      <nav class="flex flex-col gap-1 px-2.5 flex-1 overflow-y-auto scrollbar-hide">
        <button
          :class="['flex items-center gap-3 px-4 py-3 border-none bg-transparent text-(--text) rounded-xl cursor-pointer transition-all duration-200 text-[15px] text-left w-full hover:bg-white/5', { 'bg-(--primary)/15! text-(--primary)! font-semibold': activeTab === 'codes' }]"
          @click="selectTab('codes')"
        >
          <span class="text-lg">🎟️</span>
          抽奖码管理
        </button>
        <button
          :class="['flex items-center gap-3 px-4 py-3 border-none bg-transparent text-(--text) rounded-xl cursor-pointer transition-all duration-200 text-[15px] text-left w-full hover:bg-white/5', { 'bg-(--primary)/15! text-(--primary)! font-semibold': activeTab === 'free' }]"
          @click="selectTab('free')"
        >
          <span class="text-lg">🎲</span>
          自由抽奖
        </button>
        <button class="mt-auto text-(--text) border-t border-white/5 rounded-none pt-4 flex items-center gap-3 px-4 py-3 bg-transparent cursor-pointer transition-all duration-200 text-[15px] text-left w-full hover:text-(--danger)" @click="handleLogout">
          退出登录
        </button>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <div class="flex-1 h-full min-w-0 overflow-hidden max-[900px]:p-0 max-[900px]:flex max-[900px]:flex-col max-[900px]:h-auto max-[900px]:min-h-0">
      <!-- 抽奖码管理面板 -->
      <section v-if="activeTab === 'codes'" class="w-full h-full bg-[#1e293b]/90 p-6 box-border flex flex-col rounded-[18px] border border-white/5 shadow-(--shadow) backdrop-blur-md max-[900px]:rounded-none max-[900px]:border-none max-[900px]:p-4 max-[900px]:flex-1 max-[900px]:h-full">
        <div class="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <!-- 统计条 -->
          <div class="grid grid-cols-3 gap-3 mb-4 max-[900px]:gap-2">
            <div class="bg-white/5 border border-white/8 rounded-[14px] p-3 text-center max-[900px]:py-2 max-[900px]:px-1 max-[900px]:rounded-[10px]">
              <div class="text-xs text-(--muted)">总数</div>
              <div class="text-[22px] font-extrabold mt-1 max-[900px]:text-lg">{{ stats.total }}</div>
            </div>
            <div class="bg-white/5 border border-white/8 rounded-[14px] p-3 text-center max-[900px]:py-2 max-[900px]:px-1 max-[900px]:rounded-[10px]">
              <div class="text-xs text-(--muted)">已使用</div>
              <div class="text-[22px] font-extrabold mt-1 max-[900px]:text-lg text-(--accent)">{{ stats.used }}</div>
            </div>
            <div class="bg-white/5 border border-white/8 rounded-[14px] p-3 text-center max-[900px]:py-2 max-[900px]:px-1 max-[900px]:rounded-[10px]">
              <div class="text-xs text-(--muted)">剩余</div>
              <div class="text-[22px] font-extrabold mt-1 max-[900px]:text-lg text-(--primary)">{{ stats.left }}</div>
            </div>
          </div>

          <!-- 新增兑换码 + 快捷操作 -->
          <div class="mb-4 p-4 bg-white/4 border border-white/8 rounded-[14px] max-[900px]:p-3">
            <div class="flex gap-2 items-center flex-nowrap max-[900px]:flex-wrap max-[900px]:gap-2">
              <input
                v-model="newCode"
                type="text"
                placeholder="请输入兑换码"
                maxlength="20"
                class="flex-1 min-w-[120px] m-0 p-3 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-none focus:border-(--primary) focus:shadow-[0_0_0_1px_rgba(34,211,238,0.4)] max-[900px]:min-w-full"
                @keypress.enter="handleAddCode"
              />
              <div class="flex gap-2 items-center flex-nowrap max-[900px]:w-full max-[900px]:gap-1.5">
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224] max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleAddCode">新增</button>
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224] max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleGenCodes">批量生成</button>
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15 max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleExportCodes">导出</button>
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-(--danger)/20 border border-(--danger)/30 text-(--danger) hover:bg-(--danger)/30 max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleClearCodes">清空</button>
              </div>
            </div>

            <div class="mt-2 flex gap-3 flex-wrap items-center">
              <div :class="['text-[13px] min-h-[18px]', { 'text-(--success)': addCodeMsgType === 'success', 'text-(--danger)': addCodeMsgType === 'error' }]">{{ addCodeMsg }}</div>
              <div :class="['text-xs min-h-[16px] text-(--muted)', { 'text-(--success)': genMsgType === 'success', 'text-(--danger)': genMsgType === 'error' }]">{{ genMsg }}</div>
              <div :class="['text-xs min-h-[16px] text-(--muted)', { 'text-(--success)': exportMsgType === 'success', 'text-(--danger)': exportMsgType === 'error' }]">{{ exportMsg }}</div>
              <div :class="['text-xs min-h-[16px] text-(--muted)', { 'text-(--success)': clearMsgType === 'success', 'text-(--danger)': clearMsgType === 'error' }]">{{ clearMsg }}</div>
            </div>
          </div>

          <!-- 列表 -->
          <div class="mt-2 rounded-[14px] overflow-hidden border border-white/5">
            <div class="flex items-center gap-3 px-3.5 py-3 border-b border-white/5 last:border-none max-[700px]:flex-wrap max-[700px]:justify-between" v-for="codeInfo in codes" :key="codeInfo.code">
              <!-- 兑换码 -->
              <div :class="['text-[15px] sm:text-[17px] min-w-[80px]', { 'text-(--muted)': codeInfo.used }]">
                <span v-if="codeInfo.used || isCodeRevealed(codeInfo.code)" class="bg-white/15 rounded-lg px-3 py-1.5">
                  {{ codeInfo.code }}
                </span>
                <span v-else class="bg-white/15 rounded-lg px-3 py-1.5">
                  {{ maskCode(codeInfo.code) }}
                </span>
              </div>

              <!-- 状态 (移动端靠右，桌面端紧跟兑换码) -->
              <div :class="['text-xs px-2.5 py-1 rounded-full bg-white/10 whitespace-nowrap max-[700px]:order-2', { 'text-(--success)': !codeInfo.used, 'text-(--danger)': codeInfo.used }]">
                {{ codeInfo.used ? '已使用' : '未使用' }}
              </div>

              <!-- 操作按钮 (桌面端靠右，移动端占满整行且按钮右对齐) -->
              <div class="flex-1 flex justify-end gap-2 whitespace-nowrap max-[700px]:w-full max-[700px]:order-3 max-[700px]:mt-1.5">
                <button
                  v-if="!codeInfo.used"
                  class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15"
                  @click="toggleReveal(codeInfo.code)"
                >
                  {{ isCodeRevealed(codeInfo.code) ? '隐藏' : '查看' }}
                </button>
                <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224]" @click="copyCode(codeInfo.code)">
                  {{ isCodeCopied(codeInfo.code) ? '已复制' : '复制' }}
                </button>
                <button
                  v-if="codeInfo.used"
                  class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15"
                  @click="handleResetCode(codeInfo.code)"
                >
                  重置
                </button>
                <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-(--danger)/20 border border-(--danger)/30 text-(--danger) hover:bg-(--danger)/30" @click="handleDeleteCode(codeInfo.code)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 自由抽奖管理面板 -->
      <section v-else-if="activeTab === 'free'" class="w-full h-full bg-[#1e293b]/90 p-6 box-border flex flex-col rounded-[18px] border border-white/5 shadow-(--shadow) backdrop-blur-md max-[900px]:rounded-none max-[900px]:border-none max-[900px]:p-4 max-[900px]:flex-1 max-[900px]:h-full">        
        <div class="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <!-- 统计条 -->
          <div class="grid grid-cols-1 gap-3 mb-4 max-[900px]:gap-2">
            <div class="bg-white/5 border border-white/8 rounded-[14px] p-3 text-center max-[900px]:py-2 max-[900px]:px-1 max-[900px]:rounded-[10px]">
              <div class="text-xs text-(--muted)">元素总数</div>
              <div class="text-[22px] font-extrabold mt-1 max-[900px]:text-lg text-(--primary)">{{ freeStats.total }}</div>
            </div>
          </div>

          <!-- 新增元素 + 批量操作 -->
          <div class="mb-4 p-4 bg-white/4 border border-white/8 rounded-[14px] max-[900px]:p-3">
            <div class="flex gap-2 items-center flex-nowrap max-[900px]:flex-wrap max-[900px]:gap-2">
              <input
                v-model="freeNewItem"
                type="text"
                placeholder="请输入元素"
                maxlength="100"
                class="flex-1 min-w-[120px] m-0 p-3 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-none focus:border-(--primary) focus:shadow-[0_0_0_1px_rgba(34,211,238,0.4)] max-[900px]:min-w-full"
                @keypress.enter="handleFreeAdd"
              />
              <div class="flex gap-2 items-center flex-nowrap max-[900px]:w-full max-[900px]:gap-1.5">
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224] max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleFreeAdd">添加</button>
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15 max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="showBatchInput = !showBatchInput">{{ showBatchInput ? '隐藏' : '批量添加' }}</button>
                <button class="whitespace-nowrap rounded-xl px-4 py-3 text-[15px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-(--danger)/20 border border-(--danger)/30 text-(--danger) hover:bg-(--danger)/30 max-[900px]:flex-1 max-[900px]:py-2 max-[900px]:px-2 max-[900px]:text-xs" @click="handleFreeClear">清空</button>
              </div>
            </div>

            <div class="mt-2 flex gap-3 flex-wrap items-center">
              <div :class="['text-[13px] min-h-[18px]', { 'text-(--success)': freeAddMsgType === 'success', 'text-(--danger)': freeAddMsgType === 'error' }]">{{ freeAddMsg }}</div>
              <div :class="['text-xs min-h-[16px] text-(--muted)', { 'text-(--success)': freeClearMsgType === 'success', 'text-(--danger)': freeClearMsgType === 'error' }]">{{ freeClearMsg }}</div>
            </div>

            <!-- 批量添加输入框 -->
            <div v-if="showBatchInput" class="mt-3">
              <textarea
                v-model="freeBatchInput"
                placeholder="每行一个元素，或使用逗号、分号分隔"
                rows="4"
                class="w-full m-0 p-3 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-none focus:border-(--primary) focus:shadow-[0_0_0_1px_rgba(34,211,238,0.4)] resize-none"
              ></textarea>
              <div class="mt-2 flex justify-end">
                <button class="rounded-xl px-4 py-2 text-[14px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224]" @click="handleFreeBatchAdd">确认添加</button>
              </div>
              <div :class="['text-xs mt-1 min-h-[16px]', { 'text-(--success)': freeBatchMsgType === 'success', 'text-(--danger)': freeBatchMsgType === 'error' }]">{{ freeBatchMsg }}</div>
            </div>
          </div>

          <!-- 列表 -->
          <div class="mt-2 rounded-[14px] overflow-hidden border border-white/5">
            <div class="flex items-center gap-3 px-3.5 py-3 border-b border-white/5 last:border-none max-[700px]:flex-wrap max-[700px]:justify-between" v-for="(item, index) in freeItems" :key="item">
              <!-- 元素内容 -->
              <div class="flex-1 min-w-0">
                <template v-if="editingIndex !== index">
                  <div :class="['text-[15px] sm:text-[17px] break-all', { 'text-(--muted)': editingIndex === index }]">
                    {{ item }}
                  </div>
                </template>
                <template v-else>
                  <input
                    v-model="freeEditingValue"
                    type="text"
                    class="w-full m-0 p-2 rounded-lg border border-slate-400/60 bg-slate-900/80 text-(--text) text-[15px] outline-none focus:border-(--primary)"
                    @keypress.enter="saveFreeEdit"
                    @keydown.esc="cancelFreeEdit"
                  />
                </template>
              </div>

              <!-- 操作按钮 -->
              <div class="flex gap-2 whitespace-nowrap max-[700px]:w-full max-[700px]:justify-end">
                <template v-if="editingIndex !== index">
                  <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15" @click="copyFreeItem(item)">
                    {{ isFreeItemCopied(item) ? '已复制' : '复制' }}
                  </button>
                  <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15" @click="startFreeEdit(index, item)">
                    编辑
                  </button>
                  <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-(--danger)/20 border border-(--danger)/30 text-(--danger) hover:bg-(--danger)/30" @click="handleFreeDelete(item)">删除</button>
                </template>
                <template v-else>
                  <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-(--success)/20 border border-(--success)/30 text-(--success) hover:bg-(--success)/30" @click="saveFreeEdit">
                    保存
                  </button>
                  <button class="rounded-xl px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15" @click="cancelFreeEdit">
                    取消
                  </button>
                </template>
              </div>
            </div>
            
            <!-- 空列表提示 -->
            <div v-if="!freeItems.length" class="text-center py-10 text-(--muted)">
              <span class="text-5xl block mb-4">📝</span>
              <p>暂无抽奖元素，请添加</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdmin } from './composables/useAdmin'
import { useFreePick } from './composables/useFreePick'

const router = useRouter()
const activeTab = ref<'codes' | 'free'>('codes')
const isSidebarOpen = ref(false)
const showBatchInput = ref(false)

function selectTab(tab: 'codes' | 'free') {
  activeTab.value = tab
  isSidebarOpen.value = false
}

const {
  codes,
  newCode,
  addCodeMsg,
  addCodeMsgType,
  stats,
  genMsg,
  genMsgType,
  clearMsg,
  clearMsgType,
  exportMsg,
  exportMsgType,
  maskCode,
  toggleReveal,
  copyCode,
  handleAddCode,
  handleGenCodes,
  handleDeleteCode,
  handleResetCode,
  handleClearCodes,
  handleExportCodes,
  isCodeRevealed,
  isCodeCopied,
  init,
  _stopPolling
} = useAdmin()

const {
  items: freeItems,
  newItem: freeNewItem,
  addMsg: freeAddMsg,
  addMsgType: freeAddMsgType,
  batchInput: freeBatchInput,
  batchMsg: freeBatchMsg,
  batchMsgType: freeBatchMsgType,
  clearMsg: freeClearMsg,
  clearMsgType: freeClearMsgType,
  editingIndex,
  editingValue: freeEditingValue,
  stats: freeStats,
  handleAddItem: handleFreeAdd,
  handleBatchAdd: handleFreeBatchAdd,
  handleDeleteItem: handleFreeDelete,
  handleClear: handleFreeClear,
  startEdit: startFreeEdit,
  saveEdit: saveFreeEdit,
  cancelEdit: cancelFreeEdit,
  copyItem: copyFreeItem,
  isItemCopied: isFreeItemCopied,
  init: initFreePick
} = useFreePick()

// 初始化（自动恢复登录状态）
onMounted(() => {
  init()
  initFreePick()
})

// 退出登录
function handleLogout() {
  sessionStorage.removeItem('admin_authed')
  sessionStorage.removeItem('admin_pw')
  _stopPolling()
  router.push('/')
}

// 页面卸载时停止轮询，避免后台持续请求
onUnmounted(() => {
  _stopPolling()
})
</script>

<style scoped>
:global(body) {
  overflow: hidden;
  height: 100vh;
  padding: 0 !important;
  margin: 0;
}

:global(#app) {
  width: 100%;
  height: 100%;
  display: block;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

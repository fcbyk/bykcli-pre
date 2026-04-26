<template>
  <main class="w-full max-w-[980px] p-6 bg-[#1e293b]/90 rounded-[18px] border border-white/5 shadow-(--shadow) backdrop-blur-md box-border min-[901px]:h-auto max-[900px]:h-full max-[900px]:w-full max-[900px]:overflow-y-auto max-[900px]:rounded-none">
    <h1 class="m-0 mb-2 text-2xl font-bold">文件抽奖</h1>
    <p class="text-sm text-(--muted) leading-6 mb-3.5">
      通过随机生成的 4 位抽奖码进行抽奖，每个抽奖码只能成功抽取一次。抽中的文件可无限次下载，用于课后给学生随机分配作品 / 素材。
    </p>

    <div class="flex gap-2.5 flex-wrap my-2.5 mb-4">
      <div class="flex flex-wrap gap-2 items-center">
        <input v-model="codeInput" type="text" placeholder="输入 4 位抽奖码" maxlength="10" :disabled="isDrawing"
          class="flex-1 min-w-0 max-w-[180px] p-2.5 rounded-xl border border-slate-400/60 bg-slate-900/80 text-(--text) text-sm outline-none placeholder:text-slate-400/90 focus:border-(--primary) focus:shadow-[0_0_0_1px_rgba(34,211,238,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
          @keyup.enter="handleStartDraw" />
        <button class="rounded-xl px-4 py-[11px] text-[15px] font-bold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-linear-to-br from-(--primary) to-(--accent) shadow-[0_12px_30px_rgba(34,211,238,0.18)] text-[#0b1224]" :disabled="isDrawing || !hasFiles" @click="handleStartDraw">
          使用抽奖码抽文件
        </button>
      </div>
      <div class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/6 text-sm">
        <label for="speed-slider" class="text-(--muted) whitespace-nowrap">抽奖速度：</label>
        <input id="speed-slider" type="range" min="1" max="8" :value="drawSpeed" step="0.5"
          class="w-[100px] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-(--primary)"
          @input="handleSpeedChange" />
        <span class="text-(--primary) font-bold min-w-[36px] text-right">{{ drawSpeed }}秒</span>
      </div>
      <button class="rounded-xl px-4 py-[11px] text-[15px] font-bold cursor-pointer transition-all duration-120 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed bg-white/10 border border-white/10 text-(--text) hover:bg-white/15" @click="loadFiles">刷新列表</button>
    </div>

    <div class="p-3.5 rounded-xl bg-white/6 border border-white/5 flex items-center justify-between gap-3 mb-3.5 flex-wrap">
      <div class="flex items-center gap-2.5 text-(--muted) text-sm">
        <span class="w-2.5 h-2.5 rounded-full bg-(--primary) shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
        <span>{{ statusText }}</span>
      </div>
      <div class="px-3 py-2 rounded-xl bg-white/8 text-(--text) font-bold text-sm">{{ counterText }}</div>
    </div>

    <div class="grid grid-cols-[1fr_320px] gap-4 max-[900px]:grid-cols-1">
      <section class="bg-white/4 border border-white/8 rounded-[18px] p-4 flex flex-col min-h-0">
        <h3 class="m-0 mb-3 text-[17px] font-bold">候选文件</h3>
        <div v-if="hasFiles" class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 max-h-[50dvh] overflow-y-auto pr-1 scrollbar-hide">
          <div v-for="(file, idx) in files" :key="idx" class="p-3 rounded-xl bg-white/5 border border-white/6 flex flex-col gap-2 break-all transition-all duration-150" :class="{ 'border-primary/50! shadow-[0_8px_18px_rgba(34,211,238,0.18)] -translate-y-px': currentHighlightIndex === idx }">
            <div class="font-bold text-(--text)">{{ file.name }}</div>
            <div class="text-(--muted) text-xs">大小：{{ formatSize(file.size) }}</div>
          </div>
        </div>
        <p v-else class="text-(--muted) text-[13px]" id="empty-hint">
          目录下没有可用文件，请检查命令行指定的路径。
        </p>
      </section>

      <section class="bg-white/4 border border-white/8 rounded-[18px] p-4 flex flex-col min-h-0">
        <h3 class="m-0 mb-3 text-[17px] font-bold">抽取结果</h3>
        <div class="p-5 bg-white/5 border border-white/8 rounded-[18px] flex flex-col gap-4">
          <div class="text-(--muted) tracking-[0.4px]">
            {{ selectedFile ? '本轮抽中' : '输入抽奖码并点击「使用抽奖码抽文件」随机选出一个文件' }}
          </div>
          <div class="text-[22px] font-extrabold text-(--primary) break-all">{{ selectedFile ? selectedFile.name : '—' }}</div>
          <a v-if="selectedFile && downloadUrl" :href="downloadUrl" download class="text-(--text) px-3 py-2.5 rounded-xl bg-white/12 border border-white/10 no-underline font-bold inline-flex gap-1.5 items-center w-fit">
            点击下载
          </a>
          <div v-if="selectedFile" class="text-(--muted) text-[13px]">
            大小：{{ formatSize(selectedFile.size) }}
          </div>
          <div class="text-(--muted) text-[13px]">{{ limitHint }}</div>
        </div>
        <div class="mt-3.5 pt-2.5 border-t border-slate-400/40">
          <div class="text-[13px] text-(--muted) mb-1.5">已抽中的文件（本页）：</div>
          <ul class="list-none p-0 m-0 max-h-40 overflow-y-auto text-[13px] text-(--muted) scrollbar-hide">
            <li v-if="!hasHistory" class="py-1 flex justify-between gap-2">暂无记录</li>
            <li v-else v-for="(item, idx) in history" :key="idx" class="py-1 flex justify-between gap-2">
              <a class="font-semibold text-(--text) break-all no-underline hover:underline" :href="`/api/files/download/${encodeURIComponent(item.name)}`" download>
                {{ item.name }}
              </a>
              <span class="whitespace-nowrap">{{ formatSize(item.size || 0) }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useFilePick } from './composables/useFilePick'
import { useAnimation } from './composables/useAnimation'

const {
  files,
  history,
  drawSpeed,
  isDrawing,
  statusText,
  selectedFile,
  downloadUrl,
  codeInput,
  hasFiles,
  hasHistory,
  counterText,
  limitHint,
  formatSize,
  loadFiles,
  startDraw,
  completeDraw,
  failDraw,
  updateSpeed,
  setStatus,
  init
} = useFilePick()

const {
  currentHighlightIndex,
  stopAnimation,
  spinToTarget
} = useAnimation()

// 处理速度变化
function handleSpeedChange(e: Event) {
  const target = e.target as HTMLInputElement
  updateSpeed(parseFloat(target.value))
}

// 开始抽奖
async function handleStartDraw() {
  if (!hasFiles.value) {
    return
  }

  try {
    stopAnimation()
    const result = await startDraw()
    if (!result) return

    // 执行动画
    setStatus('正在抽奖中...')
    if (result.targetIndex >= 0) {
      // 使用所有文件索引进行动画
      const allIndices = files.value.map((_, idx) => idx)
      const speedFactor = drawSpeed.value / 3
      await spinToTarget(result.targetIndex, allIndices, speedFactor)
    }

    // 动画完成后显示结果
    completeDraw(result.file, result.downloadUrl)
    result.updateHistory()
  } catch (error) {
    setStatus((error as Error).message || '抽取失败', 'err')
    failDraw()
  }
}

// 初始化
onMounted(() => {
  // 初始化数据
  init()

  // 监听页面显示事件
  window.addEventListener('pageshow', handlePageShow)
})

onUnmounted(() => {
  window.removeEventListener('pageshow', handlePageShow)
})

function handlePageShow() {
  loadFiles()
}
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

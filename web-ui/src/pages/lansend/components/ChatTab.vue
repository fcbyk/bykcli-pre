<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-y-auto p-2 md:py-2 md:px-0 flex flex-col gap-2" ref="messagesContainer">
      <div v-if="messages.length === 0" class="flex items-center justify-center h-full text-[#999] text-sm">
        <p>暂无消息，开始聊天吧～</p>
      </div>
      <template v-else>
        <div
          v-for="(msg, index) in messages"
          :key="msg.id"
        >
          <div
            v-if="shouldShowTimeLabel(msg, index)"
            class="text-center my-3 text-[12px] text-[#999]"
          >
            {{ formatTimeLabel(msg.timestamp) }}
          </div>
          
          <!-- 消息容器 -->
          <div
            class="block mb-1 px-[15px] w-full box-border group"
            :class="{ 'own-message': isOwnMessage(msg.ip) }"
          >
            <div class="flex gap-2 w-fit max-w-[70%] group-[.own-message]:flex-row-reverse group-[.own-message]:ml-auto">
              <div class="w-9 h-9 rounded-full bg-[#667eea] text-white flex items-center justify-center text-[12px] font-semibold flex-none group-[.own-message]:bg-[#f5576c]">
                {{ getAvatarText(msg.ip) }}
              </div>
              
              <div class="flex flex-col flex-1 min-w-0">
                <div class="text-[12px] text-[#999] mb-1 px-1 group-[.own-message]:text-right">{{ msg.ip }}</div>
                
                <div class="p-2.5 md:px-3.5 md:py-2.5 rounded-lg bg-[#f0f0f0] relative wrap-break-word max-w-full group-[.own-message]:bg-[#007bff] group-[.own-message]:text-white">
                  <div class="wrap-break-word whitespace-pre-wrap leading-relaxed">{{ msg.message }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <div class="flex gap-2 p-3 border-t border-[#e0e0e0] bg-white flex-none">
      <textarea
        v-model="inputMessage"
        class="text-box flex-1 px-2 py-1.5 border border-[#ddd] rounded-md text-sm outline-none font-inherit resize-none h-[35px] max-h-[132px] leading-relaxed overflow-y-auto box-border focus:border-[#007bff] disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
        placeholder="输入消息..."
        @keydown.enter.exact="handleEnterKey"
        @input="adjustTextareaHeight"
        :disabled="sending"
        rows="1"
        ref="textareaRef"
      ></textarea>
      <button
        type="button"
        class="px-4 py-2 bg-[#007bff] text-white border-none rounded cursor-pointer text-sm transition-colors duration-200 hover:enabled:bg-[#0056b3] disabled:bg-[#ccc] disabled:cursor-not-allowed"
        @click="sendMessage"
        :disabled="!canSend || sending"
      >
        {{ sending ? '发送中...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { getChatMessages, sendChatMessage } from '../api'
import type { ChatMessage } from '../types'

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const currentIp = ref('')
let pollInterval: number | null = null

const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && !sending.value
})

function isOwnMessage(ip: string): boolean {
  return ip === currentIp.value
}

function formatTimeLabel(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } else if (diffDays === 1) {
      return `昨天 ${date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } else if (diffDays < 7) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      return `星期${weekdays[date.getDay()]} ${date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    } else {
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  } catch {
    return timestamp
  }
}

function shouldShowTimeLabel(msg: ChatMessage, index: number): boolean {
  if (index === 0) {
    return true
  }
  
  // 如果与前一条消息的时间间隔超过5分钟，显示时间标签
  try {
    const currentTime = new Date(msg.timestamp).getTime()
    const prevTime = new Date(messages.value[index - 1].timestamp).getTime()
    const diffMinutes = (currentTime - prevTime) / (1000 * 60)
    return diffMinutes > 5
  } catch {
    return false
  }
}

function getAvatarText(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    const lastPart = parts[3]
    if (lastPart.length >= 2) {
      return lastPart.slice(-2)
    } else {
      return lastPart
    }
  }
  return ip.slice(-2) || '?'
}

async function loadMessages() {
  try {
    const data = await getChatMessages()
    if (data.current_ip && !currentIp.value) {
      currentIp.value = data.current_ip
    }
    
    const lastMessageId = messages.value.length > 0 ? messages.value[messages.value.length - 1].id : 0
    const newMessages = data.messages.filter((msg) => msg.id > lastMessageId)
    
    if (newMessages.length > 0) {
      messages.value = data.messages
      await nextTick()
      scrollToBottom()
    } else if (messages.value.length !== data.messages.length) {
      // 如果消息数量不同，说明有更新（可能是删除或其他操作）
      messages.value = data.messages
    }
  } catch (error) {
    console.error('加载消息失败:', error)
  }
}

async function sendMessage() {
  if (!canSend.value) return

  const messageText = inputMessage.value.trim()
  if (!messageText) return

  sending.value = true
  try {
    const response = await sendChatMessage(messageText)
    if (response.message && response.message.ip) {
      currentIp.value = response.message.ip
    }
    inputMessage.value = ''
    adjustTextareaHeight()

    await loadMessages()

    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        textareaRef.value?.focus()
      })
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送失败，请重试')
  } finally {
    sending.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleEnterKey(e: KeyboardEvent) {
  // Shift+Enter 换行，Enter 发送
  if (!e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function adjustTextareaHeight() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    const maxHeight = 132 // 对应 max-height: 132px
    const minHeight = 35 // 最小高度
    const newHeight = Math.max(minHeight, Math.min(textareaRef.value.scrollHeight, maxHeight))
    textareaRef.value.style.height = `${newHeight}px`
  }
}

onMounted(async () => {
  await loadMessages()
  // 每 2 秒轮询一次新消息
  pollInterval = window.setInterval(loadMessages, 2000)
  adjustTextareaHeight()
})

onBeforeUnmount(() => {
  if (pollInterval !== null) {
    clearInterval(pollInterval)
  }
})

// 监听消息变化，自动滚动到底部
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)

watch(
  () => inputMessage.value,
  () => {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
)
</script>

<style scoped>
.text-box::-webkit-scrollbar {
  width: 0px !important;
  height: 0px !important;
}
</style>
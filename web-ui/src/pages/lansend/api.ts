import type {
  ApiResponse,
  DirectoryData,
  VerifyUploadPasswordResponse,
  PreviewFile,
  UploadFileResponse,
  ChatMessage,
  ChatMessagesResponse,
  LansendConfig
} from './types'

/**
 * 获取配置信息
 */
export async function getLansendConfig(): Promise<LansendConfig> {
  const response = await fetch('/api/config')
  const result: ApiResponse<LansendConfig> = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || 'Failed to load config')
  }
  return result.data
}

/**
 * 获取目录数据
 */
export async function getDirectory(path: string = ''): Promise<DirectoryData> {
  const response = await fetch(`/api/directory?path=${encodeURIComponent(path)}`)
  const result: ApiResponse<DirectoryData> = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || 'Failed to load directory')
  }
  return result.data
}

export async function downloadZip(paths: string[]): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch('/api/download-zip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ paths })
  })

  const contentType = response.headers.get('Content-Type') || ''
  if (!response.ok || contentType.includes('application/json')) {
    const result: ApiResponse = await response.json().catch(() => ({}))
    throw new Error(result?.message || 'download failed')
  }

  const disposition = response.headers.get('Content-Disposition') || ''
  let filename = 'download.zip'
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"/)
  if (match?.[1]) {
    filename = decodeURIComponent(match[1])
  } else if (match?.[2]) {
    filename = match[2]
  }

  const blob = await response.blob()
  return { blob, filename }
}

/**
 * 验证上传密码
 */
export async function verifyUploadPassword(password: string): Promise<VerifyUploadPasswordResponse> {
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `password=${encodeURIComponent(password)}`
    })

    const result: ApiResponse = await response.json()

    if (!response.ok || result.code !== 200) {
      return { success: false, error: result.message || '密码错误，请重试' }
    }

    return { success: true }
  } catch (error) {
    console.error('验证错误:', error)
    return { success: false, error: '验证失败，请重试' }
  }
}

/**
 * 获取文件内容（用于预览）
 */
export async function getFileContent(path: string): Promise<PreviewFile> {
  const response = await fetch(`/api/file/${encodeURIComponent(path)}`)
  const result: ApiResponse<PreviewFile> = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || 'Failed to load file')
  }
  return result.data
}

/**
 * 上传文件
 */
export function uploadFile(
  file: File,
  path: string,
  password: string | null,
  onProgress: (progress: number, meta?: { loaded: number; total: number }) => void,
  onCancel?: (cancelFn: () => void) => void
): Promise<UploadFileResponse> {
  return new Promise((resolve, reject) => {
    // 开始上传时初始化进度
    onProgress(0, { loaded: 0, total: file.size })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    formData.append('size', file.size.toString())
    if (password) {
      formData.append('password', password)
    }

    const xhr = new XMLHttpRequest()

    if (onCancel) {
      onCancel(() => {
        xhr.abort()
        resolve({ success: false, error: 'cancelled' })
      })
    }

    // progress 事件处理
    xhr.upload.addEventListener('progress', (e) => {
      // progress 事件处理
      const total = file.size || (e.lengthComputable && e.total > 0 ? e.total : 0)
      const loaded = Math.min(e.loaded, total || e.loaded)
      const progress = total === 0 ? 100 : (loaded / total) * 100
      onProgress(Math.min(99.9, Math.max(0, progress)), { loaded, total })
    })

    // 只有真正完成时才发 100%
    xhr.addEventListener('load', () => {
      onProgress(100, { loaded: file.size, total: file.size })
      if (xhr.status === 200) {
        try {
          const result: ApiResponse = JSON.parse(xhr.responseText)
          if (result.code !== 200) {
            resolve({ success: false, error: result.message, data: result.data })
          } else {
            resolve({ success: true, data: result.data })
          }
        } catch (error) {
          reject(new Error('解析响应错误'))
        }
      } else {
        reject(new Error(`上传错误: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('上传错误'))
    })

    xhr.open('POST', '/upload')
    xhr.send(formData)
  })
}

/**
 * 备用接口
 * 分片上传文件（避免 4GB 单请求体触发服务端/WSGI 限制）
 */
export async function uploadFileByChunks(
  file: File,
  path: string,
  password: string | null,
  onProgress: (progress: number) => void,
  options?: {
    chunkSize?: number
    concurrency?: number
    retry?: number
    retryDelayMs?: number
  }
): Promise<UploadFileResponse> {
  const chunkSize = options?.chunkSize ?? 8 * 1024 * 1024
  const concurrency = Math.max(1, options?.concurrency ?? 3)
  const retry = Math.max(0, options?.retry ?? 2)
  const retryDelayMs = Math.max(0, options?.retryDelayMs ?? 300)

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))

  // init
  const initForm = new FormData()
  initForm.append('filename', file.name)
  initForm.append('size', file.size.toString())
  initForm.append('path', path)
  initForm.append('chunk_size', chunkSize.toString())
  initForm.append('total_chunks', totalChunks.toString())
  if (password) initForm.append('password', password)

  const initResp = await fetch('/api/upload/init', {
    method: 'POST',
    body: initForm,
    headers: password ? { 'X-Upload-Password': password } : undefined
  })
  const initResult: ApiResponse = await initResp.json().catch(() => ({}))
  if (!initResp.ok || initResult.code !== 200) {
    return { success: false, error: initResult?.message || 'upload init failed', data: initResult?.data }
  }

  const uploadId: string = initResult.data?.upload_id
  if (!uploadId) {
    return { success: false, error: 'missing upload_id', data: initResult.data }
  }

  let uploadedBytes = 0
  const chunkUploaded = new Array(totalChunks).fill(false)

  const report = () => {
    const progress = file.size === 0 ? 100 : (uploadedBytes / file.size) * 100
    onProgress(Math.min(100, Math.max(0, progress)))
  }

  async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
  }

  async function putChunk(index: number) {
    const start = index * chunkSize
    const end = Math.min(file.size, start + chunkSize)
    const blob = file.slice(start, end)

    let attempt = 0
    while (true) {
      try {
        const resp = await fetch(`/api/upload/chunk?upload_id=${encodeURIComponent(uploadId)}&index=${index}`, {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'application/octet-stream',
            ...(password ? { 'X-Upload-Password': password } : {})
          }
        })
        const result: ApiResponse = await resp.json().catch(() => ({}))
        if (!resp.ok || result.code !== 200) {
          throw new Error(result?.message || `chunk ${index} failed`)
        }

        if (!chunkUploaded[index]) {
          chunkUploaded[index] = true
          uploadedBytes += (end - start)
          report()
        }
        return
      } catch (e) {
        if (attempt >= retry) throw e
        attempt++
        await sleep(retryDelayMs)
      }
    }
  }

  // 简单并发 worker
  let nextIndex = 0
  const workers: Promise<void>[] = []
  for (let w = 0; w < concurrency; w++) {
    workers.push(
      (async () => {
        while (true) {
          const i = nextIndex
          nextIndex++
          if (i >= totalChunks) return
          await putChunk(i)
        }
      })()
    )
  }

  try {
    report()
    await Promise.all(workers)
  } catch (e: any) {
    // abort
    try {
      await fetch('/api/upload/abort', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(password ? { 'X-Upload-Password': password } : {})
        },
        body: JSON.stringify({ upload_id: uploadId })
      })
    } catch {
      // ignore
    }
    return { success: false, error: e?.message || 'upload failed' }
  }

  // complete
  const completeResp = await fetch('/api/upload/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(password ? { 'X-Upload-Password': password } : {})
    },
    body: JSON.stringify({ upload_id: uploadId })
  })

  const completeResult: ApiResponse = await completeResp.json().catch(() => ({}))
  if (!completeResp.ok || completeResult.code !== 200) {
    return { success: false, error: completeResult?.message || 'upload complete failed', data: completeResult?.data }
  }

  return { success: true, data: completeResult.data }
}

/**
 * 获取聊天消息列表
 */
export async function getChatMessages(): Promise<ChatMessagesResponse> {
  const response = await fetch('/api/chat/messages')
  const result: ApiResponse<ChatMessagesResponse> = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || 'Failed to load chat messages')
  }
  return result.data
}

/**
 * 测速 - Ping
 */
export async function pingTest(): Promise<number> {
  const start = Date.now()
  await fetch('/api/config')
  return Date.now() - start
}

/**
 * 测速 - 下载
 */
export function downloadSpeedTest(
  sizeMb: number = 50,
  onProgress: (loaded: number, total: number, speed: number) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const startTime = Date.now()
    let lastTime = startTime
    let lastLoaded = 0
    const speeds: number[] = []

    xhr.open('GET', `/api/speedtest/download?size=${sizeMb}&t=${startTime}`)

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        const now = Date.now()
        const duration = (now - lastTime) / 1000
        if (duration >= 0.2) { // 每 200ms 计算一次瞬时速度
          const chunkLoaded = e.loaded - lastLoaded
          const instantSpeed = chunkLoaded / duration
          
          // 剔除前 500ms 的数据（TCP 慢启动阶段）
          if (now - startTime > 500) {
            speeds.push(instantSpeed)
          }

          onProgress(e.loaded, e.total, instantSpeed)
          lastTime = now
          lastLoaded = e.loaded
        }
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          // 如果样本太少，回退到总平均值
          const avgSpeed = speeds.length > 0 
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
            : (sizeMb * 1024 * 1024) / ((Date.now() - startTime) / 1000)
          resolve(avgSpeed)
        } else {
          reject(new Error(`Download failed with status ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Network error during download test'))
    xhr.ontimeout = () => reject(new Error('Download test timeout'))
    xhr.timeout = 60000
    xhr.send()
  })
}

/**
 * 测速 - 上传
 */
export function uploadSpeedTest(
  sizeMb: number = 30,
  onProgress: (loaded: number, total: number, speed: number) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const data = new Uint8Array(sizeMb * 1024 * 1024)
    for (let i = 0; i < 1024; i++) data[i] = Math.floor(Math.random() * 256)
    const blob = new Blob([data], { type: 'application/octet-stream' })

    const xhr = new XMLHttpRequest()
    const startTime = Date.now()
    let lastTime = startTime
    let lastLoaded = 0
    const speeds: number[] = []

    xhr.open('POST', `/api/speedtest/upload?t=${startTime}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const now = Date.now()
        const duration = (now - lastTime) / 1000
        if (duration >= 0.2) {
          const chunkLoaded = e.loaded - lastLoaded
          const instantSpeed = chunkLoaded / duration
          
          if (now - startTime > 500) {
            speeds.push(instantSpeed)
          }

          onProgress(e.loaded, e.total, instantSpeed)
          lastTime = now
          lastLoaded = e.loaded
        }
      }
    }

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const avgSpeed = speeds.length > 0 
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
            : blob.size / ((Date.now() - startTime) / 1000)
          resolve(avgSpeed)
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload test'))
    xhr.ontimeout = () => reject(new Error('Upload test timeout'))
    xhr.timeout = 60000
    xhr.send(blob)
  })
}

/**
 * 发送聊天消息
 */
export async function sendChatMessage(message: string): Promise<{ success: boolean; message: ChatMessage }> {
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })
  const result: ApiResponse<ChatMessage> = await response.json()
  if (!response.ok || result.code !== 200) {
    throw new Error(result.message || 'Failed to send message')
  }
  return { success: true, message: result.data }
}


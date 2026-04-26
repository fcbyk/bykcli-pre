import { ref, computed } from 'vue'
import { getFileContent } from '../api'
import type { PreviewFile, DirectoryItem } from '../types'

function isVideoFileName(name: string) {
  const lower = (name || '').toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')
}

function isVideoFile(file: Pick<PreviewFile, 'name' | 'is_video'>) {
  if (typeof file.is_video === 'boolean') return file.is_video
  return isVideoFileName(file.name)
}

export type LansendActiveTab = 'directory' | 'preview' | 'empty' | 'chat' | 'upload-details'

export function useLansendPreview() {
  const previewFile = ref<PreviewFile | null>(null)
  const previewLoading = ref(false)
  const previewError = ref('')
  const activeTab = ref<LansendActiveTab>('empty')

  const previewVideoLoading = ref(false)
  
  // 图片列表相关状态
  const imageFiles = ref<DirectoryItem[]>([])
  const currentImageIndex = ref<number>(-1)

  async function previewFileContent(path: string, name: string, allItems?: DirectoryItem[]) {
    previewLoading.value = true
    previewError.value = ''
    activeTab.value = 'preview'

    previewFile.value = {
      path,
      name
    }

    previewVideoLoading.value = false

    try {
      const fileData = await getFileContent(path)
      previewFile.value = fileData

      if (isVideoFile(fileData)) {
        previewVideoLoading.value = true
      }
      
      // 如果提供了所有项目，则设置图片列表
      if (allItems) {
        setupImageList(allItems, path)
      }
    } catch (err) {
      console.error('加载文件失败:', err)
      previewError.value = '无法加载文件内容'
      previewFile.value = {
        path,
        name,
        error: '无法加载文件内容'
      }
      previewVideoLoading.value = false
    } finally {
      previewLoading.value = false
    }
  }
  
  // 设置图片列表并找到当前图片的索引
  function setupImageList(items: DirectoryItem[], currentPath: string) {
    // 过滤出所有图片文件
    const images = items.filter(item => !item.is_dir && isImageFile(item.name))
    imageFiles.value = images
    
    // 找到当前图片在列表中的索引
    const index = images.findIndex(img => img.path === currentPath)
    currentImageIndex.value = index >= 0 ? index : -1
  }
  
  // 判断是否为图片文件
  function isImageFile(name: string): boolean {
    const lower = name.toLowerCase()
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || 
           lower.endsWith('.png') || lower.endsWith('.gif') || 
           lower.endsWith('.bmp') || lower.endsWith('.webp') ||
           lower.endsWith('.svg') || lower.endsWith('.tiff') ||
           lower.endsWith('.tif')
  }
  
  // 切换到上一张图片
  function prevImage() {
    if (imageFiles.value.length === 0 || currentImageIndex.value <= 0) return
    
    const newIndex = currentImageIndex.value - 1
    const prevImageFile = imageFiles.value[newIndex]
    
    // 更新当前索引
    currentImageIndex.value = newIndex
    
    // 预览新图片
    previewFileContent(prevImageFile.path, prevImageFile.name, imageFiles.value)
  }
  
  // 切换到下一张图片
  function nextImage() {
    if (imageFiles.value.length === 0 || currentImageIndex.value >= imageFiles.value.length - 1) return
    
    const newIndex = currentImageIndex.value + 1
    const nextImageFile = imageFiles.value[newIndex]
    
    // 更新当前索引
    currentImageIndex.value = newIndex
    
    // 预览新图片
    previewFileContent(nextImageFile.path, nextImageFile.name, imageFiles.value)
  }
  
  // 计算属性：是否可以切换到上一张/下一张
  const canGoPrev = computed(() => currentImageIndex.value > 0)
  const canGoNext = computed(() => currentImageIndex.value < imageFiles.value.length - 1 && currentImageIndex.value >= 0)

  function closePreview(opts?: { unUpload?: boolean }) {
    previewFile.value = null
    previewError.value = ''
    previewVideoLoading.value = false
    imageFiles.value = []
    currentImageIndex.value = -1

    const mobile = window.matchMedia('(max-width: 768px)').matches

    if (opts?.unUpload) {
      activeTab.value = mobile ? 'directory' : 'empty'
      return
    }

    if (activeTab.value === 'preview') {
      activeTab.value = mobile ? 'directory' : 'empty'
    }
  }

  function onPreviewVideoLoaded() {
    previewVideoLoading.value = false
  }

  function onPreviewVideoError() {
    previewVideoLoading.value = false
  }

  return {
    previewFile,
    previewLoading,
    previewError,
    activeTab,
    previewVideoLoading,
    previewFileContent,
    closePreview,
    onPreviewVideoLoaded,
    onPreviewVideoError,
    prevImage,
    nextImage,
    canGoPrev,
    canGoNext,
    currentImageIndex,
    imageFiles
  }
}

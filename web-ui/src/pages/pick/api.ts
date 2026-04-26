/**
 * Pick API 服务
 */

import type {
  PickApiResponse,
  FileListApiResponse,
  FilePickApiResponse,
  FileResultApiResponse,
  AdminCodesApiResponse,
  AdminAddCodeApiResponse,
  AdminGenCodesApiResponse,
  AdminDeleteCodeApiResponse,
  AdminClearCodesApiResponse,
  AdminResetCodeApiResponse,
  AdminExportCodesApiResponse,
  InfoApiResponse
} from './types'

/** 获取启动信息 */
export async function fetchInfo(): Promise<InfoApiResponse> {
  try {
    const response = await fetch('/api/info')
    const data: InfoApiResponse = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch info:', error)
    throw new Error((error as Error).message || '获取启动信息失败')
  }
}

/** 获取候选项列表 */
export async function fetchItems(): Promise<string[]> {
  try {
    const response = await fetch('/api/items')
    const data: PickApiResponse = await response.json()
    return Array.isArray(data.items) ? data.items : []
  } catch (error) {
    console.error('Failed to fetch items:', error)
    throw new Error('加载列表失败，请稍后重试')
  }
}

/** 添加单个元素 */
export async function addItem(item: string): Promise<void> {
  try {
    const response = await fetch('/api/items/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '添加失败')
    }
  } catch (error) {
    console.error('Failed to add item:', error)
    throw new Error((error as Error).message || '添加失败')
  }
}

/** 批量添加元素（支持回车分隔的字符串） */
export async function addItems(itemsStr: string): Promise<{ addedCount: number, duplicates: string[] }> {
  try {
    const response = await fetch('/api/items/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsStr })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '批量添加失败')
    }
    return {
      addedCount: data.added_count,
      duplicates: data.duplicates || []
    }
  } catch (error) {
    console.error('Failed to add items:', error)
    throw new Error((error as Error).message || '批量添加失败')
  }
}

/** 删除单个元素 */
export async function removeItem(item: string): Promise<void> {
  try {
    const response = await fetch('/api/items/remove', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '删除失败')
    }
  } catch (error) {
    console.error('Failed to remove item:', error)
    throw new Error((error as Error).message || '删除失败')
  }
}

/** 清空列表 */
export async function clearItems(): Promise<number> {
  try {
    const response = await fetch('/api/items/clear', {
      method: 'DELETE'
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '清空失败')
    }
    return data.cleared_count
  } catch (error) {
    console.error('Failed to clear items:', error)
    throw new Error((error as Error).message || '清空失败')
  }
}

/** 更新整个列表 */
export async function updateItems(items: string[]): Promise<void> {
  try {
    const response = await fetch('/api/items/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '更新失败')
    }
  } catch (error) {
    console.error('Failed to update items:', error)
    throw new Error((error as Error).message || '更新失败')
  }
}

/** 获取文件列表 */
export async function fetchFiles(): Promise<FileListApiResponse> {
  try {
    const response = await fetch('/api/files')
    const data: FileListApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '加载失败')
    }
    return data
  } catch (error) {
    console.error('Failed to fetch files:', error)
    throw new Error((error as Error).message || '加载文件列表失败，请稍后重试')
  }
}

/** 使用抽奖码抽文件 */
export async function pickFile(code: string): Promise<FilePickApiResponse> {
  try {
    const response = await fetch('/api/files/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data: FilePickApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '抽取失败')
    }
    return data
  } catch (error) {
    console.error('Failed to pick file:', error)
    throw new Error((error as Error).message || '抽取失败')
  }
}

/** 获取抽奖结果 */
export async function getFileResult(code: string): Promise<FileResultApiResponse> {
  try {
    const response = await fetch(`/api/files/result/${encodeURIComponent(code)}`)
    const data: FileResultApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '获取结果失败')
    }
    return data
  } catch (error) {
    console.error('Failed to get file result:', error)
    throw new Error((error as Error).message || '获取结果失败')
  }
}

/** 管理员登录 */
export async function adminLogin(password: string): Promise<void> {
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    if (!response.ok) {
      throw new Error('密码错误')
    }
  } catch (error) {
    console.error('Failed to login:', error)
    throw new Error((error as Error).message || '登录失败')
  }
}

/** 获取兑换码列表 */
export async function fetchAdminCodes(password: string): Promise<AdminCodesApiResponse> {
  try {
    const response = await fetch('/api/admin/codes', {
      headers: { 'X-Admin-Password': password }
    })
    const data: AdminCodesApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '获取列表失败')
    }
    return data
  } catch (error) {
    console.error('Failed to fetch admin codes:', error)
    throw new Error((error as Error).message || '获取列表失败')
  }
}

/** 新增兑换码 */
export async function addAdminCode(password: string, code: string): Promise<AdminAddCodeApiResponse> {
  try {
    const response = await fetch('/api/admin/codes/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': password
      },
      body: JSON.stringify({ code })
    })
    const data: AdminAddCodeApiResponse = await response.json()
    if (!response.ok) {
      throw new Error(data.error || (data as any).error || '添加失败')
    }
    return data
  } catch (error) {
    console.error('Failed to add admin code:', error)
    throw new Error((error as Error).message || '添加失败')
  }
}

/** 批量生成兑换码 */
export async function genAdminCodes(password: string, count: number): Promise<AdminGenCodesApiResponse> {
  try {
    const response = await fetch('/api/admin/codes/gen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': password
      },
      body: JSON.stringify({ count })
    })
    const data: AdminGenCodesApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '生成失败')
    }
    return data
  } catch (error) {
    console.error('Failed to gen admin codes:', error)
    throw new Error((error as Error).message || '生成失败')
  }
}

/** 删除兑换码 */
export async function deleteAdminCode(password: string, code: string): Promise<AdminDeleteCodeApiResponse> {
  try {
    const response = await fetch(`/api/admin/codes/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-Password': password
      }
    })
    const data: AdminDeleteCodeApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '删除失败')
    }
    return data
  } catch (error) {
    console.error('Failed to delete admin code:', error)
    throw new Error((error as Error).message || '删除失败')
  }
}

/** 清空兑换码 */
export async function clearAdminCodes(password: string, confirm: boolean): Promise<AdminClearCodesApiResponse> {
  try {
    const response = await fetch('/api/admin/codes/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': password
      },
      body: JSON.stringify({ confirm })
    })
    const data: AdminClearCodesApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '清空失败')
    }
    return data
  } catch (error) {
    console.error('Failed to clear admin codes:', error)
    throw new Error((error as Error).message || '清空失败')
  }
}

/** 重置兑换码为未使用 */
export async function resetAdminCode(password: string, code: string): Promise<AdminResetCodeApiResponse> {
  try {
    const response = await fetch(`/api/admin/codes/${encodeURIComponent(code)}/reset`, {
      method: 'POST',
      headers: {
        'X-Admin-Password': password
      }
    })
    const data: AdminResetCodeApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '重置失败')
    }
    return data
  } catch (error) {
    console.error('Failed to reset admin code:', error)
    throw new Error((error as Error).message || '重置失败')
  }
}

/** 导出兑换码 */
export async function exportAdminCodes(password: string): Promise<AdminExportCodesApiResponse> {
  try {
    const response = await fetch('/api/admin/codes/export', {
      headers: {
        'X-Admin-Password': password
      }
    })
    const data: AdminExportCodesApiResponse = await response.json()
    if (!response.ok) {
      throw new Error((data as any).error || '导出失败')
    }
    return data
  } catch (error) {
    console.error('Failed to export admin codes:', error)
    throw new Error((error as Error).message || '导出失败')
  }
}

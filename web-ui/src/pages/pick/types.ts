/**
 * Pick 页面类型定义
 */

/** API 响应 */
export interface PickApiResponse {
  items: string[]
}

/** 状态类型 */
export type StatusType = '' | 'ok' | 'err'

/** 动画阶段配置 */
export interface AnimationStage {
  steps: number
  delay: number
}

/** 文件信息 */
export interface FileInfo {
  name: string
  size: number
}

/** 文件列表 API 响应 */
export interface FileListApiResponse {
  files: FileInfo[]
  mode: 'code' | 'ip'
  used_codes?: number
  total_codes?: number
  draw_count?: number
  session_id: string
}

/** 文件抽奖 API 响应 */
export interface FilePickApiResponse {
  file: FileInfo
  code: string
  download_url: string
  mode: 'code' | 'ip'
  used_codes?: number
  total_codes?: number
  draw_count?: number
}

/** 文件抽奖结果 API 响应 */
export interface FileResultApiResponse {
  code: string
  file: FileInfo
  download_url: string
  timestamp: string
}

/** 历史记录项 */
export interface HistoryItem {
  name: string
  size: number
}

/** 兑换码信息 */
export interface CodeInfo {
  code: string
  used: boolean
}

/** 兑换码列表 API 响应 */
export interface AdminCodesApiResponse {
  codes: CodeInfo[]
  total_codes: number
  used_codes: number
  left_codes: number
}

/** 新增兑换码 API 响应 */
export interface AdminAddCodeApiResponse {
  success?: boolean
  code?: string
  message?: string
  error?: string
}

/** 批量生成兑换码 API 响应 */
export interface AdminGenCodesApiResponse {
  success?: boolean
  requested: number
  generated_count: number
  generated: string[]
  error?: string
}

/** 删除兑换码 API 响应 */
export interface AdminDeleteCodeApiResponse {
  success?: boolean
  code?: string
  was_used?: boolean
  error?: string
}

/** 清空兑换码 API 响应 */
export interface AdminClearCodesApiResponse {
  success?: boolean
  cleared?: number
  error?: string
}

/** 重置兑换码为未使用 API 响应 */
export interface AdminResetCodeApiResponse {
  success?: boolean
  code?: string
  storage_reset?: boolean
  error?: string
}

/** 导出兑换码 API 响应 */
export interface AdminExportCodesApiResponse {
  codes: CodeInfo[]
  total_codes: number
  used_codes: number
  left_codes: number
}

/** 启动信息 API 响应 */
export interface InfoApiResponse {
  files_mode: boolean
}

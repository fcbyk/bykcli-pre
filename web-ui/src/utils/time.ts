/**
 * 睡眠函数，结合 async / await 使用
 * @param ms 毫秒数
 * @returns Promise<void> 睡眠后 resolve
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function currentTime():string {
    return new Date().toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

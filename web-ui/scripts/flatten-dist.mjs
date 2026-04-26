import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { promises as fs } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function copyDir(src, dest) {
  await ensureDir(dest)
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = resolve(src, entry.name)
    const destPath = resolve(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath)
    }
  }
}

async function removeDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch (err) {
    // 忽略删除失败的错误
  }
}

async function removeFile(file) {
  try {
    await fs.unlink(file)
  } catch (err) {
    // 忽略删除失败的错误
  }
}

async function flatten() {
  const projectRoot = resolve(__dirname, '..')
  const distDir = resolve(projectRoot, 'dist')
  const pagesDir = resolve(distDir, 'src/pages')
  const assetsSrcDir = resolve(distDir, 'assets')
  const assetsDstDir = resolve(distDir, 'assets')

  try {
    // 确保 dist 存在
    await fs.access(distDir)
  } catch {
    console.error('[flatten-dist] dist 目录不存在，请先运行构建（pnpm build）')
    process.exit(1)
  }

  // 清理 dist 根目录下的旧 html 文件（保留 assets 目录）
  try {
    const distEntries = await fs.readdir(distDir, { withFileTypes: true })
    for (const entry of distEntries) {
      const entryPath = resolve(distDir, entry.name)
      if (entry.isFile() && entry.name.endsWith('.html')) {
        await removeFile(entryPath)
        console.log(`[flatten-dist] 已删除旧文件 ${entry.name}`)
      } else if (entry.isDirectory() && entry.name !== 'assets' && entry.name !== 'src') {
        await removeDir(entryPath)
        console.log(`[flatten-dist] 已删除旧目录 ${entry.name}`)
      }
    }
  } catch (err) {
    console.warn('[flatten-dist] 清理旧文件时出错：', err)
  }

  // 确保 assets 目录存在
  await ensureDir(assetsDstDir)

  // 如果 assets 在 dist 根目录，确保它保留；如果在其他地方，需要合并
  try {
    await fs.access(assetsSrcDir)
    // assets 目录已存在，无需操作
    console.log(`[flatten-dist] assets 目录已存在`)
  } catch {
    // assets 可能在其他位置，尝试从页面目录中查找并合并
    console.warn('[flatten-dist] assets 目录不在预期位置，尝试查找并合并')
  }

  // 处理每个页面的 index.html，生成扁平化的 html 文件
  try {
    const pageNames = await fs.readdir(pagesDir)

    for (const pageName of pageNames) {
      const pageDir = resolve(pagesDir, pageName)
      let stat
      try {
        stat = await fs.stat(pageDir)
      } catch {
        continue
      }
      if (!stat.isDirectory()) continue

      const htmlPath = resolve(pageDir, 'index.html')
      try {
        await fs.access(htmlPath)
      } catch {
        continue
      }

      let htmlContent = await fs.readFile(htmlPath, 'utf-8')

      // 把像 ../../../assets/xxx、../../assets/xxx 这类路径全部规范为 ./assets/xxx
      htmlContent = htmlContent.replace(
        /(["'(])((?:\.\.\/)+)assets\//g,
        '$1./assets/'
      )

      // 页面的输出文件名：使用文件夹名（保持原样，不转换 - 为 _）
      const flatHtmlPath = resolve(distDir, `${pageName}.html`)

      await fs.writeFile(flatHtmlPath, htmlContent, 'utf-8')
      console.log(`[flatten-dist] 已生成 ${pageName}.html`)
    }
  } catch (err) {
    console.warn('[flatten-dist] 处理页面时出错：', err)
  }

  // 删除 src 目录和其他多余目录
  const srcDir = resolve(distDir, 'src')
  await removeDir(srcDir)
  console.log(`[flatten-dist] 已删除 src 目录`)

  // 删除 static 目录（如果存在）
  const staticDir = resolve(distDir, 'static')
  await removeDir(staticDir)

  console.log('[flatten-dist] 扁平化处理完成')

  // 拷贝 dist 目录到后端 web/dist 目录
  const backendWebDir = resolve(projectRoot, '..', 'src', 'bykclipre', 'web')
  const backendDistDir = resolve(backendWebDir, 'dist')

  try {
    // 确保后端 web 目录存在（不存在则创建）
    await ensureDir(backendWebDir)
    
    // 清空或创建 dist 目录
    await removeDir(backendDistDir)
    await ensureDir(backendDistDir)
    
    // 拷贝 dist 目录的所有内容到后端 dist 目录
    await copyDir(distDir, backendDistDir)
    console.log(`[flatten-dist] 已拷贝 dist 到 ${backendDistDir}`)
  } catch (err) {
    console.warn('[flatten-dist] 拷贝到后端目录失败：', err)
  }
}

flatten().catch(err => {
  console.error('[flatten-dist] 执行失败：', err)
  process.exit(1)
})



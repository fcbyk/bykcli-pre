import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { readdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'
import os from 'os'

function getLocalNetworkAddress() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal
      ) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function getPageEntries() {
  const pagesDir = resolve(__dirname, 'src/pages')
  const entries: Record<string, string> = {}

  try {
    const pages = readdirSync(pagesDir)
    for (const page of pages) {
      const pagePath = resolve(pagesDir, page)
      if (statSync(pagePath).isDirectory()) {
        const htmlPath = resolve(pagePath, 'index.html')
        try {
          statSync(htmlPath)
          entries[page] = htmlPath
        } catch {
          // 跳过没有 index.html 的目录
        }
      }
    }
  } catch (error) {
    console.warn('扫描页面目录失败:', error)
  }

  return entries
}

const pageEntries = getPageEntries()

function mpaPlugin(): Plugin {
  return {
    name: 'mpa-plugin',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server) {
      // 服务器启动后打印所有页面路径
      server.httpServer?.once('listening', () => {
        const port = (server.config.server.port || 5173).toString()
        const rawHost = server.config.server.host
        const host =
          rawHost === '0.0.0.0' || rawHost === true
            ? getLocalNetworkAddress()
            : rawHost || 'localhost'
        const protocol = server.config.server.https ? 'https' : 'http'

        Object.keys(pageEntries).forEach(pageName => {
          console.log(`  ➜  ${pageName}:   ${protocol}://${host}:${port}/${pageName}/`)
        })
      })

      server.middlewares.use((req, _res, next) => {
        const url = decodeURIComponent((req as any).url || '')

        // 跳过静态资源和根路径
        const staticExtensions = ['.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map']
        if (staticExtensions.some(ext => url.includes(ext)) || url === '/' || url === '') {
          return next()
        }

        const pathParts = url.split('/').filter(Boolean)
        const pageName = pathParts[0]

        if (pageName && pageEntries[pageName]) {
          const htmlPath = pageEntries[pageName]
          const projectRoot = resolve(__dirname)

          // 访问页面根路径或前端路由路径（如 /pick/f），重写为 HTML 文件路径
          // 这样前端路由可以正常工作
          if (pathParts.length === 1 || (pathParts.length === 2 && pathParts[1] === '') || 
              (pathParts.length === 2 && !pathParts[1].includes('.'))) {
            // 第二个路径段不包含点号，可能是前端路由（如 /pick/f）
            let relativePath = htmlPath.replace(projectRoot, '').replace(/\\/g, '/')
            if (!relativePath.startsWith('/')) relativePath = '/' + relativePath
              ; (req as any).url = relativePath
          }
          // 访问页面目录下的资源，重写为实际路径
          else if (pathParts.length >= 2) {
            const pageDir = htmlPath.replace(/index\.html$/, '')
            const resourcePath = resolve(pageDir, pathParts.slice(1).join('/'))

            try {
              statSync(resourcePath)
              let relativePath = resourcePath.replace(projectRoot, '').replace(/\\/g, '/')
              if (!relativePath.startsWith('/')) relativePath = '/' + relativePath
                ; (req as any).url = relativePath
            } catch {
              // 资源不存在，可能是前端路由，返回 HTML 文件
              let relativePath = htmlPath.replace(projectRoot, '').replace(/\\/g, '/')
              if (!relativePath.startsWith('/')) relativePath = '/' + relativePath
                ; (req as any).url = relativePath
            }
          }
        }

        next()
      })
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    mpaPlugin(),
    vue()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  },
  build: {
    rollupOptions: {
      input: pageEntries
    }
  },
  server: {
    fs: {
      allow: ['..']
    },
    proxy: {
      // 代理 API 请求到后端
      '/api': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        secure: false
      },
      // 代理文件请求到后端（用于加载文件内容）
      // 匹配非静态资源和 Vite 内部路径的请求
      '^/(?!node_modules|src|assets|@vite|@id|@fs|@react-refresh|ide/|api/).*': {
        target: 'http://127.0.0.1:80',
        changeOrigin: true,
        secure: false,
        // 跳过静态资源和 Vite 内部路径
        bypass(req) {
          const url = req.url || ''
          // 如果是静态资源、Vite 内部路径或页面路由，不代理
          if (
            url.startsWith('/ide/') ||
            url.startsWith('/src/') ||
            url.startsWith('/node_modules/') ||
            url.startsWith('/@') ||
            url.startsWith('/api/') ||
            url.match(/\.(html|js|css|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i) ||
            url === '/' ||
            url === ''
          ) {
            return url
          }
          // 其他请求代理到后端
          return null
        }
      }
    }
  }
})

import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)

app.use(router)

// 等待路由就绪后再挂载应用
router.isReady().then(() => {
  app.mount('#app')
}).catch((error) => {
  console.error('[App] Router ready error:', error)
  app.mount('#app')
})

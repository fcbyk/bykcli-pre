import { createRouter, createWebHistory } from 'vue-router'
import Home from './Home.vue'
import ItemPick from './ItemPick.vue'
import FilePick from './FilePick.vue'
import Admin from './Admin.vue'

// 动态获取 base 路径
// 开发环境：路径包含 /pick/，base 是 /pick/
// 生产环境：路径是根目录，base 是 /
const getBasePath = () => {
  const path = window.location.pathname
  if (path.includes('/pick/')) {
    return '/pick/'
  }
  return '/'
}

const router = createRouter({
  history: createWebHistory(getBasePath()),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/item-pick',
      name: 'item-pick',
      component: ItemPick
    },
    {
      path: '/f',
      name: 'file-pick',
      component: FilePick
    },
    {
      path: '/admin',
      name: 'admin',
      component: Admin
    }
  ]
})

// 路由守卫：简化的守卫逻辑，只保留登录检查
router.beforeEach(async (to, _from, next) => {
  const normalizedPath = to.path
  
  // 管理后台登录检查
  if (normalizedPath === '/admin' && sessionStorage.getItem('admin_authed') !== '1') {
    // 未登录时跳转到主页，由主页弹窗提示登录
    next('/')
    return
  }
  
  next()
})

export default router


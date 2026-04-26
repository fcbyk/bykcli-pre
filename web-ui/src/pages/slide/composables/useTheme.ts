import { ref } from 'vue'

export function useTheme() {
  const isDark = ref(document.documentElement.classList.contains('dark'))
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyDarkMode = (dark: boolean) => {
    isDark.value = dark
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleDarkMode = () => {
    const newDark = !isDark.value
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
    applyDarkMode(newDark)
  }

  const handleThemeChange = (e: MediaQueryListEvent) => {
    // 只有在用户没有手动设置过主题时，才跟随系统
    if (!localStorage.getItem('theme')) {
      applyDarkMode(e.matches)
    }
  }

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      applyDarkMode(savedTheme === 'dark')
    } else {
      applyDarkMode(mediaQuery.matches)
    }
  }

  return {
    isDark,
    initTheme,
    toggleDarkMode,
    mediaQuery,
    handleThemeChange
  }
}

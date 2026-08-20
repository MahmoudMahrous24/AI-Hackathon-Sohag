import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('derma_theme') as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('derma_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3 transition"
      title={theme === 'dark' ? 'تفعيل الوضع المضيء (Light Mode)' : 'تفعيل الوضع الليلي (Dark Mode)'}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-teal" />}
    </button>
  )
}

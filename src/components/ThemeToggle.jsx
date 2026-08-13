import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'artfest-theme'

const readTheme = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="fixed top-4 right-14 sm:top-5 sm:right-20 lg:right-28 z-[69] flex h-10 w-10 items-center justify-center rounded-full border border-secondary/40 bg-white/10 text-mainText shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white/20"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
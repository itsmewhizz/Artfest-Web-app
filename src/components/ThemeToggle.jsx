import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'artfest-theme'

const getCurrentTheme = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getCurrentTheme)

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  useEffect(() => {
    setTheme(getCurrentTheme())
  }, [])

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="fixed top-4 right-12 sm:top-5 sm:right-[4.25rem] lg:right-20 z-[69] flex h-10 w-10 items-center justify-center rounded-full border border-secondary/40 bg-white/10 backdrop-blur text-mainText transition hover:bg-white/20 hover:scale-105"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
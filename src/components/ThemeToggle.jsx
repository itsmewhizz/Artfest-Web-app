import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'artfest-theme'

const readTheme = () => {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

const applyTheme = (theme) => {
  const root = document.documentElement
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else {
    root.removeAttribute('data-theme')
    root.classList.remove('dark')
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    setTheme(readTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
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
      className="fixed top-4 right-14 sm:top-5 sm:right-20 lg:right-28 z-[69] flex h-10 w-10 items-center justify-center rounded-full border border-subtle bg-white/85 text-mainText shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
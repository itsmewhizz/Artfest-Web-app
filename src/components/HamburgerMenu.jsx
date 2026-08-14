import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown } from 'lucide-react'

const pages = [
  { label: 'Home', path: '/' },
  { label: 'Results', path: '/results' },
]

const logins = [
  { label: 'Participant', path: '/student/login' },
  { label: 'Judges', path: '/judges/login' },
  { label: 'Admin', path: '/admin/login' },
  { label: 'Lots', path: '/lots' },
]

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [loginsOpen, setLoginsOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
    setPagesOpen(false)
    setLoginsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onMouseDown = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const resetMenu = () => {
    setOpen(false)
    setPagesOpen(false)
    setLoginsOpen(false)
  }

  const go = path => {
    resetMenu()
    navigate(path)
  }

  const goAbout = () => {
    resetMenu()
    if (location.pathname === '/') {
      setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 60)
    } else {
      navigate('/', { state: { scrollTo: 'about' } })
    }
  }

  if (location.pathname !== '/') return null

  const renderSection = (label, items, isOpen, onToggle) => (
    <div className="border-b border-secondary/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-mainText font-medium font-inter text-sm sm:text-base hover:bg-secondary/10 transition"
      >
        {label}
        <ChevronDown
          size={18}
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          color={isOpen ? '#7C4DFF' : '#676375'}
        />
      </button>
      {isOpen && (
        <div className="pb-2">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => go(item.path)}
              className={`block w-full text-left pl-8 pr-4 py-2.5 text-sm font-inter transition ${
                location.pathname === item.path
                  ? 'text-mainText bg-white/10'
                  : 'text-mutedText hover:text-mainText hover:bg-secondary/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div ref={menuRef} className="fixed top-4 right-4 sm:top-5 sm:right-8 lg:right-16 z-[70]">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex items-center justify-center p-1 text-mainText transition"
      >
        {open ? <X size={26} /> : <Menu size={26} />}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-card/95 border border-secondary/30 shadow-2xl overflow-hidden backdrop-blur">
          <div className="py-1">
            {renderSection('Pages', pages, pagesOpen, () => setPagesOpen(!pagesOpen))}
            {renderSection('Logins', logins, loginsOpen, () => setLoginsOpen(!loginsOpen))}
            <button
              onClick={goAbout}
              className="w-full px-4 py-3 text-left text-mainText font-medium font-inter text-sm sm:text-base hover:bg-secondary/10 transition"
            >
              About
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

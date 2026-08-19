import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, User, ShieldCheck, Gavel, Map } from 'lucide-react'

const LOGIN_OPTIONS = [
  { label: 'Participant', path: '/student/login', icon: User },
  { label: 'Judges', path: '/judges/login', icon: Gavel },
  { label: 'Admin', path: '/admin/login', icon: ShieldCheck },
  { label: 'Lots', path: '/lots', icon: Map },
]

export default function LoginControl() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const closeTimer = useRef(null)

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  useEffect(() => {
    if (!open) return
    const onMouseDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      clearCloseTimer()
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="relative inline-block text-left"
      onMouseEnter={() => {
        clearCloseTimer()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false)
        }}
        onClick={() => setOpen(v => !v)}
        className="glass-chip flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold shadow-sm hover:scale-[1.03]"
      >
        <span>Login</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
        className={`absolute right-0 mt-2 w-48 rounded-2xl bg-card border border-subtle shadow-xl overflow-hidden z-50 backdrop-blur-sm origin-top-right transition-all duration-200 ease-out ${
          open ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
        }`}
      >
        <div className="py-1">
          {LOGIN_OPTIONS.map(opt => (
            <button
              key={opt.path}
              onClick={() => {
                navigate(opt.path)
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs font-medium text-mainText hover:bg-lavender transition"
            >
              <opt.icon size={14} className="text-purple" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
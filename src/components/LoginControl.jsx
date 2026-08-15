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
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="relative inline-block text-left"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-subtle text-mainText text-xs font-semibold hover:bg-lavender transition shadow-sm"
      >
        <span>Login</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
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
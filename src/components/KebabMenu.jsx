import { useEffect, useRef, useState } from 'react'
import { MoreVertical } from 'lucide-react'

export default function KebabMenu({ items, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={`relative shrink-0 ${className}`} ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-mutedText hover:text-mainText transition p-1"
        aria-label="Actions"
        title="Actions"
      >
        <MoreVertical size={16} className="sm:w-4 sm:h-4" />
      </button>
      {open && (
        <div className={`absolute z-50 mt-1 min-w-[140px] bg-card rounded-xl border border-secondary/40 shadow-2xl overflow-hidden ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                item.onClick?.()
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition ${
                item.danger
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-mainText hover:bg-white/10'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
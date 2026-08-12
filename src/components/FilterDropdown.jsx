import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FilterDropdown({ label, options, value, onChange, className = '', dark = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)
  const displayLabel = selected ? selected.label : label

  if (dark) {
    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full bg-black/20 text-mainText rounded-xl px-4 py-2.5 text-sm border border-secondary/40 hover:bg-black/30 transition"
        >
          {selected?.icon && (
            <span className="shrink-0 flex items-center">{selected.icon}</span>
          )}
          <span className="flex-1 text-left truncate">{displayLabel}</span>
          <ChevronDown size={16} className={`text-mutedText transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-secondary/40 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition ${
                    value === option.value
                      ? 'text-mainText bg-white/10'
                      : 'text-mutedText hover:text-mainText hover:bg-white/10'
                  }`}
                >
                  {option.icon && (
                    <span className="shrink-0 flex items-center">{option.icon}</span>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full bg-white hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-black border border-black transition"
      >
        {selected?.icon && (
          <span className="shrink-0 flex items-center">{selected.icon}</span>
        )}
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <ChevronDown size={16} className={`text-black/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#CBDDE9] border border-black rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition ${
                  value === option.value
                    ? 'text-black bg-black/10'
                    : 'text-black/70 hover:text-black hover:bg-black/10'
                }`}
              >
                {option.icon && (
                  <span className="shrink-0 flex items-center">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
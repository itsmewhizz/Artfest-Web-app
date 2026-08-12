import { useEffect, useRef, useState } from 'react'
import TeamBreakdown, { shortCategoryLabel } from './TeamBreakdown'

export const CATEGORY_COLORS = {
  Minor:          { light: '#55EFC4', dark: '#00B894' },
  HS:             { light: '#FF7675', dark: '#D63031' },
  Premier:        { light: '#74B9FF', dark: '#0984E3' },
  'Sub Junior':   { light: '#A29BFE', dark: '#6C5CE7' },
  Junior:         { light: '#FDCB6E', dark: '#D68910' },
  'General Cat-A': { light: '#D1D5DB', dark: '#9CA3AF' },
  'General Cat-B': { light: '#FFFFFF', dark: '#F5F5F5' },
}

const STAGGER_MS = 150
const GROW_MS = 2250

export default function TeamBar({ team, categories, displayPoints, barHeight, isExpanded, onToggle, onViewDetails, index = 0 }) {
  const barRef = useRef(null)
  const targetRef = useRef(displayPoints)
  const startedRef = useRef(false)
  const [grown, setGrown] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    targetRef.current = displayPoints
  })

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setGrown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGrown(true)
          io.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!grown || startedRef.current) return
    startedRef.current = true
    const target = targetRef.current
    const start = performance.now() + index * STAGGER_MS
    let raf
    const tick = now => {
      const t = Math.min(Math.max((now - start) / GROW_MS, 0), 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [grown, index])

  return (
    <div ref={barRef} className="flex flex-col items-center">
      <TeamBreakdown
        team={team}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onViewDetails={onViewDetails}
      >
        <div className="flex flex-col items-center">
          <div className="text-center mb-2">
            <span className="text-base sm:text-lg font-bold text-mainText font-poppins">
              {count}
            </span>
            <span className="text-xs text-mutedText ml-1 font-poppins">points</span>

          </div>

          <div className="hp-bar-wrapper sm:w-[80px] w-[60px]" style={{ height: barHeight }}>
            <div className="hp-bar-shadow-layer" />
            <div
              className={`hp-bar-fill ${grown ? 'bar-grow' : ''}`}
              style={{ '--bar-delay': `${index * STAGGER_MS}ms`, transform: grown ? undefined : 'scaleY(0)' }}
            >
              <div className="hp-bar-highlight" />
              {[...categories].reverse().map(cat => {
                  const pts = team.catPoints[cat] || 0
                  const pct = team.totalPoints > 0 ? (pts / team.totalPoints) * 100 : 0
                  const minPct = Math.max(pct, 3)
                  const colors = CATEGORY_COLORS[cat] || { light: '#ccc', dark: '#999' }
                  const segPx = (pct / 100) * barHeight
                  const showBoth = segPx >= 26
                  const showPoints = segPx >= 17
                  const isLightBg = cat === 'General Cat-B'
                  const textColor = isLightBg ? 'text-gray-900 font-bold' : 'text-white'
                  return (
                    <div
                      key={cat}
                      className="relative w-full"
                      style={{ height: `${minPct}%`, minHeight: pct === 0 ? '4px' : undefined }}
                    >
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.light} 0%, ${colors.dark} 100%)` }} />
                      <div className="absolute inset-0 z-[1]" style={{ background: isLightBg ? 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(0,0,0,0.05) 100%)' : `linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(0,0,0,0.08) 100%)` }} />
                      {showPoints && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-1">
                          {showBoth && (
                            <span className={`text-[8px] sm:text-[9px] font-semibold ${textColor} drop-shadow-sm leading-tight`}>
                              {shortCategoryLabel(cat)}
                            </span>
                          )}
                          <span className={`text-[9px] sm:text-[10px] font-bold ${textColor} drop-shadow-sm leading-tight`}>
                            {pts}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="text-center mt-2 max-w-[70px] sm:max-w-none">
            <span
              className="text-[11px] sm:text-xs font-semibold font-poppins transition truncate block"
              style={{ color: team.color || '#EAF4FA' }}
            >
              {team.name}
            </span>
          </div>
        </div>
      </TeamBreakdown>
    </div>
  )
}

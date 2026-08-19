import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen } from 'lucide-react'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/results', icon: BookOpen, label: 'Results' },
]

const RUBBER_BAND = 0.35
const VELOCITY_THRESHOLD = 0.4 // px/ms — a fast flick commits even on a short drag
const TAP_THRESHOLD = 6 // px of movement before a press counts as a drag

const indexForPath = (pathname) => (pathname.startsWith('/results') ? 1 : 0)

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  // Hide the shared bottom nav inside the Student, Judge and Admin panels.
  const first = location.pathname.split('/')[1]
  const isPanel = first === 'admin' || first === 'student' || first === 'judges'

  const vesselRef = useRef(null)
  const lensRef = useRef(null)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const rafRef = useRef(0)
  const startXRef = useRef(0)
  const startPctRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)
  const velocityRef = useRef(0)

  const [activeIdx, setActiveIdx] = useState(() => indexForPath(location.pathname))

  const applyPct = (pct) => {
    const lens = lensRef.current
    if (!lens) return
    lens.style.transform = `translate3d(${pct}%, 0px, 0px)`
  }

  const setLensTo = (idx) => applyPct(idx * 100)

  const finishMove = () => {
    draggingRef.current = false
    cancelAnimationFrame(rafRef.current)
    window.removeEventListener('pointermove', handleMove)
    window.removeEventListener('pointerup', handleEnd)
    window.removeEventListener('pointercancel', handleEnd)
    // Keep the click-capture listener alive through the click that follows a
    // pointerup so a drag never also triggers the underlying Link navigation.
    setTimeout(() => document.removeEventListener('click', handleClickCapture, true), 0)
  }

  const handleClickCapture = (e) => {
    if (suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
    }
    document.removeEventListener('click', handleClickCapture, true)
  }

  useEffect(() => {
    const idx = indexForPath(location.pathname)
    setActiveIdx(idx)
    if (!draggingRef.current) setLensTo(idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
      document.removeEventListener('click', handleClickCapture, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMove = (e) => {
    if (!draggingRef.current) return
    const now = performance.now()
    const dt = Math.max(now - lastTRef.current, 1)
    const dx = e.clientX - lastXRef.current
    velocityRef.current = dx / dt
    lastTRef.current = now
    lastXRef.current = e.clientX

    const totalDx = e.clientX - startXRef.current
    if (Math.abs(totalDx) > TAP_THRESHOLD) {
      movedRef.current = true
      suppressClickRef.current = true
    }

    const width = vesselRef.current?.clientWidth || 300
    let pct = startPctRef.current + (totalDx / width) * 200
    if (pct < 0) pct = (pct - 0) * RUBBER_BAND
    if (pct > 100) pct = 100 + (pct - 100) * RUBBER_BAND

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => applyPct(pct))
  }

  const handleEnd = (e) => {
    if (!draggingRef.current) return
    const width = vesselRef.current?.clientWidth || 300
    const totalDx = e.clientX - startXRef.current
    let pct = startPctRef.current + (totalDx / width) * 200
    const v = velocityRef.current
    const committedByFlick = Math.abs(v) > VELOCITY_THRESHOLD && Math.abs(totalDx) > 0
    const target = committedByFlick ? (v > 0 ? 1 : 0) : pct >= 50 ? 1 : 0

    finishMove()

    const lens = lensRef.current
    if (lens) lens.style.transition = ''

    if (!movedRef.current && !committedByFlick) {
      // Pure tap — restore the lens and let the Link navigate normally.
      suppressClickRef.current = false
      setLensTo(activeIdx)
      return
    }

    if (target !== activeIdx) {
      navigate(tabs[target].path)
    } else {
      setActiveIdx(target)
    }
    setLensTo(target)
  }

  const startDrag = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    draggingRef.current = true
    movedRef.current = false
    suppressClickRef.current = false
    lastXRef.current = e.clientX
    lastTRef.current = performance.now()
    velocityRef.current = 0
    startXRef.current = e.clientX
    startPctRef.current = activeIdx * 100
    const lens = lensRef.current
    if (lens) lens.style.transition = 'none'

    document.addEventListener('click', handleClickCapture, true)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
  }

  if (isPanel) return null

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[18rem] -translate-x-1/2 sm:hidden">
      <div className="nav-glass-vessel">
        <div ref={vesselRef} className="nav-track" onPointerDown={startDrag}>
          <div ref={lensRef} className="nav-lens" aria-hidden="true" />
          {tabs.map(({ path, icon: Icon, label }, i) => {
            const active = activeIdx === i
            return (
              <Link
                key={path}
                to={path}
                draggable={false}
                aria-current={active ? 'page' : undefined}
                className={`nav-tab ${active ? 'nav-tab-active' : ''}`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 2} />
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
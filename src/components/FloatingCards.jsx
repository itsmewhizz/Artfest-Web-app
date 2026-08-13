import { useEffect, useMemo, useState } from 'react'

const DRIFT_DURATION = 50

const calcCount = () => {
  if (typeof window === 'undefined') return 9
  const w = window.innerWidth
  const gap = w < 640 ? 12 : Math.max(16, Math.min(44, w * 0.03))
  const cardWidth = w < 640 ? 100 : Math.max(140, Math.min(190, w * 0.13))
  return Math.max(6, Math.ceil((w * 1.3) / (cardWidth + gap)))
}

export default function FloatingCards({ images = [] }) {
  const [count, setCount] = useState(calcCount)

  useEffect(() => {
    const onResize = () => setCount(calcCount())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cards = useMemo(() => {
    const pool = images.length ? images : [{ imageURL: '' }]
    return Array.from({ length: count }, (_, i) => {
      const img = pool[i % pool.length]
      return {
        key: i,
        src: img.imageURL || '',
        lift: (i % 6) * 13 + 4,
        tilt: ((i * 37) % 18) - 9,
        bob: 3.4 + ((i * 3) % 10) / 7,
        floatDelay: -((i % 5) * 0.8),
        revealDelay: i * 0.4,
      }
    })
  }, [count, images])

  const loop = useMemo(() => [...cards, ...cards], [cards])

  return (
    <div className="float-bg" aria-hidden>
      <div className="float-strip" style={{ '--drift-dur': `${DRIFT_DURATION}s` }}>
        {loop.map((c, idx) => (
          <div
            key={idx}
            className="float-card"
            style={{
              '--lift': `${c.lift}px`,
              '--tilt': `${c.tilt}deg`,
              '--bob': `${c.bob}s`,
              '--float-delay': `${c.floatDelay}s`,
              '--reveal-delay': `${c.revealDelay}s`,
            }}
          >
            <div className="float-card-idle">
              <div className="float-card-shadow" />
              <div className="float-card-inner">
                <div className="float-face float-front">
                  {c.src ? (
                    <img src={c.src} alt="" />
                  ) : (
                    <div className="float-placeholder" />
                  )}
                </div>
                <div className="float-face float-back">
                  <div className="float-brand-wrap">
                    <span className="float-brand-top">ISRA</span>
                    <span className="float-brand-line" />
                    <span className="float-brand-sub">Festival</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
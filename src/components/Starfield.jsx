import { useMemo } from 'react'

export default function Starfield({ count = 50 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 5,
      })),
    [count]
  )

  return (
    <div className="starfield" aria-hidden="true">
      {stars.map(s => (
        <span
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

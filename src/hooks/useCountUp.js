import { useState, useEffect, useRef } from 'react'

export default function useCountUp(end, duration = 1.5) {
  const [count, setCount] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (end === 0) { setCount(0); return }
    const startTime = performance.now()
    const animate = (now) => {
      const elapsed = (now - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress * (2 - progress)
      setCount(Math.floor((end - 0) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
      else setCount(end)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [end, duration])

  return count
}

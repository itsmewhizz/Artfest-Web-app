import { useCallback, useRef, useState } from 'react'

export default function useScrollReveal(threshold = 0.2) {
  const [visible, setVisible] = useState(false)
  const visibleRef = useRef(false)
  const observerRef = useRef(null)

  const reveal = useCallback(() => {
    if (visibleRef.current) return
    visibleRef.current = true
    observerRef.current?.disconnect()
    observerRef.current = null
    setVisible(true)
  }, [])

  const ref = useCallback(
    (node) => {
      if (!node) {
        observerRef.current?.disconnect()
        observerRef.current = null
        return
      }
      if (visibleRef.current) return

      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (prefersReduced || typeof IntersectionObserver === 'undefined') {
        reveal()
        return
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal()
          })
        },
        { threshold }
      )

      observerRef.current = observer
      observer.observe(node)
    },
    [threshold, reveal]
  )

  return { ref, visible }
}
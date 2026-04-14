import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration: number = 500): number {
  const [display, setDisplay] = useState(target)
  const animRef = useRef<number | null>(null)
  const startRef = useRef(target)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current)
    }

    startRef.current = display
    startTimeRef.current = null

    if (startRef.current === target) return

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      const current = startRef.current + (target - startRef.current) * eased

      setDisplay(Math.round(current))

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current != null) {
        cancelAnimationFrame(animRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return display
}

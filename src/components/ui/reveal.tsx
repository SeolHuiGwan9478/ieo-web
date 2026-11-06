import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** 화면에 들어올 때 한 번 떠오르며 나타난다. 움직임 줄이기를 켠 사람에게는 처음부터 보인다 */
export function Reveal({ children, delayMs = 0, className }: { children: ReactNode; delayMs?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShown(true)
      observer.disconnect()
    }, { threshold: 0.2 })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(shown ? 'motion-safe:animate-rise' : 'motion-safe:opacity-0', className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  )
}

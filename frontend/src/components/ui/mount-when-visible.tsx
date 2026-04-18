"use client"

import React, { useEffect, useRef, useState } from "react"

interface MountWhenVisibleProps {
  children: React.ReactNode
  placeholder?: React.ReactNode
  rootMargin?: string
  className?: string
}

export function MountWhenVisible({
  children,
  placeholder = null,
  rootMargin = "200px",
  className,
}: MountWhenVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, rootMargin])

  return (
    <div ref={ref} className={className}>
      {visible ? children : placeholder}
    </div>
  )
}

"use client"

import { useRef, useState, useEffect, type RefObject, type CSSProperties } from "react"

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
}

interface UseScrollRevealReturn {
  ref: RefObject<HTMLDivElement | null>
  isVisible: boolean
}

export function useScrollReveal(options: UseScrollRevealOptions = {}): UseScrollRevealReturn {
  const { threshold = 0.1, rootMargin = "0px", once = true } = options
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.unobserve(element)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, once])

  return { ref, isVisible }
}

// Animation type definitions
export type RevealAnimation = 
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "scale-up"
  | "zoom-rotate"
  | "bounce-up"

// Helper hook that returns ready-to-spread props
export function useRevealProps(
  animation: RevealAnimation = "fade-up",
  options: UseScrollRevealOptions & { delay?: number } = {}
) {
  const { delay = 0, ...scrollOptions } = options
  const { ref, isVisible } = useScrollReveal(scrollOptions)

  const baseStyles: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transitionDuration: "600ms",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)"
  }

  const hiddenStyles: Record<RevealAnimation, CSSProperties> = {
    "fade-up": { opacity: 0, transform: "translateY(30px)" },
    "fade-down": { opacity: 0, transform: "translateY(-30px)" },
    "fade-left": { opacity: 0, transform: "translateX(-30px)" },
    "fade-right": { opacity: 0, transform: "translateX(30px)" },
    "scale-up": { opacity: 0, transform: "scale(0.9)" },
    "zoom-rotate": { opacity: 0, transform: "scale(0.8) rotate(-5deg)" },
    "bounce-up": { opacity: 0, transform: "translateY(50px)" }
  }

  const visibleStyles: CSSProperties = {
    opacity: 1,
    transform: "translateY(0) translateX(0) scale(1) rotate(0)"
  }

  return {
    ref,
    style: {
      ...baseStyles,
      ...(isVisible ? visibleStyles : hiddenStyles[animation])
    }
  }
}

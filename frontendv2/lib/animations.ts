// Animation variants for framer-motion style animations using CSS
export const fadeInUp = {
  initial: "opacity-0 translate-y-4",
  animate: "opacity-100 translate-y-0",
  transition: "transition-all duration-500 ease-out",
}

export const fadeIn = {
  initial: "opacity-0",
  animate: "opacity-100",
  transition: "transition-opacity duration-300 ease-out",
}

export const slideInLeft = {
  initial: "opacity-0 -translate-x-4",
  animate: "opacity-100 translate-x-0",
  transition: "transition-all duration-400 ease-out",
}

export const slideInRight = {
  initial: "opacity-0 translate-x-4",
  animate: "opacity-100 translate-x-0",
  transition: "transition-all duration-400 ease-out",
}

export const scaleIn = {
  initial: "opacity-0 scale-95",
  animate: "opacity-100 scale-100",
  transition: "transition-all duration-300 ease-out",
}

export const staggerDelay = (index: number, baseDelay: number = 100) => ({
  style: { transitionDelay: `${index * baseDelay}ms` },
})

// CSS keyframe animation classes (to be added to globals.css)
export const pulseGlow = "animate-pulse-glow"
export const typewriter = "animate-typewriter"
export const blink = "animate-blink"
export const shimmer = "animate-shimmer"

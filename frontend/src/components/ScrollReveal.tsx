import type { ReactNode, CSSProperties } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

type Animation =
  | "scroll-fade-up"
  | "scroll-fade-down"
  | "scroll-fade-left"
  | "scroll-fade-right"
  | "scroll-scale-up"
  | "scroll-zoom-rotate"
  | "scroll-bounce-up";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  as?: keyof HTMLElementTagNameMap;
  once?: boolean;
}

export function ScrollReveal({
  children,
  animation = "scroll-fade-up",
  delay = 0,
  threshold = 0.15,
  className = "",
  style,
  once = true,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold, once });

  return (
    <div
      ref={ref}
      className={`${isVisible ? `scroll-revealed ${animation}` : "scroll-hidden"} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}

/**
 * Wraps a grid/list of items with staggered scroll reveal.
 * Each direct child gets an incremental delay.
 */
export function ScrollRevealGroup({
  children,
  animation = "scroll-fade-up",
  staggerMs = 80,
  threshold = 0.1,
  className = "",
  style,
}: {
  children: ReactNode;
  animation?: Animation;
  staggerMs?: number;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold });

  // Wrap children to apply stagger delay
  const items = Array.isArray(children) ? children : [children];

  return (
    <div ref={ref} className={className} style={style}>
      {items.map((child, i) => (
        <div
          key={i}
          className={isVisible ? `scroll-revealed ${animation}` : "scroll-hidden"}
          style={{ transitionDelay: `${i * staggerMs}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

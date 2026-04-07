import { useEffect, useRef, useState, useCallback } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook that returns a ref and a boolean indicating if the element is visible in the viewport.
 * Attach the ref to any element to trigger reveal animations on scroll.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -40px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}

/**
 * Component-level hook that applies a CSS class when the element scrolls into view.
 * Returns props to spread onto a wrapper div.
 */
export function useRevealProps(
  animation: string = "scroll-fade-up",
  delay: number = 0,
  options?: ScrollRevealOptions
) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>(options);

  return {
    ref,
    className: isVisible ? `scroll-revealed ${animation}` : "scroll-hidden",
    style: { transitionDelay: `${delay}ms` } as React.CSSProperties,
  };
}

"use client"
// components/motion/count-up.tsx
// Animated count-up for stat numbers. Animates from 0 to `value` when scrolled into view.
// Respects prefers-reduced-motion: renders the final value statically when set.
// Supports a prefix/suffix (e.g. "+", "x7") so non-pure-number stats can still use it.

import { useEffect, useRef } from "react"
import {
  animate,
  useInView,
  useMotionValue,
  useTransform,
  motion,
  useReducedMotion,
} from "framer-motion"

interface CountUpProps {
  value: number
  /** Text rendered before the number, e.g. "". */
  prefix?: string
  /** Text rendered after the number, e.g. "+". */
  suffix?: string
  className?: string
  /** Animation duration in seconds. */
  duration?: number
}

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  className,
  duration = 1.2,
}: CountUpProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    if (reduce || !inView) return
    const controls = animate(count, value, { duration, ease: "easeOut" })
    return controls.stop
  }, [inView, reduce, count, value, duration])

  if (reduce) {
    return (
      <span ref={ref} className={className}>
        {prefix}
        {value}
        {suffix}
      </span>
    )
  }

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}

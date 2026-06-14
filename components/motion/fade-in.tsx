"use client"
// components/motion/fade-in.tsx
// Fade-in-on-scroll primitive. Wraps Server Component children as a client island.
// Respects prefers-reduced-motion: renders final state with no animation when set.

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

interface FadeInProps {
  children: ReactNode
  className?: string
  /** Animation delay in seconds (for staggering). */
  delay?: number
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={cn(className)}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  )
}

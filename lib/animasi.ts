import type { Transition, Variants } from "framer-motion"

export const EASE_SPRING = [0.22, 1, 0.36, 1] as const

export const TRANSISI_DEFAULT: Transition = {
  duration: 0.5,
  ease: EASE_SPRING as unknown as [number, number, number, number],
}

export const ANIMASI_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: EASE_SPRING as unknown as [number, number, number, number],
    },
  },
}

export const ANIMASI_FADE_UP_RINGAN: Variants = {
  hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: EASE_SPRING as unknown as [number, number, number, number],
    },
  },
}

export const ANIMASI_STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

export const ANIMASI_STAGGER_CEPAT: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

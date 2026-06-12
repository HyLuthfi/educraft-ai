import type { Transition, Variants } from "framer-motion"

export const EASE_SPRING = [0.25, 1, 0.5, 1] as const
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const

export const TRANSISI_DEFAULT: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 1,
}

export const TRANSISI_CEPAT: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 20,
  mass: 1,
}

export const ANIMASI_FADE_UP: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: { ...TRANSISI_DEFAULT }
  },
}

export const ANIMASI_STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const ANIMASI_BENTO_ITEM: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...TRANSISI_CEPAT }
  },
}

// Shared scroll-reveal variants for the landing page (motion.dev's React
// bindings, via "motion/react"). Kept as plain data — no "use client"
// needed here, only in the components that actually render <motion.*>.

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

/** Wrap a grid/list container in this (as `variants`, `initial="hidden"`,
 * `whileInView="show"`) to stagger its motion children in one after another. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
} as const;

/** Default viewport config: animate once, a bit before the section is fully
 * in frame, so it doesn't feel late. */
export const revealViewport = { once: true, amount: 0.3 } as const;

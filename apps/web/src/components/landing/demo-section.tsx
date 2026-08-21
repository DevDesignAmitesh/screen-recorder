"use client";

import { motion } from "motion/react";

import { fadeUp, revealViewport, scaleIn } from "./motion-variants";

// The launch video — embedded straight from YouTube, no local asset to host.
export function DemoSection() {
  return (
    <section id="launch" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Watch the launch video</h2>
        <p className="mt-2 text-muted-foreground">Screen, face cam, and a wallpaper — recorded straight from the browser.</p>
      </motion.div>
      <motion.div
        className="relative aspect-video overflow-hidden rounded-[1.75rem] border border-border shadow-lg"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={scaleIn}
      >
        <iframe
          className="absolute inset-0 h-full w-full"
          src="https://www.youtube.com/embed/ftAgNczXDok"
          title="Screensy launch video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </motion.div>
    </section>
  );
}

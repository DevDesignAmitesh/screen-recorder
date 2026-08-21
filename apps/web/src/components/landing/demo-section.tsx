"use client";

import { Play } from "lucide-react";
import { motion } from "motion/react";

import { MediaPlaceholder } from "@/components/media-placeholder";

import { fadeUp, revealViewport, scaleIn } from "./motion-variants";

// The single video/demo block for the whole landing page — replaces what
// used to be two separate MediaPlaceholder spots. Swap the placeholder for
// a real <video>/embed once a demo clip exists; the play-button affordance
// is decorative only (pointer-events-none) so it doesn't look like a dead
// link in the meantime.
export function DemoSection() {
  return (
    <section id="demo" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">See it in 60 seconds</h2>
        <p className="mt-2 text-muted-foreground">Screen, face cam, and a wallpaper — recorded straight from the browser.</p>
      </motion.div>
      <motion.div
        className="relative"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={scaleIn}
      >
        <MediaPlaceholder label="Demo video coming soon" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </div>
      </motion.div>
    </section>
  );
}

"use client";

import { Download, Sparkles, Video } from "lucide-react";
import { motion } from "motion/react";

import { fadeUp, revealViewport, staggerContainer } from "./motion-variants";

const STEPS = [
  {
    icon: Video,
    title: "Record 5–10 minutes",
    description: "Share your screen, turn your face cam and mic on, pick a wallpaper, and go.",
  },
  {
    icon: Download,
    title: "Download it",
    description: "The finished video saves straight to your device — nothing sits on our servers.",
  },
  {
    icon: Sparkles,
    title: "Do whatever you want",
    description:
      "Trim it in your favorite editor, stitch chunks together, upload it wherever you like — we just hand you the free recording template.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
        <p className="mt-2 text-muted-foreground">Three steps. No editor to learn.</p>
      </motion.div>
      <motion.div
        className="grid gap-6 sm:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={staggerContainer}
      >
        {STEPS.map(({ icon: Icon, title, description }, index) => (
          <motion.div
            key={title}
            variants={fadeUp}
            className="relative flex flex-col items-start gap-3 rounded-[1.75rem] border border-border bg-card p-6"
          >
            <span className="absolute right-6 top-6 font-heading text-3xl font-semibold text-border">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="font-heading font-semibold tracking-tight">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

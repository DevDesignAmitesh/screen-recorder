"use client";

import { Camera, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

import { fadeUp, revealViewport, staggerContainer } from "./motion-variants";

// Each point is framed as "the annoying thing elsewhere" (struck through)
// followed by what Screensy does instead — the landing page's core sales
// pitch: free where others charge, simple where others bury it in a
// dashboard.
const POINTS = [
  {
    icon: Camera,
    problem: "Webcam-overlay apps make you install software or upgrade to a “pro” plan just to add your face.",
    title: "Screen + face cam, built in",
    description:
      "Share your screen and your face gets composited into the frame automatically — no separate app, no upgrade wall.",
  },
  {
    icon: ImageIcon,
    problem: "Nice-looking backgrounds are usually locked behind premium templates.",
    title: "Free wallpaper templates",
    description: "Pick from a growing set of backgrounds behind your screen-share frame — free, no watermark.",
  },
  {
    icon: ShieldCheck,
    problem: "Most recorders quietly upload your video to their cloud by default.",
    title: "Nothing leaves your computer",
    description: "Recordings save straight to your own filesystem. We only ever store what you recorded, not the video itself.",
  },
];

export function ProblemSolution() {
  return (
    <section id="solution" className="mx-auto max-w-5xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          What you&apos;d pay for elsewhere, free here
        </h2>
        <p className="mt-2 text-muted-foreground">Other tools charge, or bury this behind a complex dashboard. We don&apos;t.</p>
      </motion.div>
      <motion.div
        className="grid gap-px overflow-hidden rounded-[1.75rem] bg-border sm:grid-cols-3"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={staggerContainer}
      >
        {POINTS.map(({ icon: Icon, problem, title, description }) => (
          <motion.div key={title} variants={fadeUp} className="flex flex-col items-start gap-3 bg-muted px-6 py-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-xs leading-relaxed text-muted-foreground/70 line-through decoration-destructive/50">
              {problem}
            </p>
            <h3 className="font-heading font-semibold tracking-tight">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

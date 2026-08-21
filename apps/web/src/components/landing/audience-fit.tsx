"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";

import { fadeUp, revealViewport, staggerContainer } from "./motion-variants";

const FOR_YOU = [
  "You make short-form or informational content and don't want a budget getting in the way",
  "You want to publish polished, presentable videos on X, LinkedIn, Reddit, and everywhere else — fast",
  "You want a fancy-looking template without learning a full video editor",
  "You record talking-head or explainer-style videos regularly",
];

const MAYBE_SKIP = [
  "You need heavy multi-track editing — Screensy hands you the recording template, not a full editor",
  "You're regularly recording long-form content (well past 10 minutes)",
  "You need to record from a phone or tablet — desktop browser only, for now",
  "You need cloud storage or team collaboration on recordings",
];

export function AudienceFit() {
  return (
    <section id="audience" className="mx-auto max-w-4xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Is this for you, or should you skip it?</h2>
        <p className="mt-2 text-muted-foreground">A quick, honest gut-check before you sign up.</p>
      </motion.div>
      <motion.div
        className="grid gap-6 sm:grid-cols-2"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-card p-6">
          <h3 className="font-heading font-semibold tracking-tight text-foreground">This is for you if</h3>
          <ul className="flex flex-col gap-3">
            {FOR_YOU.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div variants={fadeUp} className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-muted p-6">
          <h3 className="font-heading font-semibold tracking-tight text-foreground">Maybe skip it if</h3>
          <ul className="flex flex-col gap-3">
            {MAYBE_SKIP.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
                {point}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </section>
  );
}

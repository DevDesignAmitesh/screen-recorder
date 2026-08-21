"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";

import { PRODUCT_NAME } from "@/lib/constants";

import { fadeUp, revealViewport, staggerContainer } from "./motion-variants";

// Deliberately no competitor names — just the differences that actually
// matter, framed generically as "typical recorder apps".
const ROWS = [
  { label: "Price", us: "Free, forever", them: "Monthly subscription" },
  { label: "Setup", us: "Record in seconds", them: "Complex dashboards & settings" },
  { label: "Templates", us: "Free wallpaper templates included", them: "Often locked behind a paid tier" },
  { label: "Limits", us: "No artificial caps or watermarks", them: "Time caps / watermarks on free tiers" },
  { label: "Privacy", us: "Nothing ever leaves your device", them: "Uploaded to their cloud by default" },
];

export function Comparison() {
  return (
    <section id="compare" className="mx-auto max-w-4xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How this compares</h2>
        <p className="mt-2 text-muted-foreground">How we differ from other tools in the space.</p>
      </motion.div>

      <motion.div
        className="overflow-hidden rounded-[1.75rem] border border-border"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={staggerContainer}
      >
        <div className="hidden grid-cols-3 bg-muted text-sm font-medium sm:grid">
          <div className="px-4 py-3" />
          <div className="px-4 py-3 text-primary">{PRODUCT_NAME}</div>
          <div className="px-4 py-3 text-muted-foreground">Typical recorder apps</div>
        </div>

        {ROWS.map((row, index) => (
          <motion.div
            key={row.label}
            variants={fadeUp}
            className={`grid grid-cols-1 gap-2 p-4 text-sm sm:grid-cols-3 sm:gap-0 sm:p-0 ${index > 0 ? "border-t border-border" : "border-t border-border sm:border-t-0"}`}
          >
            <div className="font-medium sm:px-4 sm:py-4">{row.label}</div>
            <div className="flex items-start gap-2 sm:px-4 sm:py-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                <span className="font-medium text-primary sm:hidden">{PRODUCT_NAME}: </span>
                {row.us}
              </span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground sm:px-4 sm:py-4">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive/70" />
              <span>
                <span className="font-medium text-foreground sm:hidden">Typical apps: </span>
                {row.them}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

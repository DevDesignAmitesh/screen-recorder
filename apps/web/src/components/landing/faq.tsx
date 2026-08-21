"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { fadeUp, revealViewport, staggerContainer } from "./motion-variants";

const FAQS = [
  {
    q: "Is it free forever?",
    a: "Yes — Screensy is free, with no plans to charge for the core recording experience.",
  },
  {
    q: "How long can I record a video?",
    a: "Ideally 5–10 minutes. You can go longer, but it depends on your device's specs and whatever else is running in the background while you record. If you need more, we'd suggest recording in shorter chunks and stitching/editing them together in your favorite editor — Screensy just gives you a free template to record with, it isn't a full editor.",
  },
  {
    q: "Do I need to install anything?",
    a: "No — it runs entirely in your browser. Use a desktop browser like Chrome or Edge; screen recording isn't supported on mobile browsers yet.",
  },
  {
    q: "Where does my recording go?",
    a: "It downloads straight to your device. We only keep a small history entry — title, duration, and which wallpaper you used — never the video itself.",
  },
  {
    q: "Can I upload my own wallpaper?",
    a: "Not yet — for now it's curated free templates only. Custom uploads are on the roadmap.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-6 py-20 sm:py-28">
      <motion.div
        className="mb-12 text-center"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Questions you might have</h2>
      </motion.div>
      <motion.div
        className="divide-y divide-border rounded-[1.75rem] border border-border bg-card"
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={staggerContainer}
      >
        {FAQS.map((item, index) => {
          const open = openIndex === index;
          return (
            <motion.div key={item.q} variants={fadeUp}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className="font-medium">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && <p className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

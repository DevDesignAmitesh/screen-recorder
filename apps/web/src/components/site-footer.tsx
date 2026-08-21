"use client";

import { ArrowRight, Clapperboard } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { fadeUp, revealViewport } from "@/components/landing/motion-variants";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_NAME } from "@/lib/constants";

const EXPLORE_LINKS = [
  { href: "#solution", label: "Solution" },
  { href: "#demo", label: "Demo" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#compare", label: "Compare" },
  { href: "#audience", label: "Who it's for" },
  { href: "#faq", label: "FAQ" },
];

/** Huge low-opacity wordmark as a background watermark, with a floating
 * card of actual footer content laid over it. */
export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="relative overflow-hidden bg-muted px-6 py-24 sm:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 select-none whitespace-nowrap text-center font-heading text-[26vw] font-extrabold uppercase leading-none tracking-tight text-foreground/10 sm:top-16 sm:text-[15rem]"
      >
        {PRODUCT_NAME}
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={revealViewport}
        variants={fadeUp}
        className="relative mx-auto mt-4 max-w-4xl rounded-[1.75rem] border border-border bg-card p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] sm:mt-6 sm:p-10"
      >
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="flex max-w-sm flex-col gap-4">
            <div className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Clapperboard className="h-4 w-4" />
              </span>
              {PRODUCT_NAME}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Free, forever. Record your screen and your face — no subscription, no dashboard, nothing uploaded to
              the cloud.
            </p>
            <Link href={user ? "/dashboard" : "/signup"} className={`${buttonVariants({ variant: "primary", size: "md" })} w-fit`}>
              {user ? "Go to dashboard" : "Get started free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explore</p>
            <nav className="flex flex-col gap-1.5 text-xs">
              {EXPLORE_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="font-medium text-foreground hover:text-primary">
                  {link.label}
                </a>
              ))}
              <Link href="/login" className="font-medium text-foreground hover:text-primary">
                Log in
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {PRODUCT_NAME}. Built by{" "}
            <a
              href="https://amitesh.work"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Amitesh
            </a>
            .
          </p>
          <p className="italic">Free, forever — no cap.</p>
        </div>
      </motion.div>
    </footer>
  );
}

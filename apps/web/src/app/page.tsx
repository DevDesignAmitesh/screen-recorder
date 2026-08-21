"use client";

import { motion } from "motion/react";
import Link from "next/link";

import { AudienceFit } from "@/components/landing/audience-fit";
import { Comparison } from "@/components/landing/comparison";
import { DemoSection } from "@/components/landing/demo-section";
import { Faq } from "@/components/landing/faq";
import { HowItWorks } from "@/components/landing/how-it-works";
import { fadeUp, staggerContainer } from "@/components/landing/motion-variants";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero — the core pitch: an easy way to record you and your
            screen, with fancy templates, no fees, nothing uploaded. Animates
            in on mount (it's above the fold, so no scroll trigger needed). */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-24 pt-28 text-center sm:pt-36"
        >
          <motion.span variants={fadeUp} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Free, forever — nothing ever uploaded to the cloud
          </motion.span>
          <motion.h1 variants={fadeUp} className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Record your screen with your face.
            <br />
            Save it locally. Make it yours.
          </motion.h1>
          <motion.p variants={fadeUp} className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Screensy composites your face cam and a background wallpaper right into your screen recording, free, in
            your browser. No install, no subscription, no upload.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href={user ? "/dashboard" : "/signup"} className={buttonVariants({ variant: "primary", size: "lg" })}>
              {user ? "Go to dashboard" : "Get started free"}
            </Link>
            {!user && (
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Log in
              </Link>
            )}
          </motion.div>
        </motion.section>

        <ProblemSolution />
        <DemoSection />
        <HowItWorks />
        <Comparison />
        <AudienceFit />
        <Faq />
      </main>

      <SiteFooter />
    </>
  );
}

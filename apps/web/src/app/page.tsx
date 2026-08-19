"use client";

import { Camera, Image as ImageIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { MediaPlaceholder } from "@/components/media-placeholder";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: Camera,
    title: "Screen + face cam",
    description: "Share your screen with your face composited right into the frame — no separate webcam app.",
  },
  {
    icon: ImageIcon,
    title: "Custom wallpapers",
    description: "Pick a background behind your screen-share frame — pick from the defaults, more coming soon.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing leaves your computer",
    description: "Recordings save straight to your own filesystem. We only ever store what you recorded, not the video itself.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-28 text-center sm:pt-36">
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-6xl">
            Record your screen.
            <br />
            Add your face. Make it yours.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            A screen recorder that composites your face cam and a background wallpaper right into the video, in your
            browser — nothing ever uploaded.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={user ? "/dashboard" : "/signup"} className={buttonVariants({ variant: "primary", size: "lg" })}>
              {user ? "Go to dashboard" : "Get started free"}
            </Link>
            {!user && (
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Log in
              </Link>
            )}
          </div>

          <div className="mt-8 w-full max-w-3xl">
            <MediaPlaceholder label="Hero video/screenshot goes here" />
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-px overflow-hidden rounded-[1.75rem] bg-border sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-start gap-3 bg-muted px-6 py-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-heading font-semibold tracking-tight">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary media section */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="mb-8 text-center">
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">See it in action</h2>
            <p className="mt-2 text-muted-foreground">A quick look at recording, from setup to export.</p>
          </div>
          <MediaPlaceholder label="Product screenshot / demo video goes here" />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
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
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

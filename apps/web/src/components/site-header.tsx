"use client";

import { Clapperboard } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_NAME } from "@/lib/constants";

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-5">
      <header className="pointer-events-auto flex h-12 w-full max-w-3xl items-center justify-between gap-3 rounded-full border border-primary/20 bg-white/85 px-2 pl-4 shadow-[0_8px_40px_rgba(219,39,119,0.12)] backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="h-3.5 w-3.5" />
          </span>
          {PRODUCT_NAME}
        </Link>

        <div className="flex items-center gap-2">
          {!loading &&
            (user ? (
              <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-primary/8 hover:text-primary">
                  Log in
                </Link>
                <Link href="/signup" className={buttonVariants({ variant: "primary", size: "sm" })}>
                  Sign up
                </Link>
              </>
            ))}
        </div>
      </header>
    </div>
  );
}

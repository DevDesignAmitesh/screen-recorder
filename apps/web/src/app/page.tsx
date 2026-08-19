"use client";

import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Screen Recorder</h1>
        <p className="text-sm text-gray-500">Screen + face cam + wallpaper, composited and recorded in the browser.</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : user ? (
        <Link href="/dashboard" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
          Go to dashboard
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
            Log in
          </Link>
          <Link href="/signup" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}

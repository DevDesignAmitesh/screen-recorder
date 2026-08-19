"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { recordingsApi, type Recording } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;
    recordingsApi
      .list(token)
      .then(({ recordings }) => setRecordings(recordings))
      .catch(() => {
        // History is a nice-to-have on this page — a failed fetch just
        // leaves the list empty rather than blocking the dashboard.
      })
      .finally(() => setHistoryLoading(false));
  }, [token]);

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">Logged in as {user.email}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
        >
          Log out
        </button>
      </div>

      <Link href="/record" className="block rounded-md bg-black px-4 py-2 text-center text-sm font-medium text-white">
        New recording
      </Link>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-gray-500">Your recordings ({recordings.length})</h2>

        {historyLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : recordings.length === 0 ? (
          <p className="text-sm text-gray-500">No recordings yet — start one above.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {recordings.map((recording) => (
              <li key={recording.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{recording.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(recording.createdAt).toLocaleString()} · {formatDuration(recording.duration)}
                    {recording.wallpaper ? ` · ${recording.wallpaper.name}` : ""}
                  </p>
                </div>
                {recording.wallpaper && (
                  <div
                    className="h-10 w-16 shrink-0 rounded bg-cover bg-center"
                    style={{ backgroundImage: `url(${recording.wallpaper.url})` }}
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

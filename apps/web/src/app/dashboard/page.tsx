"use client";

import { Clapperboard, Film, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { recordingsApi, type Recording } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PRODUCT_NAME } from "@/lib/constants";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      .catch(() => setError("Couldn't load your recordings"))
      .finally(() => setHistoryLoading(false));
  }, [token]);

  async function handleDelete(id: string) {
    if (!token) return;
    if (!window.confirm("Delete this recording from your history? This can't be undone.")) return;
    setDeletingId(id);
    setError(null);
    try {
      await recordingsApi.remove(id, token);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Couldn't delete that recording");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-heading font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Clapperboard className="h-4 w-4" />
            </span>
            {PRODUCT_NAME}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8 pb-20">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Your recordings</h1>

          {error && <Alert>{error}</Alert>}

          {historyLoading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-dashed border-border py-24 text-center">
              <h2 className="font-heading text-lg font-semibold tracking-tight">Record your first video</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pick a wallpaper, share your screen, and go — your face gets composited right into the frame.
              </p>
              <Link href="/record" className={buttonVariants({ variant: "primary", size: "lg" })}>
                <Video className="h-4 w-4" />
                Start recording
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="group overflow-hidden rounded-[1.75rem] border border-border bg-card">
                  <div
                    className="relative aspect-video bg-cover bg-center"
                    style={recording.wallpaper ? { backgroundImage: `url(${recording.wallpaper.url})` } : undefined}
                  >
                    {!recording.wallpaper && (
                      <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
                        <Film className="h-6 w-6" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                      {formatDuration(recording.duration)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(recording.id)}
                      disabled={deletingId === recording.id}
                      title="Delete recording"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 disabled:opacity-50"
                    >
                      {deletingId === recording.id ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-medium">{recording.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(recording.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Record CTA — pinned near the bottom of the viewport but bounded
            to the same max-width column as the content above (not the raw
            edge of the browser window). The outer bar spans full width and
            ignores clicks; only the button inside the max-w-5xl inner div
            is interactive. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-6">
          <div className="flex w-full max-w-5xl justify-end">
            <Link
              href="/record"
              className={`${buttonVariants({ variant: "primary", size: "lg" })} pointer-events-auto shadow-[0_8px_24px_rgba(219,39,119,0.35)]`}
            >
              <Video className="h-4 w-4" />
              Start recording
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

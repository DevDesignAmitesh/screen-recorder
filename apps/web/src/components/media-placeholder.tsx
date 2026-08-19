import { ImageIcon } from "lucide-react";

/** Stand-in for real screenshots/video — swap the parent's content for an
 * <img>/<video> once you have the real asset; this just reserves the
 * space and makes it obvious what's missing rather than looking broken. */
export function MediaPlaceholder({ label, aspect = "16/9" }: { label: string; aspect?: string }) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground"
      style={{ aspectRatio: aspect }}
    >
      <ImageIcon className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

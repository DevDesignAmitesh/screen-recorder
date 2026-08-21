import type { ButtonHTMLAttributes, ReactNode } from "react";

// Small circular icon-only control with a hover tooltip explaining the
// action — the Google Meet mute/camera-toggle look. `label` doubles as the
// accessible name (aria-label) and the tooltip text, so the icon never has
// to carry meaning on its own.

type Variant = "default" | "active" | "destructive";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-muted text-foreground hover:bg-border",
  active: "bg-primary text-primary-foreground hover:bg-primary-hover",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  children: ReactNode;
}

export function IconButton({ label, variant = "default", className = "", children, ...props }: IconButtonProps) {
  return (
    <div className="group/icon-btn relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 transition-opacity duration-150 group-hover/icon-btn:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

// Anonymous per-browser identifier for the no-signup /try page (see
// app/try/page.tsx) — there's no account here, so this is the closest
// thing to "unique user" available: a UUID generated once and persisted
// in localStorage. Per-browser-profile, not per-physical-device —
// clearing storage, a different browser, or incognito all count as
// "new". That's an honest limitation, not a bug: anything more precise
// would mean fingerprinting or requiring an account, which defeats the
// point of a no-signup trial.

const STORAGE_KEY = "screensy_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private browsing / storage disabled — fall back to a per-call id.
    // Usage tracking degrades gracefully (this recording just won't be
    // attributable to any other attempt), nothing else about the page breaks.
    return crypto.randomUUID();
  }
}

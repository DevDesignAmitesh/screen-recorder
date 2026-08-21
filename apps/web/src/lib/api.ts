import type { CreateRecordingInput, LoginInput, SignupInput } from "@screen-recorder/common";

// Thin fetch wrapper around the Express API (apps/server). Every call
// hits NEXT_PUBLIC_API_URL directly from the browser — there's no Next.js
// server layer in between for auth, so the auth token is just a bearer
// token the client attaches itself (see auth-context.tsx).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Something went wrong", res.status);
  }

  return data as T;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  signup: (input: SignupInput) =>
    request<AuthResponse>("/api/v1/auth/signup", { method: "POST", body: input }),

  login: (input: LoginInput) => request<AuthResponse>("/api/v1/auth/login", { method: "POST", body: input }),

  me: (token: string) => request<{ user: AuthUser }>("/api/v1/auth/me", { token }),
};

export interface Wallpaper {
  id: string;
  name: string;
  url: string;
  isDefault: boolean;
  createdAt: string;
  ownerId: string | null;
}

export const wallpapersApi = {
  list: () => request<{ wallpapers: Wallpaper[] }>("/api/v1/wallpapers"),
};

export interface Recording {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  ownerId: string;
  wallpaperId: string | null;
  wallpaper?: { id: string; name: string; url: string } | null;
}

export const recordingsApi = {
  create: (input: CreateRecordingInput, token: string) =>
    request<{ recording: Recording }>("/api/v1/recordings", { method: "POST", body: input, token }),

  list: (token: string) => request<{ recordings: Recording[] }>("/api/v1/recordings", { token }),

  remove: (id: string, token: string) => request<void>(`/api/v1/recordings/${id}`, { method: "DELETE", token }),

  streamStart: (mimeType: string, token: string) =>
    request<{ sessionId: string }>("/api/v1/recordings/stream/start", { method: "POST", body: { mimeType }, token }),

  /** Raw binary POST — bypasses `request()`'s JSON body/parsing since this
   * is a chunk of video, not JSON. Rejects with an `ApiError` whose
   * message is the server's reject reason (e.g. "size-limit") on a
   * non-2xx, so callers can distinguish a hit-the-cap rejection from a
   * transient network failure. */
  streamChunk: async (sessionId: string, sequence: number, chunk: Blob, token: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/v1/recordings/stream/${sessionId}/chunk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Chunk-Sequence": String(sequence),
        Authorization: `Bearer ${token}`,
      },
      body: chunk,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error ?? "Chunk upload failed", res.status);
    }
  },

  streamFinish: (sessionId: string, token: string) =>
    request<{ ok: true }>(`/api/v1/recordings/stream/${sessionId}/finish`, { method: "POST", token }),

  /** Returns the raw Response so the caller can read it as a Blob and
   * inspect headers — not run through `request()`'s JSON parsing. */
  streamDownload: async (sessionId: string, token: string): Promise<Response> => {
    const res = await fetch(`${API_URL}/api/v1/recordings/stream/${sessionId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error ?? "Download failed", res.status);
    }
    return res;
  },
};

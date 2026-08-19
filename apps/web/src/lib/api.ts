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
};

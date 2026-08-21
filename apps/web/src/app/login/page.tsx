"use client";

import { loginSchema } from "@screen-recorder/common";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError, authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (a stored token resolved via /me) — this page is for
  // logging in, so bounce straight to the dashboard instead of showing the form.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      const { token, user } = await authApi.login(parsed.data);
      setSession(token, user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <>
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-6 pb-6 pt-28">
          <Spinner className="h-6 w-6 text-muted-foreground" />
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 pb-6 pt-28">
        <div className="w-full max-w-sm space-y-6 rounded-[1.75rem] border border-border bg-card p-8">
          <div className="space-y-1 text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Log in</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && <Alert>{error}</Alert>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-foreground underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

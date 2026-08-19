import { Router } from "express";

export const authRouter: Router = Router();

/**
 * POST /api/v1/auth/signup
 *
 * Create a new (unverified) user account.
 *   1. Validate body: { email, password }.
 *   2. Check email isn't already registered (@screen-recorder/db).
 *   3. Hash the password (bcrypt/argon2) and create the User row
 *      with `emailVerified: false`.
 *   4. Generate a 6-digit OTP, store it (OtpCode table) with an
 *      expiry (e.g. 10 min), tied to the user's email.
 *   5. Send the OTP via @screen-recorder/notifications (email channel,
 *      Resend under the hood).
 *   6. Respond 201 with a message to check email — do NOT issue an
 *      auth token yet; the account is unverified until step below.
 */
authRouter.post("/signup", (req, res) => {
  res.status(501).json({ error: "POST /auth/signup not implemented yet" });
});

/**
 * POST /api/v1/auth/verify-otp
 *
 * Verify the OTP sent on signup and activate the account.
 *   1. Validate body: { email, otp }.
 *   2. Look up the latest non-expired OtpCode for that email.
 *   3. Compare the submitted code; on mismatch/expiry return 400.
 *   4. On success: mark User.emailVerified = true, delete/invalidate
 *      the OTP row.
 *   5. Issue an auth token (JWT) and return it — user is now logged in.
 */
authRouter.post("/verify-otp", (req, res) => {
  res.status(501).json({ error: "POST /auth/verify-otp not implemented yet" });
});

/**
 * POST /api/v1/auth/resend-otp
 *
 * Re-send a fresh OTP for an unverified account.
 *   1. Validate body: { email }.
 *   2. Ensure the user exists and isn't already verified.
 *   3. Invalidate any previous OTP rows for that email.
 *   4. Generate + store a new OTP, send via @screen-recorder/notifications.
 *   5. Respond 200. Consider rate-limiting this endpoint.
 */
authRouter.post("/resend-otp", (req, res) => {
  res.status(501).json({ error: "POST /auth/resend-otp not implemented yet" });
});

/**
 * POST /api/v1/auth/login
 *
 * Authenticate a verified user with email + password.
 *   1. Validate body: { email, password }.
 *   2. Look up user by email; 401 if not found.
 *   3. Reject if `emailVerified` is false (ask them to verify first).
 *   4. Compare password hash; 401 on mismatch.
 *   5. Issue an auth token (JWT, short-lived) + return user profile.
 */
authRouter.post("/login", (req, res) => {
  res.status(501).json({ error: "POST /auth/login not implemented yet" });
});

/**
 * POST /api/v1/auth/logout
 *
 * Invalidate the current session/token.
 *   1. If using stateless JWTs: instruct client to discard the token
 *      (and/or clear the auth cookie if we store it in a cookie).
 *   2. If we later add refresh-token/session tracking, revoke it here.
 */
authRouter.post("/logout", (req, res) => {
  res.status(501).json({ error: "POST /auth/logout not implemented yet" });
});

/**
 * GET /api/v1/auth/me
 *
 * Return the currently authenticated user's profile.
 * Protected by `requireAuth` middleware — req.user is populated by then.
 */
authRouter.get("/me", (req, res) => {
  res.status(501).json({ error: "GET /auth/me not implemented yet" });
});

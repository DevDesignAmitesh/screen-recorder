import { Resend } from "resend";

import type { NotificationChannel } from "../types.js";

/**
 * EmailChannel — sends transactional email via Resend.
 *
 * Skeleton for now. Once implemented, `sendOtp` will:
 *   1. Instantiate the Resend client with RESEND_API_KEY.
 *   2. Render a simple OTP email (subject + body/template) with the code.
 *   3. Call resend.emails.send({ from, to: destination, subject, html }).
 *   4. Throw on failure so the caller (e.g. /auth/signup) can surface
 *      an error instead of silently pretending the email went out.
 */
export class EmailChannel implements NotificationChannel {
  private client: Resend;

  constructor(apiKey: string = process.env.RESEND_API_KEY ?? "") {
    this.client = new Resend(apiKey);
  }

  async sendOtp(destination: string, code: string): Promise<void> {
    throw new Error("EmailChannel.sendOtp not implemented yet");
  }
}

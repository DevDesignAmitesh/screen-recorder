import { Resend } from "resend";

import type { NotificationChannel } from "../types.js";

const FROM_ADDRESS = process.env.NOTIFICATIONS_FROM_EMAIL ?? "onboarding@resend.dev";

/**
 * EmailChannel — sends transactional email via Resend.
 *
 * If RESEND_API_KEY isn't set (e.g. local dev before you've created a
 * Resend account), it falls back to logging the code to the console
 * instead of throwing — so the signup/login flow stays testable end to
 * end without a real email provider wired up yet. Set RESEND_API_KEY to
 * switch to real delivery.
 */
export class EmailChannel implements NotificationChannel {
  private client: Resend | null;

  constructor(apiKey: string = process.env.RESEND_API_KEY ?? "") {
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  async sendOtp(destination: string, code: string): Promise<void> {
    if (!this.client) {
      console.warn(
        `[notifications] RESEND_API_KEY not set — logging OTP instead of emailing it.\n` +
          `  to: ${destination}\n  code: ${code}`
      );
      return;
    }

    const { error } = await this.client.emails.send({
      from: FROM_ADDRESS,
      to: destination,
      subject: `${code} is your verification code`,
      html: `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes.</p>`,
    });

    if (error) {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }
}

import type { NotificationChannel } from "../types.js";

/**
 * SmsChannel — placeholder for a future phone-number OTP flow via Twilio.
 *
 * Not wired up yet (no dependency on `twilio` added, no route uses this
 * channel). Kept here so the shape of the package already anticipates
 * SMS/phone-based verification without requiring a restructure later:
 * once needed, implement `sendOtp` using the Twilio SDK the same way
 * EmailChannel uses Resend, and register it in `getChannel()` in
 * src/index.ts.
 */
export class SmsChannel implements NotificationChannel {
  async sendOtp(destination: string, code: string): Promise<void> {
    throw new Error("SmsChannel is not implemented yet (Twilio integration pending)");
  }
}

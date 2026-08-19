/**
 * A notification channel is anything capable of delivering a message to a
 * destination (an email address, a phone number, etc). Each concrete
 * channel (email/Resend now, sms/Twilio later, push notifications
 * further down the line) implements this same shape so callers in
 * apps/server don't need to care which provider is behind it.
 */
export interface NotificationChannel {
  /** Send an OTP code to the given destination. */
  sendOtp(destination: string, code: string): Promise<void>;
}

export type NotificationChannelName = "email" | "sms";

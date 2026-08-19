import { EmailChannel } from "./channels/email.js";
import { SmsChannel } from "./channels/sms.js";
import type { NotificationChannel, NotificationChannelName } from "./types.js";

export type { NotificationChannel, NotificationChannelName } from "./types.js";

const channels: Record<NotificationChannelName, NotificationChannel> = {
  email: new EmailChannel(),
  sms: new SmsChannel(),
};

/** Look up a channel by name (e.g. to send via email today, sms later). */
export function getChannel(name: NotificationChannelName): NotificationChannel {
  return channels[name];
}

/**
 * sendOtp — convenience wrapper used by apps/server's auth routes.
 * Defaults to the "email" channel (current MVP); pass "sms" once phone
 * verification via Twilio is implemented.
 */
export async function sendOtp(
  destination: string,
  code: string,
  channel: NotificationChannelName = "email"
): Promise<void> {
  return getChannel(channel).sendOtp(destination, code);
}

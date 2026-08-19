// This package wraps the S3-compatible bucket (AWS S3 / Cloudflare R2)
// used for all user-generated media: exported recordings AND uploaded
// wallpaper images. Both apps/server route groups (recordings, wallpapers)
// go through these same functions rather than touching the S3 SDK directly.

export { BUCKET_NAME, s3 } from "./client.js";

/**
 * uploadFile
 *
 * Upload a file buffer/stream to the bucket under `key` and return its
 * stored key (and/or public URL, depending on bucket ACL setup).
 *   1. Build a PutObjectCommand (bucket, key, body, contentType).
 *   2. Send via the shared S3Client.
 *   3. Return the key (callers persist this in Prisma — Wallpaper.url /
 *      Recording.url) plus a derived public/CDN URL if the bucket is
 *      public, or leave URL construction to getSignedDownloadUrl below
 *      if objects are private.
 *
 * Typical keys:
 *   - `wallpapers/{userId}/{uuid}.{ext}`
 *   - `recordings/{userId}/{uuid}.webm`
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string
): Promise<{ key: string }> {
  throw new Error("uploadFile not implemented yet");
}

/**
 * getSignedDownloadUrl
 *
 * Generate a time-limited signed URL for a private object (used when the
 * bucket isn't public — e.g. streaming/downloading a user's recording).
 *   1. Build a GetObjectCommand (bucket, key).
 *   2. Use @aws-sdk/s3-request-presigner's getSignedUrl with an expiry
 *      (e.g. 1 hour).
 */
export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  throw new Error("getSignedDownloadUrl not implemented yet");
}

/**
 * deleteFile
 *
 * Remove an object from the bucket (used when a user deletes a wallpaper
 * or a recording).
 *   1. Build a DeleteObjectCommand (bucket, key).
 *   2. Send via the shared S3Client.
 */
export async function deleteFile(key: string): Promise<void> {
  throw new Error("deleteFile not implemented yet");
}

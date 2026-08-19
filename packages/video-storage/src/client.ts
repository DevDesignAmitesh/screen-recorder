import { S3Client } from "@aws-sdk/client-s3";

// S3-compatible client (works with AWS S3 or Cloudflare R2 — R2 just needs
// a custom `endpoint`). Configured entirely via env vars so swapping
// providers doesn't touch any calling code in apps/server.
export const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint: process.env.STORAGE_ENDPOINT, // e.g. R2 account endpoint; omit for real AWS S3
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
  },
});

export const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME ?? "";

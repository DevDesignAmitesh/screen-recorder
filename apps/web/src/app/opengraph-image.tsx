import { ImageResponse } from "next/og";

import { PRODUCT_NAME } from "@/lib/constants";

// Generated Open Graph / Twitter card image — shown as the preview when a
// link to this site is shared on social/chat apps. Placeholder branding
// (gradient + wordmark) until a real screenshot/logo asset is ready; swap
// the JSX below for an <img> of that asset when it exists.

export const alt = `${PRODUCT_NAME} — screen recording with face cam and wallpapers`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          backgroundImage: "linear-gradient(135deg, #db2777 0%, #f6416c 45%, #f8b500 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 22,
              background: "rgba(255,255,255,0.22)",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 999,
                background: "#ffffff",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -2,
            }}
          >
            {PRODUCT_NAME}
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.92)",
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          Screen recording with face cam, wallpapers, and templates.
        </div>
      </div>
    ),
    { ...size }
  );
}

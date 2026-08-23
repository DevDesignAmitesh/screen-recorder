// Draws the composited frame — wallpaper background, the screen share
// inset with rounded corners (with a manual crop so browser chrome/OS
// taskbars can be cut out — we can't reliably auto-detect those), and (if
// enabled) a fixed circular webcam overlay in the bottom-right corner —
// onto a canvas, continuously. canvas.captureStream() (see recorder.ts)
// reads straight off this canvas, so whatever's drawn here is what gets
// recorded.
//
// The draw loop is ticked from a Web Worker, not requestAnimationFrame or
// a main-thread setInterval. Both of those are throttled by the browser
// once the *tab running this recorder* is backgrounded (e.g. the user
// switches tabs mid-recording) — rAF effectively pauses entirely, and a
// main-thread setInterval gets clamped to roughly once a second. Either
// way the canvas stops updating at anything close to real time, which
// showed up as the recorded video lagging further and further behind the
// (separately-piped, unthrottled) mic audio the longer the tab stayed
// backgrounded. A timer running inside a Worker isn't subject to that
// same page-visibility throttling, so it keeps ticking at the real rate
// regardless of which tab is focused — the worker just pings the main
// thread on each tick to run the actual (DOM/canvas-bound) draw call.
//
// v1 has no template/position picker (see project README) — the webcam
// overlay spot is fixed.

export interface CompositorOptions {
  width: number;
  height: number;
}

/** Fractions (0–1) of the raw screen-share video to cut off each edge —
 * for trimming out a browser's tab bar / OS taskbar, since there's no
 * reliable way to detect those automatically. */
export interface ScreenCrop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const NO_CROP: ScreenCrop = { top: 0, bottom: 0, left: 0, right: 0 };

const WEBCAM_RADIUS = 110;
const WEBCAM_MARGIN = 48;
const TARGET_FPS = 30;

// Proportions of the canvas's own width/height, so the frame scales
// correctly regardless of the exact canvas size (see CANVAS_WIDTH/HEIGHT
// in the record page).
const FRAME_MARGIN = 0.06;
const FRAME_RADIUS = 0.025;

// Deliberately a plain string run inside a Blob-URL worker rather than a
// separate .ts file — that sidesteps needing any bundler-specific worker
// loading config, and it's simple enough (just "tick on an interval") not
// to need real module tooling.
function tickerWorkerSource(intervalMs: number): string {
  return `
    let id = null;
    self.onmessage = (e) => {
      if (e.data === "start") {
        if (id !== null) return;
        id = setInterval(() => self.postMessage("tick"), ${intervalMs});
      } else if (e.data === "stop") {
        if (id !== null) { clearInterval(id); id = null; }
      }
    };
  `;
}

export class Compositor {
  private ctx: CanvasRenderingContext2D;
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private fallbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private wallpaperImg: HTMLImageElement | null = null;
  private screenVideo: HTMLVideoElement | null = null;
  private webcamVideo: HTMLVideoElement | null = null;
  private screenCrop: ScreenCrop = NO_CROP;

  constructor(
    private canvas: HTMLCanvasElement,
    options: CompositorOptions
  ) {
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
  }

  setWallpaper(img: HTMLImageElement | null) {
    this.wallpaperImg = img;
  }

  setScreenVideo(video: HTMLVideoElement | null) {
    this.screenVideo = video;
  }

  setWebcamVideo(video: HTMLVideoElement | null) {
    this.webcamVideo = video;
  }

  /** Fractions (0–1) trimmed off each edge of the raw screen video before
   * it's fit into the mockup frame — for cutting out a tab bar/taskbar. */
  setScreenCrop(crop: Partial<ScreenCrop>) {
    this.screenCrop = { ...NO_CROP, ...crop };
  }

  start() {
    if (this.worker || this.fallbackIntervalId !== null) return;
    const intervalMs = 1000 / TARGET_FPS;

    if (typeof Worker === "undefined") {
      // Extremely unlikely for the Chromium browsers this app targets,
      // but fall back to the (throttle-prone) main-thread timer rather
      // than crashing if Workers genuinely aren't available.
      this.fallbackIntervalId = setInterval(() => this.drawFrame(), intervalMs);
      return;
    }

    const blob = new Blob([tickerWorkerSource(intervalMs)], { type: "application/javascript" });
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);
    this.worker.onmessage = () => this.drawFrame();
    this.worker.postMessage("start");
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    if (this.fallbackIntervalId !== null) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
    }
  }

  private drawFrame() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    if (this.wallpaperImg?.complete) {
      drawCover(ctx, this.wallpaperImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, width, height);
    }

    this.drawScreenFrame(width, height);
    this.drawWebcamOverlay(width, height);
  }

  /** Just the screen-share, inset from the canvas edges (so the wallpaper
   * shows around it) with rounded corners and a soft shadow — no extra
   * chrome/frame drawn around it. */
  private drawScreenFrame(width: number, height: number) {
    const { ctx } = this;

    const frameX = width * FRAME_MARGIN;
    const frameY = height * FRAME_MARGIN;
    const frameW = width - frameX * 2;
    const frameH = height - frameY * 2;
    const radius = width * FRAME_RADIUS;

    // Soft shadow behind the frame.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = width * 0.018;
    ctx.shadowOffsetY = height * 0.01;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, radius);
    ctx.clip();
    ctx.fillStyle = "#111";
    ctx.fillRect(frameX, frameY, frameW, frameH);
    if (this.screenVideo && this.screenVideo.readyState >= 2) {
      // Cover-fit, not contain — fills the frame completely (cropping any
      // excess) so there's never a black letterbox/pillarbox bar showing
      // when the shared screen's aspect ratio doesn't exactly match.
      drawCoverCropped(ctx, this.screenVideo, this.screenCrop, frameX, frameY, frameW, frameH);
    }
    ctx.restore();
  }

  private drawWebcamOverlay(width: number, height: number) {
    if (!this.webcamVideo || this.webcamVideo.readyState < 2) return;
    const { ctx } = this;

    const cx = width - WEBCAM_MARGIN - WEBCAM_RADIUS;
    const cy = height - WEBCAM_MARGIN - WEBCAM_RADIUS;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, WEBCAM_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, WEBCAM_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCover(ctx, this.webcamVideo, cx - WEBCAM_RADIUS, cy - WEBCAM_RADIUS, WEBCAM_RADIUS * 2, WEBCAM_RADIUS * 2);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, WEBCAM_RADIUS, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.restore();
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

type Drawable = HTMLImageElement | HTMLVideoElement;

function sourceSize(source: Drawable): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  return { w: source.naturalWidth, h: source.naturalHeight };
}

/** Draw `source` to cover the target rect (cropping overflow) — like CSS `background-size: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, source: Drawable, x: number, y: number, w: number, h: number) {
  const { w: sw, h: sh } = sourceSize(source);
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Draw `source` to cover the target rect (cropping overflow, no black
 * letterbox/pillarbox bars), first trimming `crop` fractions off each
 * edge of the source — like CSS `background-size: cover` plus a manual
 * crop. Relies on the caller having already clipped the canvas to the
 * target rect, since the scaled draw can extend past it. */
function drawCoverCropped(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement,
  crop: ScreenCrop,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const sw = source.videoWidth;
  const sh = source.videoHeight;
  if (!sw || !sh) return;

  // Fixed cover-fit scale from the FULL, uncropped source — deliberately
  // NOT recomputed from the cropped dimensions below. Deriving scale from
  // the shrunken srcW/srcH would couple the two axes: trimming only the
  // top/bottom raises h/srcH, which raises scale for width too, causing
  // an unrequested zoom that also clips the left/right edges (and
  // symmetrically for a left/right-only crop). Keeping scale fixed means
  // a crop only ever removes source pixels — it never re-zooms the rest.
  const scale = Math.max(w / sw, h / sh);
  const fullDw = sw * scale;
  const fullDh = sh * scale;
  const fullDx = x + (w - fullDw) / 2;
  const fullDy = y + (h - fullDh) / 2;

  const cropLeftPx = sw * clamp01(crop.left);
  const cropRightPx = sw * clamp01(crop.right);
  const cropTopPx = sh * clamp01(crop.top);
  const cropBottomPx = sh * clamp01(crop.bottom);
  const srcW = Math.max(1, sw - cropLeftPx - cropRightPx);
  const srcH = Math.max(1, sh - cropTopPx - cropBottomPx);

  ctx.drawImage(
    source,
    cropLeftPx,
    cropTopPx,
    srcW,
    srcH,
    fullDx + cropLeftPx * scale,
    fullDy + cropTopPx * scale,
    srcW * scale,
    srcH * scale
  );
}

function clamp01(n: number): number {
  return Math.min(0.9, Math.max(0, n));
}

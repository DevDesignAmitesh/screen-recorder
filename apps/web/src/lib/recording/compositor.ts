// Draws the composited frame — wallpaper background, a padded/rounded
// screen-share frame, and (if enabled) a fixed circular webcam overlay in
// the bottom-right corner — onto a canvas, continuously. canvas.captureStream()
// (see recorder.ts) reads straight off this canvas, so whatever's drawn
// here is what gets recorded.
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

const FRAME_PADDING = 90;
const FRAME_RADIUS = 24;
const WEBCAM_RADIUS = 110;
const WEBCAM_MARGIN = 48;
const TARGET_FPS = 30;

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

    const frameX = FRAME_PADDING;
    const frameY = FRAME_PADDING;
    const frameW = width - FRAME_PADDING * 2;
    const frameH = height - FRAME_PADDING * 2;

    // Drop shadow behind the frame.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, FRAME_RADIUS);
    ctx.fillStyle = "#111";
    ctx.fill();
    ctx.restore();

    // Screen-share video, clipped to the rounded frame, letterboxed to fit.
    ctx.save();
    roundedRectPath(ctx, frameX, frameY, frameW, frameH, FRAME_RADIUS);
    ctx.clip();
    ctx.fillStyle = "#111";
    ctx.fillRect(frameX, frameY, frameW, frameH);
    if (this.screenVideo && this.screenVideo.readyState >= 2) {
      drawContain(ctx, this.screenVideo, frameX, frameY, frameW, frameH);
    }
    ctx.restore();

    if (this.webcamVideo && this.webcamVideo.readyState >= 2) {
      const cx = width - WEBCAM_MARGIN - WEBCAM_RADIUS;
      const cy = height - WEBCAM_MARGIN - WEBCAM_RADIUS;

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

/** Draw `source` to fit within the target rect (letterboxed) — like CSS `object-fit: contain`. */
function drawContain(ctx: CanvasRenderingContext2D, source: Drawable, x: number, y: number, w: number, h: number) {
  const { w: sw, h: sh } = sourceSize(source);
  if (!sw || !sh) return;
  const scale = Math.min(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

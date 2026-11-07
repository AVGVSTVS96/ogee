import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";
import { availableParallelism } from "node:os";

import chromium from "@sparticuz/chromium";
import ffmpeg from "ffmpeg-static";
import { chromium as playwright } from "playwright-core";
import type { Browser, Page } from "playwright-core";

import { virtualClockScript } from "./virtual-clock.ts";

const LOAD_TIMEOUT_MS = 15_000;
const STILL_SCALE = 2;
const VIDEO_SCALE = 1.5;
const HEAD = /<head[^>]*>/iu;
const LANES = availableParallelism();

let running: Promise<Browser> | undefined;

const launch = async () => {
  const browser = await playwright.launch({
    args: [
      ...chromium.args.filter((arg) => arg !== "--single-process"),
      "--disable-gpu-compositing",
    ],
    executablePath: await chromium.executablePath(),
  });

  browser.on("disconnected", () => {
    running = undefined;
  });

  return browser;
};

const shared = async () => {
  running ??= launch();

  try {
    return await running;
  } catch (error) {
    running = undefined;
    throw error;
  }
};

const open = async (html: string, width: number, height: number, scale: number) => {
  const browser = await shared();

  const context = await browser.newContext({
    deviceScaleFactor: scale,
    viewport: { height, width },
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  try {
    await page.setContent(html, { timeout: LOAD_TIMEOUT_MS, waitUntil: "load" });
  } catch (error) {
    await context.close();
    throw error;
  }

  const capture = async (format: "jpeg" | "png") => {
    const { data } = await cdp.send("Page.captureScreenshot", {
      clip: { height, scale, width, x: 0, y: 0 },
      format,
      optimizeForSpeed: true,
      ...(format === "jpeg" && { quality: 92 }),
    });

    return Buffer.from(data, "base64");
  };

  return {
    capture,
    close: async () => {
      await context.close();
    },
    page,
  };
};

export const screenshot = async (html: string, width: number, height: number) => {
  const { capture, close } = await open(html, width, height, STILL_SCALE);

  try {
    return await capture("png");
  } finally {
    await close();
  }
};

const withVirtualClock = (html: string) => {
  const tag = `<script>${virtualClockScript}</script>`;

  return HEAD.test(html) ? html.replace(HEAD, (head) => head + tag) : tag + html;
};

const encoderArgs = (fps: number, out: string) => [
  "-f",
  "image2pipe",
  "-framerate",
  `${fps}`,
  "-i",
  "-",
  "-vf",
  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "20",
  "-preset",
  "veryfast",
  "-movflags",
  "+faststart",
  "-an",
  out,
];

const step = async (page: Page, steps: number, ms: number) => {
  await page.evaluate(
    ([count, each]) => {
      for (let i = 0; i < count; i += 1) {
        window.__advance(each);
      }
    },
    [steps, ms] as const,
  );
};

export const record = async (
  html: string,
  width: number,
  height: number,
  seconds: number,
  fps = 30,
) => {
  if (ffmpeg === null) {
    throw new Error("ffmpeg-static has no binary for this platform");
  }

  const timed = withVirtualClock(html);
  const total = Math.max(1, Math.round(seconds * fps));
  const lanes = Math.min(LANES, total);
  const out = `/tmp/${crypto.randomUUID()}.mp4`;
  const encoder = spawn(ffmpeg, encoderArgs(fps, out), { stdio: ["pipe", "ignore", "ignore"] });
  const closed = once(encoder, "close");
  const frames: Buffer[] = [];
  let written = 0;

  const lane = async (first: number) => {
    const { capture, close, page } = await open(timed, width, height, VIDEO_SCALE);

    try {
      await step(page, 1, 0);
      await step(page, first, 1000 / fps);

      for (let i = first; i < total; i += lanes) {
        frames[i] = await capture("jpeg");

        for (; frames[written] !== undefined; written += 1) {
          encoder.stdin.write(frames[written]);
        }

        await step(page, lanes, 1000 / fps);
      }
    } finally {
      await close();
    }
  };

  try {
    const ran = await Promise.allSettled(
      Array.from({ length: lanes }, async (_, first) => {
        await lane(first);
      }),
    );

    const failed = ran.find((result) => result.status === "rejected");

    if (failed !== undefined) {
      throw failed.reason;
    }

    encoder.stdin.end();
    await closed;

    if (encoder.exitCode !== 0) {
      throw new Error(`ffmpeg exited ${String(encoder.exitCode)}`);
    }

    return { poster: frames[total - 1] ?? Buffer.alloc(0), video: await readFile(out) };
  } finally {
    encoder.kill();
    await rm(out, { force: true });
  }
};

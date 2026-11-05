import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";

import chromium from "@sparticuz/chromium";
import ffmpeg from "ffmpeg-static";
import { chromium as playwright } from "playwright-core";

import { virtualClockScript } from "./virtual-clock.ts";

const LOAD_TIMEOUT_MS = 15_000;
const STILL_SCALE = 2;
const VIDEO_SCALE = 1.5;
const HEAD = /<head[^>]*>/iu;

const open = async (html: string, width: number, height: number, scale: number) => {
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
  });

  const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { height, width } });

  await page.setContent(html, { timeout: LOAD_TIMEOUT_MS, waitUntil: "load" });

  return { browser, page };
};

export const screenshot = async (html: string, width: number, height: number) => {
  const { browser, page } = await open(html, width, height, STILL_SCALE);

  try {
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
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

  const { browser, page } = await open(withVirtualClock(html), width, height, VIDEO_SCALE);
  const out = `/tmp/${crypto.randomUUID()}.mp4`;

  try {
    const encoder = spawn(ffmpeg, encoderArgs(fps, out), { stdio: ["pipe", "ignore", "ignore"] });
    const closed = once(encoder, "close");
    let frame: Buffer = Buffer.alloc(0);

    for (let i = 0; i < seconds * fps; i += 1) {
      await page.evaluate(
        (ms) => {
          window.__advance(ms);
        },
        i === 0 ? 0 : 1000 / fps,
      );
      frame = await page.screenshot({ quality: 92, type: "jpeg" });
      encoder.stdin.write(frame);
    }

    encoder.stdin.end();
    await closed;

    if (encoder.exitCode !== 0) {
      throw new Error(`ffmpeg exited ${String(encoder.exitCode)}`);
    }

    return { poster: frame, video: await readFile(out) };
  } finally {
    await browser.close();
    await rm(out, { force: true });
  }
};

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
const VIDEO_FPS = 30;
const VIDEO_BROWSERS = 2;
const HEAD = /<head[^>]*>/iu;

chromium.setGraphicsMode = false;

const softwarePaintingWithWebgl = [
  ...chromium.args.filter((arg) => arg !== "--disable-webgl"),
  "--enable-unsafe-swiftshader",
];

const open = async (html: string, width: number, height: number, scale: number) => {
  const browser = await playwright.launch({
    args: softwarePaintingWithWebgl,
    executablePath: await chromium.executablePath(),
  });

  const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { height, width } });

  await page.setContent(html, { timeout: LOAD_TIMEOUT_MS, waitUntil: "load" });
  await page.evaluate(async () => await document.fonts.ready);

  const devtools = await page.context().newCDPSession(page);

  const capture = async (format: "jpeg" | "png") => {
    const { data } = await devtools.send("Page.captureScreenshot", {
      clip: { height, scale, width, x: 0, y: 0 },
      format,
      optimizeForSpeed: true,
      ...(format === "jpeg" && { quality: 92 }),
    });

    return Buffer.from(data, "base64");
  };

  return { browser, capture, page };
};

export const screenshot = async (html: string, width: number, height: number) => {
  const { browser, capture } = await open(html, width, height, STILL_SCALE);

  try {
    return await capture("png");
  } finally {
    await browser.close();
  }
};

const withVirtualClock = (html: string) => {
  const tag = `<script>${virtualClockScript}</script>`;

  return HEAD.test(html) ? html.replace(HEAD, (head) => head + tag) : tag + html;
};

const encoderArgs = (out: string) => [
  "-f",
  "image2pipe",
  "-framerate",
  `${VIDEO_FPS}`,
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

const clockSteps = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, n) => (from + n === 0 ? 0 : 1000 / VIDEO_FPS));

export const record = async (html: string, width: number, height: number, seconds: number) => {
  if (ffmpeg === null) {
    throw new Error("ffmpeg-static has no binary for this platform");
  }

  const frames = Math.ceil(seconds * VIDEO_FPS);
  const browsers = Math.min(VIDEO_BROWSERS, frames);
  const out = `/tmp/${crypto.randomUUID()}.mp4`;
  const encoder = spawn(ffmpeg, encoderArgs(out), { stdio: ["pipe", "ignore", "ignore"] });
  const closed = once(encoder, "close");
  const waiting = new Map<number, Buffer>();
  let next = 0;
  let poster: Buffer = Buffer.alloc(0);

  const encode = (index: number, frame: Buffer) => {
    waiting.set(index, frame);

    for (let ready = waiting.get(next); ready !== undefined; ready = waiting.get(next)) {
      encoder.stdin.write(ready);
      waiting.delete(next);
      poster = ready;
      next += 1;
    }
  };

  const film = async (first: number) => {
    const { browser, capture, page } = await open(
      withVirtualClock(html),
      width,
      height,
      VIDEO_SCALE,
    );

    try {
      for (let index = first; index < frames; index += browsers) {
        const steps = clockSteps(index === first ? 0 : index - browsers + 1, index);

        await page.evaluate((ms) => {
          for (const step of ms) {
            window.__advance(step);
          }
        }, steps);
        encode(index, await capture("jpeg"));
      }
    } finally {
      await browser.close();
    }
  };

  try {
    await Promise.all(
      Array.from({ length: browsers }, async (_, first) => {
        await film(first);
      }),
    );
    encoder.stdin.end();
    await closed;

    if (encoder.exitCode !== 0) {
      throw new Error(`ffmpeg exited ${String(encoder.exitCode)}`);
    }

    return { poster, video: await readFile(out) };
  } finally {
    encoder.kill();
    await rm(out, { force: true });
  }
};

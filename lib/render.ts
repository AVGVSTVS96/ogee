import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { promisify } from "node:util";
import chromium from "@sparticuz/chromium";
import ffmpeg from "ffmpeg-static";
import puppeteer from "puppeteer-core";

async function open(html: string, width: number, height: number, scale: number) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    defaultViewport: { width, height, deviceScaleFactor: scale },
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
  return { browser, page };
}

export async function screenshot(html: string, width: number, height: number) {
  const { browser, page } = await open(html, width, height, 2);
  try {
    return Buffer.from(await page.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}

export async function record(html: string, width: number, height: number, seconds: number) {
  const { browser, page } = await open(html, width, height, 1.5);
  const webm = `/tmp/${crypto.randomUUID()}.webm` as const;
  const mp4 = webm.replace(".webm", ".mp4");
  try {
    const recorder = await page.screencast({ path: webm, ffmpegPath: ffmpeg! });
    await new Promise((r) => setTimeout(r, seconds * 1000));
    await recorder.stop();
    const poster = Buffer.from(await page.screenshot({ type: "png" }));
    await promisify(execFile)(ffmpeg!, [
      "-i", webm,
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast",
      "-movflags", "+faststart", "-an", mp4,
    ]);
    return { video: await readFile(mp4), poster };
  } finally {
    await browser.close();
    await Promise.all([rm(webm, { force: true }), rm(mp4, { force: true })]);
  }
}

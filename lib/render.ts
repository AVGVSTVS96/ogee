import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import chromium from "@sparticuz/chromium";
import ffmpeg from "ffmpeg-static";
import puppeteer from "puppeteer-core";
import { clock } from "./clock";

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

const withClock = (html: string) => {
  const tag = `<script>${clock}</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (head) => head + tag) : tag + html;
};

export async function record(html: string, width: number, height: number, seconds: number, fps = 30) {
  const { browser, page } = await open(withClock(html), width, height, 1.5);
  const out = `/tmp/${crypto.randomUUID()}.mp4`;
  try {
    const encoder = execFile(ffmpeg!, [
      "-f", "image2pipe", "-framerate", `${fps}`, "-i", "-",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast",
      "-movflags", "+faststart", "-an", out,
    ]);
    const finished = new Promise((ok, fail) => encoder.on("close", (code) => (code === 0 ? ok(code) : fail(new Error(`ffmpeg exited ${code}`)))));
    let frame = Buffer.alloc(0);
    for (let i = 0; i < seconds * fps; i++) {
      await page.evaluate((ms) => (window as unknown as { __advance(ms: number): void }).__advance(ms), i ? 1000 / fps : 0);
      frame = Buffer.from(await page.screenshot({ type: "jpeg", quality: 92, optimizeForSpeed: true }));
      encoder.stdin!.write(frame);
    }
    encoder.stdin!.end();
    await finished;
    return { video: await readFile(out), poster: frame };
  } finally {
    await browser.close();
    await rm(out, { force: true });
  }
}

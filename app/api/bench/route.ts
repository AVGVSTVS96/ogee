import os from "node:os";

import chromium from "@sparticuz/chromium";
import { chromium as playwright } from "playwright-core";
import type { Browser, Page } from "playwright-core";

import { virtualClockScript } from "@/lib/virtual-clock.ts";

export const maxDuration = 300;

const kept = new Map<string, Browser>();

const launch = async (graphics: boolean, extra: string[]) => {
  chromium.setGraphicsMode = graphics;
  const drop = new Set(extra.filter((a) => a.startsWith("-no")).map((a) => a.slice(3)));
  const args = [...chromium.args.filter((a) => !drop.has(a)), ...extra.filter((a) => !a.startsWith("-no"))];
  return await playwright.launch({ args, executablePath: await chromium.executablePath() });
};

const ms = (t: number) => Math.round(performance.now() - t);

export const POST = async (req: Request) => {
  if (req.headers.get("authorization") !== `Bearer ${process.env.OGEE_KEY ?? "x"}`) {
    return new Response("no", { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  const graphics = q.get("graphics") !== "0";
  const capture = q.get("capture") ?? "pw";
  const fmt = (q.get("fmt") ?? "png") as "png" | "jpeg" | "webp";
  const speed = q.get("speed") === "1";
  const scale = Number(q.get("scale") ?? "2");
  const frames = Number(q.get("frames") ?? "1");
  const pages = Number(q.get("pages") ?? "1");
  const reuse = q.get("reuse") === "1";
  const extra = (q.get("args") ?? "").split(" ").filter(Boolean);
  const html = await req.text();
  const t: Record<string, number | string> = {
    cpus: os.availableParallelism(),
    memGB: Math.round(os.totalmem() / 1e9),
    region: process.env.VERCEL_REGION ?? "",
  };

  let s = performance.now();
  const key = `${graphics}${extra.join()}`;
  let browser = reuse ? kept.get(key) : undefined;
  t.warm = browser === undefined ? 0 : 1;
  if (browser === undefined || !browser.isConnected()) {
    browser = await launch(graphics, extra);
    if (reuse) {
      kept.set(key, browser);
    }
  }
  t.launch = ms(s);

  const html2 = frames > 1 ? `<script>${virtualClockScript}</script>${html}` : html;
  const total = performance.now();
  let bytes = 0;
  let last: Buffer = Buffer.alloc(0);
  const one = async (index: number) => {
    let p = performance.now();
    const own = q.get("multi") === "1" && index > 0 ? await launch(graphics, extra) : browser;
    const context = await own.newContext({
      deviceScaleFactor: scale,
      viewport: { height: 630, width: 1200 },
    });
    const page: Page = await context.newPage();
    t[`page${index}`] = ms(p);
    p = performance.now();
    await page.setContent(html2, { waitUntil: "load" });
    if (q.get("fonts") === "1") {
      await page.evaluate(() => document.fonts.ready);
    }
    t[`load${index}`] = ms(p);
    const cdp = capture === "cdp" ? await page.context().newCDPSession(page) : undefined;
    if (cdp !== undefined && q.get("emul") === "1") {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        deviceScaleFactor: scale,
        height: 630,
        mobile: false,
        width: 1200,
      });
    }
    const clip =
      q.get("clip") === "1" ? { clip: { height: 630, scale, width: 1200, x: 0, y: 0 } } : {};
    p = performance.now();
    let advance = 0;
    for (let i = index; i < frames; i += pages) {
      if (frames > 1) {
        const a = performance.now();
        await page.evaluate((step) => {
          window.__advance(step);
        }, i === index ? (i * 1000) / 30 : (pages * 1000) / 30);
        advance += performance.now() - a;
      }
      if (cdp === undefined) {
        const buf = await page.screenshot({
          type: fmt === "webp" ? "png" : fmt,
          ...(fmt === "jpeg" && { quality: 92 }),
          ...(q.get("caret") === "1" && { caret: "initial" as const }),
        });
        bytes += buf.length;
        last = buf;
      } else {
        const { data } = await cdp.send("Page.captureScreenshot", {
          format: fmt,
          ...(fmt !== "png" && { quality: 92 }),
          optimizeForSpeed: speed,
          ...clip,
        });
        bytes += (data.length * 3) / 4;
        last = Buffer.from(data, "base64");
      }
    }
    t[`shots${index}`] = ms(p);
    t[`advance${index}`] = Math.round(advance);
    p = performance.now();
    await context.close();
    if (own !== browser) {
      await own.close();
    }
    t[`ctxclose${index}`] = ms(p);
  };
  await Promise.all(Array.from({ length: pages }, (_, i) => one(i)));
  t.work = ms(total);
  t.perFrame = Math.round(Number(t.work) / frames);
  t.kb = Math.round(bytes / 1024 / frames);
  if (!reuse) {
    s = performance.now();
    await browser.close();
    t.close = ms(s);
  }
  if (q.get("out") === "1") {
    return new Response(new Uint8Array(last), { headers: { "x-t": JSON.stringify(t) } });
  }
  return Response.json(t);
};

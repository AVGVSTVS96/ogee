import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function screenshot(html: string, width: number, height: number) {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    defaultViewport: { width, height, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    return Buffer.from(await page.screenshot({ type: "png" }));
  } finally {
    await browser.close();
  }
}

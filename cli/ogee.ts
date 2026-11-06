#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { text } from "node:stream/consumers";
import { parseArgs } from "node:util";

import { serverUrl } from "../lib/site.ts";

const types = new Map([
  [".gif", "image/gif"],
  [".htm", "text/html"],
  [".html", "text/html"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const usage = `ogee <file> [--title t] [--description d] [--video seconds] [--width 1200] [--height 630] [--json]

Uploads HTML, an image or an mp4 and prints a fresh link whose chat preview shows it.
HTML is screenshotted, or recorded to video with --video. Use - to read HTML from stdin.
Needs OGEE_KEY; OGEE_URL picks the server.`;

const fail = (message: string): never => {
  console.error(`ogee: ${message}`);
  process.exit(1);
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    description: { type: "string" },
    height: { type: "string" },
    help: { short: "h", type: "boolean" },
    json: { type: "boolean" },
    title: { type: "string" },
    video: { type: "string" },
    width: { type: "string" },
  },
});

const [file] = positionals;

if (values.help === true || file === undefined) {
  console.log(usage);
  process.exit(file === undefined && values.help !== true ? 1 : 0);
}

const key = process.env.OGEE_KEY ?? fail("set OGEE_KEY");
const type = file === "-" ? "text/html" : types.get(path.extname(file).toLowerCase());

if (type === undefined) {
  fail(`can't send ${file}; use html, png, jpg, gif, webp or mp4`);
}

const body =
  file === "-"
    ? await text(process.stdin)
    : await readFile(file).catch(() => fail(`can't read ${file}`));

const { description, height, title, video, width } = values;

const query = new URLSearchParams(
  Object.entries({ description, height, title, video, width }).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

const server = process.env.OGEE_URL ?? serverUrl;

const res = await fetch(`${server}/api?${query.toString()}`, {
  body,
  headers: { authorization: `Bearer ${key}`, "content-type": type ?? "text/html" },
  method: "POST",
});

if (!res.ok) {
  fail(`${res.status} ${await res.text()}`);
}

const link = res.headers.get("location") ?? fail("the server sent no link");

console.log(values.json === true ? await res.text() : link);

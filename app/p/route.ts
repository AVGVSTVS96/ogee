const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;
  const title = q.get("t") ?? "Preview";
  const desc = q.get("d") ?? "";
  const video = q.get("v") && new URL(q.get("v")!, url.origin).href;
  const image = q.get("i") ?? `${url.origin}/card?${new URLSearchParams({ t: title, d: desc, n: q.get("n") ?? "" })}`;
  const meta: Record<string, string> = {
    "og:title": title,
    "og:description": desc,
    "og:image": image,
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:type": video ? "video.other" : "website",
    "twitter:card": video ? "player" : "summary_large_image",
    ...(video && {
      "og:video": video,
      "og:video:url": video,
      "og:video:secure_url": video,
      "og:video:type": "video/mp4",
      "og:video:width": "1280",
      "og:video:height": "720",
    }),
  };
  const tags = Object.entries(meta).map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join("\n");
  console.log("page", req.headers.get("user-agent"), url.search);
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>\n${tags}\n</head><body>${video ? `<video src="${esc(video)}" controls autoplay muted></video>` : `<img src="${esc(image)}">`}</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

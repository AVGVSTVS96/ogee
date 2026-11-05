import { type Artifact, newId, upload } from "@/lib/artifact";
import { record, screenshot } from "@/lib/render";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.PREVIEWS_KEY}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  const type = req.headers.get("content-type") ?? "";
  const body = Buffer.from(await req.arrayBuffer());
  const id = newId();
  const width = Number(q.get("width") ?? 1200);
  const height = Number(q.get("height") ?? 630);
  const art: Artifact = { title: q.get("title") ?? "", description: q.get("description") ?? undefined, width, height, image: "" };

  if (type.startsWith("text/html")) {
    art.html = body.toString();
    const seconds = Math.min(Number(q.get("video") ?? 0), 15);
    if (seconds > 0) {
      const { video, poster } = await record(art.html, width, height, seconds);
      art.video = await upload(id, "video.mp4", video, "video/mp4");
      art.image = await upload(id, "poster.png", poster, "image/png");
    } else {
      art.image = await upload(id, "preview.png", await screenshot(art.html, width, height), "image/png");
    }
  } else if (type.startsWith("video/")) {
    art.video = await upload(id, "video.mp4", body, type);
    art.image = q.get("poster") ?? art.video;
  } else if (type.startsWith("image/")) {
    art.image = await upload(id, `image.${type.split("/")[1]}`, body, type);
  } else {
    return new Response("send text/html, image/*, or video/*", { status: 415 });
  }

  await upload(id, "meta.json", JSON.stringify(art), "application/json");
  return Response.json({ url: `${new URL(req.url).origin}/${id}`, ...art, html: undefined });
}

import { newId, upload } from "@/lib/artifact.ts";
import type { Artifact } from "@/lib/artifact.ts";
import { record, screenshot } from "@/lib/render.ts";
import { parseUpload } from "@/lib/request.ts";
import { resetTiming, serverTiming, timed } from "@/lib/timing.ts";
import type { Upload } from "@/lib/request.ts";

export const maxDuration = 300;

const fromHtml = async (id: string, html: string, request: Upload) => {
  const { width, height, videoSeconds } = request;

  if (videoSeconds > 0) {
    const { video, poster } = await record(html, width, height, videoSeconds);

    return {
      image: await timed("upPoster", () => upload(id, "poster.jpg", poster, "image/jpeg")),
      video: await timed("upVideo", () => upload(id, "video.mp4", video, "video/mp4")),
    };
  }

  const still = await screenshot(html, width, height);

  return { image: await timed("upload", () => upload(id, "preview.png", still, "image/png")) };
};

const media = async (id: string, body: Buffer, request: Upload) => {
  const { kind, contentType } = request;

  if (kind === "html") {
    return await fromHtml(id, body.toString(), request);
  }

  if (kind === "video") {
    const video = await upload(id, "video.mp4", body, contentType);

    return { image: request.poster ?? video, video };
  }

  const extension = contentType.split("/")[1] ?? "png";

  return { image: await upload(id, `image.${extension}`, body, contentType) };
};

const authorized = (req: Request) => {
  const key = process.env.OGEE_KEY ?? "";

  return key !== "" && req.headers.get("authorization") === `Bearer ${key}`;
};

export const POST = async (req: Request) => {
  resetTiming();
  const t0 = performance.now();
  if (!authorized(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const request = parseUpload(req);

  if ("status" in request) {
    return new Response(request.message, { status: request.status });
  }

  const body = Buffer.from(await req.arrayBuffer());
  const id = newId();

  const art: Artifact = {
    title: request.title,
    width: request.width,
    height: request.height,
    ...(request.description !== undefined && { description: request.description }),
    ...(request.kind === "html" && { html: body.toString() }),
    ...(await media(id, body, request)),
  };

  await timed("meta", () => upload(id, "meta.json", JSON.stringify(art), "application/json"));
  const { html: _html, ...shown } = art;

  const url = `${new URL(req.url).origin}/${id}`;

  return Response.json({ url, ...shown }, { headers: { location: url, "server-timing": `${serverTiming()}, total;dur=${(performance.now() - t0).toFixed(0)}` }, status: 201 });
};

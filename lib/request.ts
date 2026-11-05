const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const MAX_SIDE = 4096;
const MAX_VIDEO_SECONDS = 15;

export interface Rejection {
  status: 400 | 415;
  message: string;
}

export type Kind = "html" | "image" | "video";

export interface Upload {
  kind: Kind;
  contentType: string;
  title: string;
  description: string | undefined;
  width: number;
  height: number;
  videoSeconds: number;
  poster: string | undefined;
}

const whole = (raw: string | null, fallback: number, max: number): number | undefined => {
  if (raw === null) {
    return fallback;
  }

  const value = Number(raw);

  return Number.isInteger(value) && value >= 0 && value <= max ? value : undefined;
};

const seconds = (raw: string | null): number | undefined => {
  const value = Number(raw ?? 0);

  return Number.isFinite(value) && value >= 0 ? Math.min(value, MAX_VIDEO_SECONDS) : undefined;
};

const kindOf = (contentType: string): Kind | undefined => {
  if (contentType.startsWith("text/html")) {
    return "html";
  }

  if (contentType.startsWith("video/")) {
    return "video";
  }

  if (contentType.startsWith("image/")) {
    return "image";
  }

  return undefined;
};

export const parseUpload = (request: Request): Upload | Rejection => {
  const query = new URL(request.url).searchParams;
  const contentType = request.headers.get("content-type") ?? "";
  const kind = kindOf(contentType);
  const width = whole(query.get("width"), DEFAULT_WIDTH, MAX_SIDE);
  const height = whole(query.get("height"), DEFAULT_HEIGHT, MAX_SIDE);
  const videoSeconds = seconds(query.get("video"));

  if (kind === undefined) {
    return { message: "send text/html, image/*, or video/*", status: 415 };
  }

  if (width === undefined || height === undefined || width === 0 || height === 0) {
    return { message: `width and height must be whole numbers from 1 to ${MAX_SIDE}`, status: 400 };
  }

  if (videoSeconds === undefined) {
    return { message: "video must be a number of seconds", status: 400 };
  }

  return {
    kind,
    contentType,
    title: query.get("title") ?? "",
    description: query.get("description") ?? undefined,
    width,
    height,
    videoSeconds,
    poster: query.get("poster") ?? undefined,
  };
};

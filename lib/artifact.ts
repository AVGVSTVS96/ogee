import { head, put } from "@vercel/blob";

export interface Artifact {
  title: string;
  description?: string;
  width: number;
  height: number;
  image: string;
  video?: string;
  html?: string;
}

const isArtifact = (value: unknown): value is Artifact =>
  typeof value === "object" &&
  value !== null &&
  "title" in value &&
  typeof value.title === "string" &&
  "image" in value &&
  typeof value.image === "string" &&
  "width" in value &&
  typeof value.width === "number" &&
  "height" in value &&
  typeof value.height === "number";

export const newId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);

export const upload = async (
  id: string,
  name: string,
  body: Buffer | string,
  contentType: string,
) => {
  const blob = await put(`${id}/${name}`, body, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });

  return blob.url;
};

const fetchMeta = async (url: string): Promise<Artifact | undefined> => {
  const response = await fetch(url);
  const meta: unknown = await response.json();

  return isArtifact(meta) ? meta : undefined;
};

export const load = async (id: string): Promise<Artifact | undefined> => {
  try {
    const meta = await head(`${id}/meta.json`);

    return await fetchMeta(meta.url);
  } catch {
    return undefined;
  }
};

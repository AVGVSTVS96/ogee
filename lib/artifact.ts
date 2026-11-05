import { head, put } from "@vercel/blob";

export type Artifact = {
  title: string;
  description?: string;
  width: number;
  height: number;
  image: string;
  video?: string;
  html?: string;
};

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export const upload = (id: string, name: string, body: Buffer | string, contentType: string) =>
  put(`${id}/${name}`, body, { access: "public", contentType, addRandomSuffix: false }).then((b) => b.url);

export async function load(id: string): Promise<Artifact | null> {
  const meta = await head(`${id}/meta.json`).catch(() => null);
  return meta && (await fetch(meta.url)).json();
}

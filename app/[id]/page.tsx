import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { load } from "@/lib/artifact";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const art = await load((await params).id);
  if (!art) return {};
  const size = { width: art.width, height: art.height };
  return {
    title: art.title,
    description: art.description,
    openGraph: {
      title: art.title,
      description: art.description,
      siteName: "previews",
      type: art.video ? "video.other" : "website",
      images: [{ url: art.image, ...size }],
      videos: art.video ? [{ url: art.video, secureUrl: art.video, type: "video/mp4", ...size }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function Artifact({ params }: Props) {
  const art = await load((await params).id);
  if (!art) notFound();
  if (art.html) return <iframe srcDoc={art.html} sandbox="allow-scripts" style={{ border: 0, width: "100vw", height: "100dvh" }} />;
  if (art.video) return <video src={art.video} poster={art.image === art.video ? undefined : art.image} controls autoPlay muted loop playsInline style={{ width: "100vw" }} />;
  return <img src={art.image} alt={art.title} style={{ width: "100vw" }} />;
}

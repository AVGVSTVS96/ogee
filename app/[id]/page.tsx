import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { load } from "@/lib/artifact.ts";
import type { Artifact } from "@/lib/artifact.ts";

interface Props {
  params: Promise<{ id: string }>;
}

const loadFrom = async ({ params }: Props) => {
  const { id } = await params;

  return await load(id);
};

const openGraph = (art: Artifact): NonNullable<Metadata["openGraph"]> => {
  const size = { height: art.height, width: art.width };

  return {
    title: art.title,
    ...(art.description !== undefined && { description: art.description }),
    images: [{ url: art.image, ...size }],
    siteName: "ogee",
    type: art.video === undefined ? "website" : "video.other",
    ...(art.video !== undefined && {
      videos: [{ secureUrl: art.video, type: "video/mp4", url: art.video, ...size }],
    }),
  };
};

export const generateMetadata = async (props: Props): Promise<Metadata> => {
  const art = await loadFrom(props);

  if (art === undefined) {
    return {};
  }

  return {
    title: art.title,
    ...(art.description !== undefined && { description: art.description }),
    openGraph: openGraph(art),
    twitter: { card: "summary_large_image" },
  };
};

const ArtifactPage = async (props: Props) => {
  const art = await loadFrom(props);

  if (art === undefined) {
    notFound();
  }

  if (art.html !== undefined) {
    return (
      <iframe
        sandbox="allow-scripts"
        srcDoc={art.html}
        style={{ border: 0, height: "100dvh", width: "100vw" }}
        title={art.title}
      />
    );
  }

  if (art.video !== undefined) {
    return (
      <video
        autoPlay
        controls
        loop
        muted
        playsInline
        {...(art.image !== art.video && { poster: art.image })}
        src={art.video}
        style={{ width: "100vw" }}
      />
    );
  }

  return (
    <Image
      alt={art.title}
      height={art.height}
      src={art.image}
      style={{ height: "auto", width: "100vw" }}
      unoptimized
      width={art.width}
    />
  );
};

export default ArtifactPage;

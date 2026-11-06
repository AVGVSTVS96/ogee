import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { load } from "@/lib/artifact.ts";
import { artifactMetadata } from "@/lib/metadata.ts";

interface Props {
  params: Promise<{ id: string }>;
}

const loadFrom = async ({ params }: Props) => {
  const { id } = await params;

  return await load(id);
};

export const generateMetadata = async (props: Props): Promise<Metadata> => {
  const art = await loadFrom(props);

  return art === undefined ? {} : artifactMetadata(art);
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

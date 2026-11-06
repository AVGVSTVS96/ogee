import type { Metadata } from "next";

import type { Artifact } from "./artifact.ts";

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

export const artifactMetadata = (art: Artifact): Metadata => ({
  title: art.title,
  ...(art.description !== undefined && { description: art.description }),
  openGraph: openGraph(art),
  twitter: { card: "summary_large_image" },
});

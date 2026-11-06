import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { load } from "@/lib/artifact.ts";
import type { Artifact } from "@/lib/artifact.ts";
import { artifactMetadata } from "@/lib/metadata.ts";
import { repoUrl, serverUrl } from "@/lib/site.ts";

import CopyCommand from "./copy-command.tsx";

const homeCard = "6f851de9d1eb";

const examples = [
  { file: "agent-run.html", id: "55dc11ea098b" },
  { file: "deploy.html", id: "e070aa503257" },
  { file: "metric.html", id: "bddf81d86b29" },
  { file: "chart.html", id: "53f9bad07054" },
  { file: "diff.html", id: "76c49adfbb87" },
];

const title = "ogee: inline HTML artifacts for any agent, in any chat";

const description =
  "Post HTML, an image or an mp4 and get a link whose chat preview is the thing itself: a sharp card, or a video that plays inline.";

export const generateMetadata = async (): Promise<Metadata> => {
  const card = await load(homeCard);
  const shown = card === undefined ? {} : artifactMetadata({ ...card, description, title });

  return { ...shown, description, title };
};

interface Example {
  file: string;
  id: string;
  art: Artifact;
}

const loadExamples = async () => {
  const loaded = await Promise.all(examples.map(async (ex) => ({ ...ex, art: await load(ex.id) })));

  return loaded.filter((ex): ex is Example => ex.art !== undefined);
};

const Mark = () => (
  <svg aria-hidden className="mark" fill="none" viewBox="0 0 72 72">
    <rect fill="var(--accent)" height="72" rx="18" width="72" />
    <path
      d="M16 56V44c0-12 20-12 20-28 0 16 20 16 20 28v12"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="6"
    />
  </svg>
);

const Media = ({ art }: { art: Artifact }) =>
  art.video === undefined ? (
    <Image alt={art.title} height={art.height} src={art.image} unoptimized width={art.width} />
  ) : (
    <video autoPlay loop muted playsInline poster={art.image} src={art.video} />
  );

const LinkPreview = ({ ex, children }: { ex: Example; children: ReactNode }) => (
  <div className="bubble in">
    <p>{children}</p>
    <Link className="link" href={`/${ex.id}`}>
      {`${new URL(serverUrl).host}/${ex.id}`}
    </Link>
    <div className="preview">
      <span>ogee</span>
      <b>{ex.art.title}</b>
      {ex.art.description !== undefined && <small>{ex.art.description}</small>}
      <Media art={ex.art} />
    </div>
  </div>
);

const Chat = ({ run, deploy }: { run: Example; deploy: Example }) => (
  <figure aria-label="An agent sending ogee links in a chat" className="chat">
    <header>
      <Mark />
      <div>
        <b>build agent</b>
        <small>bot</small>
      </div>
    </header>
    <div className="messages">
      <p className="bubble out">is the checkout flake fixed?</p>
      <LinkPreview ex={run}>Fixed, PR is up:</LinkPreview>
      <p className="bubble out">ship it</p>
      <LinkPreview ex={deploy}>Live.</LinkPreview>
    </div>
  </figure>
);

const curl = `curl -X POST "${serverUrl}/api?title=Deploys&video=4" \\
  -H "authorization: Bearer $OGEE_KEY" \\
  -H "content-type: text/html" \\
  --data-binary @card.html`;

const Home = async () => {
  const all = await loadExamples();
  const [run, deploy] = all;

  return (
    <>
      <div aria-hidden className="backdrop" />
      <nav className="nav">
        <Link className="brand" href="/">
          <Mark />
          ogee
        </Link>
        <div>
          <a href="#examples">Examples</a>
          <a href={`${repoUrl}/blob/main/skills/ogee/SKILL.md`}>Agent skill</a>
          <a className="github" href={repoUrl}>
            GitHub
          </a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="pitch">
            <h1>
              Send a link.
              <br />
              <em>It plays.</em>
            </h1>
            <p className="lede">
              Inline HTML artifacts for any agent, in any chat. Post HTML, an image or an mp4 and
              get back a link whose preview is the thing itself: a sharp card, or a video that
              autoplays inline in Telegram.
            </p>
            <CopyCommand command="npx ogee card.html --video 4" />
            <p className="hint">
              Needs <code>OGEE_KEY</code>. Prints a fresh link.
            </p>
          </div>
          {run !== undefined && deploy !== undefined && <Chat deploy={deploy} run={run} />}
        </section>

        <section className="how">
          <div>
            <span>1</span>
            <h2>Write a card</h2>
            <p>
              Any self-contained HTML page at 1200×630. CSS animations, canvas and timers all record
              smoothly.
            </p>
          </div>
          <div>
            <span>2</span>
            <h2>Post it</h2>
            <p>
              One request. HTML becomes a crisp image, or with a video length, an mp4 recorded frame
              by frame.
            </p>
          </div>
          <div>
            <span>3</span>
            <h2>Send the link</h2>
            <p>
              Chats cache a preview per link, so every version gets a new one. Edit your message to
              the new link and the preview swaps in place.
            </p>
          </div>
        </section>

        <section className="api">
          <h2>No CLI? It’s one request.</h2>
          <pre>
            <code>{curl}</code>
          </pre>
        </section>

        <section className="gallery" id="examples">
          <h2>Examples to copy</h2>
          <p>Each one is a single HTML file. Hand it to your agent and swap in your data.</p>
          <div className="grid">
            {all.map((ex) => (
              <figure key={ex.id}>
                <Link href={`/${ex.id}`}>
                  <Media art={ex.art} />
                </Link>
                <figcaption>
                  <b>{ex.art.title}</b>
                  <a href={`${repoUrl}/blob/main/examples/${ex.file}`}>{ex.file}</a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>
          <Mark />
          ogee
        </span>
        <a href={repoUrl}>github.com/AVGVSTVS96/ogee</a>
      </footer>
    </>
  );
};

export default Home;

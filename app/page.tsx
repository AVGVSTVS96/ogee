import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { load } from "@/lib/artifact.ts";
import type { Artifact } from "@/lib/artifact.ts";
import { artifactMetadata } from "@/lib/metadata.ts";
import { repoUrl, serverUrl } from "@/lib/site.ts";

import CopyCommand from "./copy-command.tsx";

const homeCard = "db70e89c9ad5";

const examples = [
  { file: "agent-run.html", id: "55dc11ea098b" },
  { file: "deploy.html", id: "e070aa503257" },
  { file: "metric.html", id: "bddf81d86b29" },
  { file: "chart.html", id: "53f9bad07054" },
  { file: "diff.html", id: "76c49adfbb87" },
];

const skillUrl = `${repoUrl}/blob/main/skills/ogee/SKILL.md`;

const title = "ogee: inline HTML artifacts, wherever you are";

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

const Media = ({ art, sizes }: { art: Artifact; sizes: string }) =>
  art.video === undefined ? (
    <Image alt={art.title} height={art.height} sizes={sizes} src={art.image} width={art.width} />
  ) : (
    <video autoPlay loop muted playsInline poster={art.image} src={art.video} />
  );

const LinkPreview = ({ ex, children }: { ex: Example; children: ReactNode }) => (
  <div className="bubble in">
    <p>{children}</p>
    <Link className="link" href={`/${ex.id}`}>
      {new URL(serverUrl).host}/<wbr />
      {ex.id}
    </Link>
    <div className="preview">
      <span>ogee</span>
      <b>{ex.art.title}</b>
      {ex.art.description !== undefined && <small>{ex.art.description}</small>}
      <Media art={ex.art} sizes="360px" />
    </div>
  </div>
);

const Chat = ({ run }: { run: Example }) => (
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
      <p className="bubble in">Shipped. 3eaf452 is live in production.</p>
    </div>
  </figure>
);

const curl = `curl "${serverUrl}/api?video=4" \\
  -H "authorization: Bearer $OGEE_KEY" \\
  -H "content-type: text/html" \\
  --data-binary @card.html`;

const Home = async () => {
  const all = await loadExamples();
  const [run] = all;

  return (
    <>
      <div aria-hidden className="backdrop" />
      <nav className="nav">
        <Link className="brand" href="/">
          <Mark />
          ogee
        </Link>
        <div>
          <a className="wide" href="#examples">
            Examples
          </a>
          <a href={skillUrl}>Agent skill</a>
          <a className="github" href={repoUrl}>
            GitHub
          </a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="pitch">
            <h1>
              Inline HTML artifacts.
              <br />
              <em>Wherever you are.</em>
            </h1>
            <p className="lede">
              Telegram doesn&apos;t render HTML. Neither do iMessage, WhatsApp or Slack. Your agent
              posts HTML to ogee and gets back a link, and the chat shows it as a sharp card or a
              video that plays inline.
            </p>
            <CopyCommand command="npx ogee card.html --video 4" />
            <p className="hint">
              Needs <code>OGEE_KEY</code>. Prints a fresh link: a card in under a second, a 4s video
              in about 7s.
            </p>
          </div>
          {run !== undefined && <Chat run={run} />}
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
            {all.map((ex, i) => (
              <figure key={ex.id}>
                <Link href={`/${ex.id}`}>
                  <Media
                    art={ex.art}
                    sizes={
                      i === 0
                        ? "(max-width: 700px) 100vw, 1072px"
                        : "(max-width: 700px) 100vw, 524px"
                    }
                  />
                </Link>
                <figcaption>
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
        <div>
          <a href="#examples">Examples</a>
          <a href={skillUrl}>Agent skill</a>
          <a href={repoUrl}>GitHub</a>
        </div>
      </footer>
    </>
  );
};

export default Home;

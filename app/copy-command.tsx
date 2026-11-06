"use client";

import { useState } from "react";

const CopyCommand = ({ command }: { command: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
    navigator.clipboard.writeText(command).catch(() => {
      setCopied(false);
    });
  };

  return (
    <div className="command">
      <code>
        <span aria-hidden>$ </span>
        {command}
      </code>
      <button aria-label="Copy command" onClick={copy} type="button">
        {copied ? (
          <svg aria-hidden viewBox="0 0 24 24">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 24 24">
            <rect height="12" rx="2.5" width="12" x="8" y="8" />
            <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default CopyCommand;

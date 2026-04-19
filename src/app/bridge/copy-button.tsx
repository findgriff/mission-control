"use client";

import { useState, useCallback } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [text]);

  return (
    <button
      className="btn btn-ghost"
      onClick={handleCopy}
      style={{ flexShrink: 0, fontSize: 12, padding: "6px 14px" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

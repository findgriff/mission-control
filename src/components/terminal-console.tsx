"use client";

import { useState } from "react";

type TerminalResult = {
  ok?: boolean;
  command?: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number | string | null;
  signal?: string | null;
  durationMs?: number;
};

export function TerminalConsole({ defaultCwd }: { defaultCwd: string }) {
  const [command, setCommand] = useState("pwd");
  const [cwd, setCwd] = useState(defaultCwd);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TerminalResult | null>(null);

  async function runCommand() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/mission-control/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, cwd }),
      });
      const payload = (await response.json()) as TerminalResult;
      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <label className="label" htmlFor="terminal-cwd">Working Directory</label>
        <input
          id="terminal-cwd"
          className="input"
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          spellCheck={false}
          style={{ fontFamily: "var(--font-mono)", marginBottom: 14 }}
        />

        <label className="label" htmlFor="terminal-command">Command</label>
        <textarea
          id="terminal-command"
          className="input"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          spellCheck={false}
          rows={5}
          style={{ fontFamily: "var(--font-mono)", minHeight: 120, marginBottom: 14 }}
        />

        <button className="btn btn-red" onClick={runCommand} disabled={pending || !command.trim()}>
          {pending ? "Running..." : "Run Command"}
        </button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span className={`badge ${result?.ok ? "text-[#4CAF50] border-[#4CAF5033] bg-[#4CAF5011]" : "text-[#888888] border-[#88888833] bg-[#88888811]"}`}>
            {result ? (result.ok ? "ok" : "failed") : "ready"}
          </span>
          {result?.durationMs != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.durationMs}ms
            </span>
          )}
          {result?.exitCode != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              exit {String(result.exitCode)}
            </span>
          )}
        </div>

        <pre style={{
          margin: 0,
          minHeight: 260,
          maxHeight: "54dvh",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.55,
          color: "var(--text)",
        }}>
          {formatResult(result)}
        </pre>
      </div>
    </div>
  );
}

function formatResult(result: TerminalResult | null): string {
  if (!result) return "Enter a command and run it.";

  const parts = [
    result.cwd ? `$ cd ${result.cwd}` : "",
    result.command ? `$ ${result.command}` : "",
    result.stdout ? `\n${result.stdout}` : "",
    result.stderr ? `\n[stderr]\n${result.stderr}` : "",
    result.error && !result.stderr ? `\n[error]\n${result.error}` : "",
  ];

  return parts.filter(Boolean).join("\n").trim() || "Command finished with no output.";
}

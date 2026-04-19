"use client";

import { useState } from "react";

type BridgeRunner = "codex" | "shell";
type CodexMode = "unrestricted" | "full-auto";

type BridgeResult = {
  ok?: boolean;
  id?: string;
  runner?: BridgeRunner;
  cwd?: string;
  command?: string;
  prompt?: string;
  model?: string;
  codexMode?: CodexMode;
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number | string | null;
  signal?: string | null;
  durationMs?: number;
  files?: {
    task: string;
    log: string;
    result: string;
  };
};

export function BridgeConsole({ defaultCwd, defaultModel }: { defaultCwd: string; defaultModel: string }) {
  const [runner, setRunner] = useState<BridgeRunner>("codex");
  const [model, setModel] = useState(defaultModel);
  const [codexMode, setCodexMode] = useState<CodexMode>("unrestricted");
  const [cwd, setCwd] = useState(defaultCwd);
  const [prompt, setPrompt] = useState("Inspect this repo, run validation, and summarize the current Mission Control status.");
  const [command, setCommand] = useState("git status -sb && npm run build");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BridgeResult | null>(null);

  async function runBridge() {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/mission-control/api/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runner, cwd, prompt, command, model, codexMode }),
      });
      const payload = (await response.json()) as BridgeResult;
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
        <label className="label" htmlFor="bridge-runner">Runner</label>
        <select
          id="bridge-runner"
          className="input"
          value={runner}
          onChange={(e) => setRunner(e.target.value as BridgeRunner)}
          style={{ marginBottom: 14 }}
        >
          <option value="codex">Codex CLI</option>
          <option value="shell">Shell command</option>
        </select>

        {runner === "codex" && (
          <>
            <label className="label" htmlFor="bridge-model">Codex Model</label>
            <input
              id="bridge-model"
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              spellCheck={false}
              style={{ fontFamily: "var(--font-mono)", marginBottom: 14 }}
            />

            <label className="label" htmlFor="bridge-codex-mode">Codex Access</label>
            <select
              id="bridge-codex-mode"
              className="input"
              value={codexMode}
              onChange={(e) => setCodexMode(e.target.value as CodexMode)}
              style={{ marginBottom: 14 }}
            >
              <option value="unrestricted">Unrestricted</option>
              <option value="full-auto">Full auto sandboxed</option>
            </select>
          </>
        )}

        <label className="label" htmlFor="bridge-cwd">Working Directory</label>
        <input
          id="bridge-cwd"
          className="input"
          value={cwd}
          onChange={(e) => setCwd(e.target.value)}
          spellCheck={false}
          style={{ fontFamily: "var(--font-mono)", marginBottom: 14 }}
        />

        <label className="label" htmlFor="bridge-prompt">Task Prompt</label>
        <textarea
          id="bridge-prompt"
          className="input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          spellCheck={false}
          rows={8}
          style={{ fontFamily: "var(--font-mono)", minHeight: 170, marginBottom: 14 }}
        />

        {runner === "shell" && (
          <>
            <label className="label" htmlFor="bridge-command">Shell Command</label>
            <textarea
              id="bridge-command"
              className="input"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              spellCheck={false}
              rows={4}
              style={{ fontFamily: "var(--font-mono)", minHeight: 100, marginBottom: 14 }}
            />
          </>
        )}

        <button
          className="btn btn-red"
          onClick={runBridge}
          disabled={pending || (runner === "codex" ? !prompt.trim() : !command.trim())}
        >
          {pending ? "Running Bridge..." : "Run Bridge"}
        </button>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span className={`badge ${result?.ok ? "text-[#4CAF50] border-[#4CAF5033] bg-[#4CAF5011]" : "text-[#888888] border-[#88888833] bg-[#88888811]"}`}>
            {result ? (result.ok ? "ok" : "failed") : "ready"}
          </span>
          {result?.runner && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.runner}
            </span>
          )}
          {result?.durationMs != null && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.durationMs}ms
            </span>
          )}
          {result?.model && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.model}
            </span>
          )}
          {result?.codexMode && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.codexMode}
            </span>
          )}
          {result?.id && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--dim)" }}>
              {result.id}
            </span>
          )}
        </div>

        <pre style={{
          margin: 0,
          minHeight: 320,
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

function formatResult(result: BridgeResult | null): string {
  if (!result) return "Enter a task and run the bridge.";

  const files = result.files
    ? [
        `\n[files]`,
        `task: ${result.files.task}`,
        `log: ${result.files.log}`,
        `result: ${result.files.result}`,
      ].join("\n")
    : "";

  return [
    result.cwd ? `$ cd ${result.cwd}` : "",
    result.command ? `$ ${result.command}` : "",
    result.stdout ? `\n${result.stdout}` : "",
    result.stderr ? `\n[stderr]\n${result.stderr}` : "",
    result.error && !result.stderr ? `\n[error]\n${result.error}` : "",
    files,
  ].filter(Boolean).join("\n").trim() || "Bridge run finished with no output.";
}

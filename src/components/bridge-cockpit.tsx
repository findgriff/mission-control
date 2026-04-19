"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Provider = "openai" | "anthropic" | "ollama" | "google" | "custom";

type BridgeEvent =
  | { type: "start"; model: string; provider: string; timestamp: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; ok: boolean; result: string }
  | { type: "message"; content: string }
  | { type: "done"; turns: number; timestamp: string }
  | { type: "error"; message: string };

type Status = "idle" | "connecting" | "running" | "done" | "error";

// ── Provider presets ───────────────────────────────────────────────────────────

const PROVIDER_PRESETS: Record<Provider, { endpoint: string; model: string; needsKey: boolean }> = {
  ollama:    { endpoint: "http://localhost:11434",                                  model: "llama3.2",           needsKey: false },
  openai:    { endpoint: "https://api.openai.com",                                  model: "gpt-4o",             needsKey: true  },
  anthropic: { endpoint: "https://api.anthropic.com",                               model: "claude-opus-4-5",    needsKey: true  },
  google:    { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.0-flash",   needsKey: true  },
  custom:    { endpoint: "",                                                          model: "",                  needsKey: false },
};

// ── Truncate result ────────────────────────────────────────────────────────────

function truncate(s: string, max = 300): { text: string; truncated: boolean } {
  if (s.length <= max) return { text: s, truncated: false };
  return { text: s.slice(0, max), truncated: true };
}

// ── ToolResultBlock ────────────────────────────────────────────────────────────

function ToolResultBlock({ event }: { event: Extract<BridgeEvent, { type: "tool_result" }> }) {
  const [expanded, setExpanded] = useState(false);
  const { text, truncated } = truncate(event.result, 300);

  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: event.ok ? "var(--green)" : "var(--red)",
          padding: "1px 6px",
          borderRadius: 4,
          border: `1px solid ${event.ok ? "color-mix(in srgb, var(--green) 35%, transparent)" : "color-mix(in srgb, var(--red) 35%, transparent)"}`,
          background: event.ok ? "color-mix(in srgb, var(--green) 8%, transparent)" : "color-mix(in srgb, var(--red) 8%, transparent)",
        }}>
          {event.ok ? "ok" : "error"}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
          {event.name}
        </span>
      </div>
      <pre style={{
        margin: 0,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        lineHeight: 1.5,
        color: "var(--muted)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 6,
        padding: "6px 10px",
        maxHeight: expanded ? "none" : 120,
        overflow: expanded ? "visible" : "hidden",
      }}>
        {expanded ? event.result : text}
        {truncated && !expanded && "…"}
      </pre>
      {truncated && (
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            marginTop: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--cyan)",
            padding: 0,
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// ── EventRow ───────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: BridgeEvent }) {
  switch (event.type) {
    case "start":
      return (
        <div style={{ padding: "6px 0", borderBottom: "1px solid var(--border2)", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
            Docked {event.model} via {event.provider} — {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
      );

    case "thinking":
      return (
        <div style={{ padding: "4px 0" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", fontStyle: "italic", lineHeight: 1.6 }}>
            {event.content}
          </span>
        </div>
      );

    case "tool_call": {
      const argsStr = JSON.stringify(event.args);
      const { text: truncatedArgs, truncated } = truncate(argsStr, 120);
      return (
        <div style={{ padding: "5px 0" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 6,
            background: "color-mix(in srgb, var(--cyan) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--cyan) 25%, transparent)",
          }}>
            <span style={{ color: "var(--cyan)", fontSize: 12 }}>⚡</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", fontWeight: 700 }}>
              {event.name}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "color-mix(in srgb, var(--cyan) 60%, transparent)" }}>
              ({truncatedArgs}{truncated ? "…" : ""})
            </span>
          </div>
        </div>
      );
    }

    case "tool_result":
      return (
        <div style={{ padding: "3px 0 6px 12px", borderLeft: "2px solid var(--border)" }}>
          <ToolResultBlock event={event} />
        </div>
      );

    case "message":
      return (
        <div style={{ padding: "8px 0" }}>
          <pre style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            lineHeight: 1.65,
            color: "var(--text)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {event.content}
          </pre>
        </div>
      );

    case "done":
      return (
        <div style={{
          padding: "8px 12px",
          marginTop: 6,
          borderRadius: 8,
          background: "color-mix(in srgb, var(--green) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--green) 25%, transparent)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)", fontWeight: 700 }}>
            Complete — {event.turns} {event.turns === 1 ? "turn" : "turns"}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
      );

    case "error":
      return (
        <div style={{
          padding: "8px 12px",
          marginTop: 6,
          borderRadius: 8,
          background: "color-mix(in srgb, var(--red) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
        }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)", fontWeight: 700 }}>
            Error: {event.message}
          </span>
        </div>
      );
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BridgeCockpit() {
  const [provider, setProvider] = useState<Provider>("ollama");
  const [endpoint, setEndpoint] = useState("http://localhost:11434");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("llama3.2");
  const [message, setMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [events, setEvents] = useState<BridgeEvent[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Set MCP URL on mount (client-only)
  useEffect(() => {
    setMcpUrl(`${window.location.origin}/mission-control/api/mcp`);
  }, []);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  // Update presets when provider changes
  const handleProviderChange = useCallback((p: Provider) => {
    setProvider(p);
    const preset = PROVIDER_PRESETS[p];
    setEndpoint(preset.endpoint);
    setModel(preset.model);
  }, []);

  const handleCopyMcp = useCallback(() => {
    if (!mcpUrl) return;
    void navigator.clipboard.writeText(mcpUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [mcpUrl]);

  const handleRun = useCallback(async () => {
    if (!message.trim() || status === "running" || status === "connecting") return;

    // Abort any existing run
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEvents([]);
    setStatus("connecting");

    try {
      const resp = await fetch("/mission-control/api/bridge-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey: apiKey || undefined,
          model,
          systemPrompt: systemPrompt.trim() || undefined,
          message: message.trim(),
        }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "Unknown error");
        setEvents([{ type: "error", message: `HTTP ${resp.status}: ${text}` }]);
        setStatus("error");
        return;
      }

      setStatus("running");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const event = JSON.parse(jsonStr) as BridgeEvent;
            setEvents((prev) => [...prev, event]);
            if (event.type === "done") setStatus("done");
            if (event.type === "error") setStatus("error");
          } catch { /* ignore parse errors */ }
        }
      }

      // Handle any remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6).trim()) as BridgeEvent;
          setEvents((prev) => [...prev, event]);
        } catch { /* ignore */ }
      }

      setStatus((prev) => (prev === "running" ? "done" : prev));
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return;
      setEvents((prev) => [
        ...prev,
        { type: "error", message: e instanceof Error ? e.message : String(e) },
      ]);
      setStatus("error");
    }
  }, [provider, endpoint, apiKey, model, systemPrompt, message, status]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
  }, []);

  const statusLabel = {
    idle:       "IDLE",
    connecting: "CONNECTING",
    running:    "RUNNING",
    done:       "DONE",
    error:      "ERROR",
  }[status];

  const statusColor = {
    idle:       "var(--muted)",
    connecting: "var(--amber)",
    running:    "var(--cyan)",
    done:       "var(--green)",
    error:      "var(--red)",
  }[status];

  const needsKey = PROVIDER_PRESETS[provider].needsKey;
  const isRunning = status === "connecting" || status === "running";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 780 }}>

      {/* Header card */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>⬡</span>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800, letterSpacing: "0.05em", color: "var(--text)" }}>
                THE BRIDGE
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", marginTop: 1 }}>
                AI DOCKING STATION
              </div>
            </div>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 6,
            border: `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)`,
            background: `color-mix(in srgb, ${statusColor} 8%, transparent)`,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: isRunning ? `0 0 6px ${statusColor}` : "none",
              animation: isRunning ? "spin 1.2s linear infinite" : "none",
              display: "inline-block",
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>

        <hr className="divider" style={{ marginBottom: 16 }} />

        {/* LLM Connection */}
        <div style={{ marginBottom: 4 }}>
          <div className="section-tag" style={{ marginBottom: 10 }}>LLM Connection</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label className="label" htmlFor="bridge-provider">Provider</label>
              <select
                id="bridge-provider"
                className="input"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as Provider)}
              >
                <option value="ollama">Ollama (local)</option>
                <option value="google">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="custom">Custom / LM Studio</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="bridge-model">Model</label>
              <input
                id="bridge-model"
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                spellCheck={false}
                placeholder="e.g. llama3.2"
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: needsKey ? 10 : 0 }}>
            <label className="label" htmlFor="bridge-endpoint">Endpoint</label>
            <input
              id="bridge-endpoint"
              className="input"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              spellCheck={false}
              placeholder="http://localhost:11434"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>

          {needsKey && (
            <div style={{ marginTop: 10 }}>
              <label className="label" htmlFor="bridge-apikey">API Key</label>
              <input
                id="bridge-apikey"
                className="input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          )}
        </div>

        <hr className="divider" style={{ margin: "14px 0" }} />

        {/* Goal input */}
        <div style={{ marginBottom: 12 }}>
          <div className="section-tag" style={{ marginBottom: 10 }}>Goal / Instruction</div>
          <textarea
            className="input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should the AI do? e.g. Check all running tasks, summarize agent activity, and create a health report."
            rows={4}
            style={{ fontFamily: "var(--font-mono)", fontSize: 13, minHeight: 100 }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                void handleRun();
              }
            }}
          />
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            Tip: Cmd+Enter to run
          </div>
        </div>

        {/* Advanced: system prompt */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: "5px 12px", marginBottom: showAdvanced ? 10 : 0 }}
        >
          {showAdvanced ? "▲ Hide advanced" : "▼ Advanced options"}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: 10 }}>
            <label className="label" htmlFor="bridge-system">System Prompt (optional override)</label>
            <textarea
              id="bridge-system"
              className="input"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Leave blank to use the default Mission Control operator prompt."
              rows={5}
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, minHeight: 100 }}
            />
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-red"
            onClick={() => void handleRun()}
            disabled={isRunning || !message.trim() || !model.trim() || !endpoint.trim()}
            style={{ flex: 1 }}
          >
            {isRunning ? (
              <>
                <span className="spin" style={{ display: "inline-block", width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                {status === "connecting" ? "Connecting…" : "Running…"}
              </>
            ) : (
              "Dock & Execute →"
            )}
          </button>
          {isRunning && (
            <button className="btn btn-ghost" onClick={handleStop} style={{ flexShrink: 0 }}>
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Live feed */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div className="section-tag">Live Feed</div>
          {events.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => setEvents([])}
              style={{ fontSize: 10, padding: "3px 10px" }}
            >
              Clear
            </button>
          )}
        </div>

        <div
          ref={feedRef}
          style={{
            minHeight: 220,
            maxHeight: "52dvh",
            overflow: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            lineHeight: 1.6,
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          {events.length === 0 ? (
            <span style={{ color: "var(--dim)", fontStyle: "italic" }}>
              {status === "idle"
                ? "Configure a connection above and enter your goal to dock an AI agent."
                : "Waiting for events…"}
            </span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {events.map((event, i) => (
                <EventRow key={i} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MCP endpoint */}
      <div className="card" style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="section-tag" style={{ marginBottom: 4 }}>MCP Endpoint</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", wordBreak: "break-all" }}>
              {mcpUrl || "/mission-control/api/mcp"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
              Connect from Claude Desktop, Cursor, or any MCP-compatible client.
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleCopyMcp}
            style={{ flexShrink: 0, fontSize: 12 }}
          >
            {copied ? "✓ Copied" : "Copy URL"}
          </button>
        </div>
      </div>
    </div>
  );
}

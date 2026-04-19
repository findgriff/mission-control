import { TerminalConsole } from "@/components/terminal-console";

export const dynamic = "force-dynamic";

export default function TerminalPage() {
  const enabled = process.env.MISSION_CONTROL_TERMINAL_ENABLED === "true";
  const defaultCwd = process.env.MISSION_CONTROL_TERMINAL_CWD ?? process.cwd();

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Shell</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Terminal</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {enabled
            ? "Run shell commands on this Mission Control host."
            : "Terminal is disabled. Set MISSION_CONTROL_TERMINAL_ENABLED=true on the server."}
        </p>
      </div>

      {enabled ? (
        <TerminalConsole defaultCwd={defaultCwd} />
      ) : (
        <div className="card" style={{ padding: 16 }}>
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: 12 }}>
            MISSION_CONTROL_TERMINAL_ENABLED=false
          </code>
        </div>
      )}
    </>
  );
}

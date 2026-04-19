import { BridgeConsole } from "@/components/bridge-console";

export const dynamic = "force-dynamic";

export default function BridgePage() {
  const defaultCwd = process.env.MISSION_CONTROL_BRIDGE_CWD
    ?? process.env.MISSION_CONTROL_TERMINAL_CWD
    ?? process.cwd();
  const defaultModel = process.env.MISSION_CONTROL_CODEX_MODEL ?? "gpt-5.1-codex-mini";

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Agent</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Bridge</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          Run Codex CLI or shell repair jobs from Mission Control and write handoff logs into <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>.agent</code>.
        </p>
      </div>

      <BridgeConsole defaultCwd={defaultCwd} defaultModel={defaultModel} />
    </>
  );
}

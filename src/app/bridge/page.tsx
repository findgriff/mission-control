import { BridgeCockpit } from "@/components/bridge-cockpit";

export const dynamic = "force-dynamic";

export default function BridgePage() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>AI Docking Station</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>The Bridge</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          Dock any LLM and give it autonomous control over Mission Control — read data, run commands, create tasks, commission agents.
        </p>
      </div>

      <BridgeCockpit />
    </>
  );
}

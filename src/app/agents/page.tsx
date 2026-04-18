import { getAgents } from "@/lib/data";
import { dotClass, initials, timeAgo } from "@/lib/utils";
import { SpawnAgentButton } from "@/components/spawn-agent-form";
import type { McRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [{ items, error, source }, params] = await Promise.all([
    getAgents(),
    searchParams,
  ]);

  const q = params?.q?.toLowerCase() ?? "";
  const filtered = items.filter((a) =>
    !q ||
    a.title.toLowerCase().includes(q) ||
    String(a.latestStatus ?? "").toLowerCase().includes(q) ||
    String(a.model ?? "").toLowerCase().includes(q)
  );

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Registry</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Agents</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {error
            ? <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            : <>{items.length} agent{items.length !== 1 ? "s" : ""} from <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{source}</code></>
          }
        </p>
      </div>

      <form method="get" style={{ position: "relative", marginBottom: 20 }}>
        <input name="q" defaultValue={params?.q} placeholder="Search agents…" className="input" style={{ paddingLeft: 36 }} />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </form>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {items.length === 0 ? "No agents configured" : "No results"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {items.length === 0 ? "Spawn your first agent below." : "Try a different search."}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <SpawnAgentButton />
    </>
  );
}

function AgentCard({ agent }: { agent: McRecord }) {
  const status = String(agent.latestStatus ?? "idle");
  const name = agent.title;
  const abbr = initials(name);
  const sessions = Number(agent.sessionCount ?? 0);
  const model = String(agent.model ?? "");
  const soul = String(agent.soul ?? agent.instructions ?? "");
  const updated = String(agent.latestUpdatedAt ?? "");

  return (
    <div className="card fade-up" style={{ padding: 0, overflow: "hidden" }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, var(--purple), transparent)" }} />

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, flexShrink: 0,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--purple) 12%, transparent)",
            border: "1.5px solid color-mix(in srgb, var(--purple) 35%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "var(--purple)",
          }}>
            {abbr}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`dot ${dotClass(status)}`} style={{ width: 6, height: 6 }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.05em" }}>
                {status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Soul quote */}
        {soul && (
          <div style={{
            margin: "0 0 12px",
            padding: "8px 10px",
            background: "color-mix(in srgb, var(--purple) 6%, transparent)",
            border: "1px solid color-mix(in srgb, var(--purple) 14%, transparent)",
            borderRadius: 8,
          }}>
            <p style={{ fontStyle: "italic", fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.55,
              overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
              &ldquo;{soul}&rdquo;
            </p>
          </div>
        )}

        <hr className="divider" style={{ margin: "0 0 10px" }} />

        {/* Footer stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ opacity: 0.4 }}>⟲</span> {sessions} session{sessions !== 1 ? "s" : ""}
          </span>
          {model && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
              {model}
            </span>
          )}
          {updated && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>
              {timeAgo(updated)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

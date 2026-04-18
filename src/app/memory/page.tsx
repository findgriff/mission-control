import { getMemory } from "@/lib/data";
import type { McRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [{ items, error, source }, params] = await Promise.all([
    getMemory(),
    searchParams,
  ]);

  const q = params?.q?.toLowerCase() ?? "";
  const filtered = items.filter((e) =>
    !q ||
    e.title.toLowerCase().includes(q) ||
    String(e.text ?? "").toLowerCase().includes(q) ||
    String(e.source ?? "").toLowerCase().includes(q)
  );

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Index</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Memory</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {error
            ? <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            : <>{items.length} chunk{items.length !== 1 ? "s" : ""} indexed · <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{source}</code></>
          }
        </p>
      </div>

      <form method="get" style={{ position: "relative", marginBottom: 20 }}>
        <input name="q" defaultValue={params?.q} placeholder="Search memory…" className="input" style={{ paddingLeft: 36 }} />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </form>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>🧠</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {items.length === 0 ? "No memory indexed" : "No results"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            {items.length === 0 ? "OpenClaw hasn't indexed any memory yet." : "Try a different search."}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((entry) => (
          <MemoryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </>
  );
}

function MemoryCard({ entry }: { entry: McRecord }) {
  const path = String(entry.path ?? entry.source ?? entry.title ?? "");
  const displayPath = path.split("/").slice(-2).join("/") || path;
  const startLine = entry.startLine as number | undefined;
  const endLine = entry.endLine as number | undefined;
  const text = String(entry.text ?? "");
  const updated = String(entry.updatedAt ?? "");

  return (
    <div className="card card-hover fade-up" style={{ padding: "12px 14px" }}>
      {/* File path header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cyan)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayPath}
        </code>
        {startLine != null && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>
            L{startLine}{endLine && endLine !== startLine ? `–${endLine}` : ""}
          </span>
        )}
      </div>

      {/* Text content */}
      {text && (
        <pre style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--muted)", margin: 0,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          lineHeight: 1.6,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
        } as React.CSSProperties}>
          {text}
        </pre>
      )}

      {/* Footer */}
      {updated && (
        <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)" }}>
          {updated}
        </div>
      )}
    </div>
  );
}

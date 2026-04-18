import { getCalendar } from "@/lib/data";
import { statusClass, dotClass } from "@/lib/utils";
import type { McRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [{ items, error, source }, params] = await Promise.all([
    getCalendar(),
    searchParams,
  ]);

  const q = params?.q?.toLowerCase() ?? "";
  const filtered = items.filter((e) =>
    !q ||
    e.title.toLowerCase().includes(q) ||
    String(e.agentId ?? "").toLowerCase().includes(q) ||
    String(e.expr ?? "").toLowerCase().includes(q)
  );

  const enabled  = items.filter((e) => e.enabled !== false).length;
  const disabled = items.length - enabled;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Cron</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Schedule</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {error
            ? <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            : <>
                {items.length} job{items.length !== 1 ? "s" : ""} ·{" "}
                <span style={{ color: "var(--green)" }}>{enabled} active</span>
                {disabled > 0 && <> · <span style={{ color: "var(--muted)" }}>{disabled} paused</span></>}
                {" · "}<code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{source}</code>
              </>
          }
        </p>
      </div>

      <form method="get" style={{ position: "relative", marginBottom: 20 }}>
        <input name="q" defaultValue={params?.q} placeholder="Search schedule…" className="input" style={{ paddingLeft: 36 }} />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </form>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>🕐</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {items.length === 0 ? "No scheduled jobs" : "No results"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            No cron events found in OpenClaw.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((event) => (
          <CalendarCard key={event.id} event={event} />
        ))}
      </div>
    </>
  );
}

function CalendarCard({ event }: { event: McRecord }) {
  const on = event.enabled !== false;
  const lastStatus = String(event.lastStatus ?? "");
  const expr = String(event.expr ?? event.at ?? "");

  return (
    <div className="card fade-up" style={{ padding: "14px 16px", opacity: on ? 1 : 0.55 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Clock icon */}
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          background: on ? "color-mix(in srgb, var(--amber) 10%, transparent)" : "var(--surface)",
          border: `1px solid ${on ? "color-mix(in srgb, var(--amber) 25%, transparent)" : "var(--border)"}`,
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={on ? "var(--amber)" : "var(--dim)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {on ? <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>
               : <><circle cx="12" cy="12" r="10" /><line x1="10" y1="15" x2="10" y2="9" /><line x1="14" y1="15" x2="14" y2="9" /></>}
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{event.title}</span>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: on ? "var(--green)" : "var(--dim)",
              boxShadow: on ? "0 0 6px var(--green)" : "none",
              flexShrink: 0,
            }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {expr && (
              <code style={{
                fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px",
                background: "color-mix(in srgb, var(--amber) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--amber) 20%, transparent)",
                borderRadius: 5, color: "var(--amber)",
              }}>{expr}</code>
            )}
            {!!event.scheduleKind && (
              <span className="badge" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>
                {String(event.scheduleKind)}
              </span>
            )}
            {!!event.agentId && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)" }}>
                → {String(event.agentId)}
              </span>
            )}
          </div>

          {(event.lastRunAt || lastStatus) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {event.lastRunAt && (
                <span style={{ fontSize: 11, color: "var(--dim)" }}>
                  Last run: {String(event.lastRunAt)}
                </span>
              )}
              {lastStatus && (
                <span className={`badge ${statusClass(lastStatus)}`}>{lastStatus}</span>
              )}
            </div>
          )}

          {event.payloadText && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
              {String(event.payloadText).slice(0, 140)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

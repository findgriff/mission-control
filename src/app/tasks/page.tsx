import { getTasks } from "@/lib/data";
import { statusClass, dotClass, timeAgo } from "@/lib/utils";
import { CreateTaskButton } from "@/components/create-task-form";
import type { McRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; filter?: string }>;
}) {
  const [{ items, error, source }, params] = await Promise.all([
    getTasks(),
    searchParams,
  ]);

  const q = params?.q?.toLowerCase() ?? "";
  const filter = params?.filter ?? "all";

  const filtered = items.filter((t) => {
    const status = String(t.status ?? "").toLowerCase();
    const matchFilter =
      filter === "all" ||
      (filter === "running" && status === "running") ||
      (filter === "pending" && (status === "pending" || status === "queued")) ||
      (filter === "done"    && (status === "done" || status === "success")) ||
      (filter === "failed"  && (status === "failed" || status === "error"));
    const matchQ = !q || t.title.toLowerCase().includes(q) ||
      String(t.agentId ?? "").toLowerCase().includes(q) ||
      String(t.taskKind ?? "").toLowerCase().includes(q);
    return matchFilter && matchQ;
  });

  const counts = {
    all:     items.length,
    running: items.filter((t) => String(t.status).toLowerCase() === "running").length,
    pending: items.filter((t) => ["pending","queued"].includes(String(t.status).toLowerCase())).length,
    done:    items.filter((t) => ["done","success"].includes(String(t.status).toLowerCase())).length,
    failed:  items.filter((t) => ["failed","error"].includes(String(t.status).toLowerCase())).length,
  };

  return (
    <>
      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Live</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Tasks</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {error
            ? <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            : <>{items.length} task{items.length !== 1 ? "s" : ""} from <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{source}</code></>
          }
        </p>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────────── */}
      <FilterBar current={filter} counts={counts} />

      {/* ── Search ────────────────────────────────────────────────────────────── */}
      <SearchBar q={params?.q} placeholder="Search tasks…" />

      {/* ── Task list ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {filtered.length === 0 && (
          <EmptyState
            title={items.length === 0 ? "No tasks yet" : "No results"}
            sub={items.length === 0 ? "Create a task to get OpenClaw working." : "Try adjusting your search or filter."}
            icon="✓"
          />
        )}
        {filtered.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* FAB */}
      <CreateTaskButton />
    </>
  );
}

function TaskCard({ task }: { task: McRecord }) {
  const status          = String(task.status          ?? "unknown");
  const taskKind        = String(task.taskKind        ?? "");
  const runtime         = String(task.runtime         ?? "");
  const agentId         = String(task.agentId         ?? "");
  const error           = String(task.error           ?? "");
  const terminalSummary = String(task.terminalSummary ?? "");
  const startedAt       = String(task.startedAt       ?? "");
  const createdAt       = String(task.createdAt ?? task.lastEventAt ?? "");
  return (
    <div className="card fade-up" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Status dot */}
        <div style={{ paddingTop: 5 }}>
          <span className={`dot ${dotClass(status)}`} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, wordBreak: "break-word" }}>
            {task.title}
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span className={`badge ${statusClass(status)}`}>{status}</span>
            {taskKind && (
              <span className="badge" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>
                {taskKind}
              </span>
            )}
            {runtime && (
              <span className="badge" style={{ color: "var(--dim)", borderColor: "transparent", background: "transparent" }}>
                {runtime}
              </span>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)" }}>
              {timeAgo(createdAt)}
            </span>
          </div>

          {/* Agent + duration */}
          {(agentId || startedAt) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              {agentId && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ opacity: 0.5 }}>agent</span> {agentId}
                </span>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 8, padding: "6px 10px",
              background: "color-mix(in srgb, var(--red) 8%, transparent)",
              borderRadius: 6, border: "1px solid color-mix(in srgb, var(--red) 20%, transparent)",
            }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)" }}>
                {error.slice(0, 200)}
              </span>
            </div>
          )}

          {/* Terminal summary */}
          {!error && terminalSummary && (
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                {terminalSummary.slice(0, 180)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBar({ current, counts }: {
  current: string;
  counts: Record<string, number>;
}) {
  const tabs = [
    { key: "all",     label: "All",     color: "var(--muted)" },
    { key: "running", label: "Running", color: "var(--cyan)" },
    { key: "pending", label: "Pending", color: "var(--amber)" },
    { key: "done",    label: "Done",    color: "var(--green)" },
    { key: "failed",  label: "Failed",  color: "var(--red)" },
  ];
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {tabs.map((t) => (
        <a key={t.key} href={`?filter=${t.key}`} style={{
          padding: "5px 12px",
          borderRadius: 8,
          border: `1px solid ${current === t.key ? t.color + "55" : "var(--border)"}`,
          background: current === t.key ? t.color + "12" : "transparent",
          color: current === t.key ? t.color : "var(--muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}>
          {t.label}
          {counts[t.key] > 0 && (
            <span style={{
              background: current === t.key ? t.color + "22" : "var(--surface)",
              border: `1px solid ${current === t.key ? t.color + "33" : "var(--border)"}`,
              color: current === t.key ? t.color : "var(--dim)",
              borderRadius: 4, padding: "0 5px", fontSize: 9,
            }}>
              {counts[t.key]}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

function SearchBar({ q, placeholder }: { q?: string; placeholder: string }) {
  return (
    <form method="get" style={{ position: "relative" }}>
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="input"
        style={{ paddingLeft: 36 }}
      />
      <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    </form>
  );
}

function EmptyState({ title, sub, icon }: { title: string; sub: string; icon: string }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{sub}</div>
    </div>
  );
}

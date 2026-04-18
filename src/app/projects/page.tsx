import { getProjects } from "@/lib/data";
import type { McRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const [{ items, error, source }, params] = await Promise.all([
    getProjects(),
    searchParams,
  ]);

  const q = params?.q?.toLowerCase() ?? "";
  const filtered = items.filter((p) =>
    !q ||
    p.title.toLowerCase().includes(q) ||
    String(p.kind ?? "").toLowerCase().includes(q) ||
    String(p.branch ?? "").toLowerCase().includes(q)
  );

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>Workspace</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 4 }}>Projects</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          {error
            ? <span style={{ color: "var(--red)" }}>⚠ {error}</span>
            : <>{items.length} project{items.length !== 1 ? "s" : ""} in <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{source}</code></>
          }
        </p>
      </div>

      <form method="get" style={{ position: "relative", marginBottom: 20 }}>
        <input name="q" defaultValue={params?.q} placeholder="Search projects…" className="input" style={{ paddingLeft: 36 }} />
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </form>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.2 }}>📁</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {items.length === 0 ? "No projects found" : "No results"}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            No git repos detected in the workspace root.
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project }: { project: McRecord }) {
  const branch = String(project.branch ?? "");
  const kind = String(project.kind ?? "");
  const changes = String(project.changeSummary ?? "");
  const commands = (project.commands as string[] | undefined) ?? [];
  const updated = String(project.lastUpdated ?? "");
  const absolutePath = String(project.absolutePath ?? "");

  return (
    <div className="card fade-up" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Folder icon */}
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          background: "color-mix(in srgb, var(--cyan) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--cyan) 20%, transparent)",
          borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{project.title}</span>
            {kind && (
              <span className="badge" style={{ color: "var(--cyan)", borderColor: "color-mix(in srgb, var(--cyan) 30%, transparent)", background: "color-mix(in srgb, var(--cyan) 8%, transparent)" }}>
                {kind}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {branch && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <GitBranchIcon /> {branch}
              </span>
            )}
            {changes && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: changes === "Clean" ? "var(--green)" : "var(--amber)" }}>
                {changes}
              </span>
            )}
            {updated && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--dim)", marginLeft: "auto" }}>
                {updated}
              </span>
            )}
          </div>

          {project.description && (
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.5 }}>
              {String(project.description).slice(0, 120)}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            {commands.map((cmd) => (
              <span key={cmd} style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                padding: "2px 8px", borderRadius: 5,
                background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)",
              }}>
                {cmd}
              </span>
            ))}
            {absolutePath && (
              <a
                href={`/mission-control/api/download?path=${encodeURIComponent(absolutePath)}`}
                download
                style={{
                  marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                  padding: "3px 10px", borderRadius: 6, textDecoration: "none",
                  color: "var(--cyan)",
                  background: "color-mix(in srgb, var(--cyan) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--cyan) 25%, transparent)",
                }}
              >
                <DownloadIcon />
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GitBranchIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

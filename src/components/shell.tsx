import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";

const NAV = [
  { href: "/tasks",    label: "Tasks",    icon: TaskIcon,    desc: "Live task runs" },
  { href: "/agents",   label: "Agents",   icon: AgentIcon,   desc: "Session registry" },
  { href: "/projects", label: "Projects", icon: FolderIcon,  desc: "Workspace repos" },
  { href: "/calendar", label: "Schedule", icon: ClockIcon,   desc: "Cron events" },
  { href: "/memory",   label: "Memory",   icon: MemoryIcon,  desc: "Indexed chunks" },
];

export async function Shell({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? "";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* ── Desktop sidebar + content ─────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar — hidden on mobile */}
        <aside className="sidebar">
          <div className="sidebar-inner">
            {/* Logo mark */}
            <div style={{ padding: "24px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 32, height: 32,
                  background: "color-mix(in srgb, var(--red) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
                  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CrisisIcon />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "var(--red)" }}>MISSION CONTROL</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.05em" }}>OpenClaw</div>
                </div>
              </div>
            </div>

            <hr className="divider" style={{ marginBottom: 8 }} />

            {/* Nav items */}
            <nav style={{ padding: "8px 12px" }}>
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={`nav-item${active ? "" : ""}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                      color: active ? "var(--text)" : "var(--muted)",
                      background: active ? "color-mix(in srgb, var(--red) 8%, transparent)" : "transparent",
                      border: `1px solid ${active ? "color-mix(in srgb, var(--red) 20%, transparent)" : "transparent"}`,
                      transition: "all 120ms",
                    }}
                  >
                    <Icon size={16} color={active ? "var(--red)" : "var(--dim)"} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--text)" : "var(--muted)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 1 }}>{item.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--dim)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>Version</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>v2.0 · OpenClaw MC</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: 80 }}>
          {/* Mobile header */}
          <header className="mobile-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28,
                background: "color-mix(in srgb, var(--red) 14%, transparent)",
                border: "1px solid color-mix(in srgb, var(--red) 35%, transparent)",
                borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CrisisIcon size={14} />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: "var(--red)" }}>MISSION CONTROL</div>
            </div>
          </header>

          <div style={{ padding: "20px 16px 0", maxWidth: 900 }}>
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────────── */}
      <nav className="bottom-nav">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, padding: "8px 4px",
              color: active ? "var(--red)" : "var(--dim)",
              textDecoration: "none",
            }}>
              <Icon size={20} color={active ? "var(--red)" : "var(--dim)"} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: "0.05em" }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        .sidebar {
          display: none;
          width: 220px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: var(--surface);
          position: sticky;
          top: 0;
          height: 100dvh;
        }
        @media (min-width: 1024px) { .sidebar { display: block; } }
        .sidebar-inner { position: relative; height: 100%; overflow-y: auto; }

        .mobile-header {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 30;
        }
        @media (min-width: 1024px) { .mobile-header { display: none; } }

        .bottom-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          display: flex;
          background: var(--surface);
          border-top: 1px solid var(--border);
          z-index: 40;
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        @media (min-width: 1024px) { .bottom-nav { display: none; } }
      `}</style>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────────── */

function TaskIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function AgentIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M12 11V7m0 0a2 2 0 100-4 2 2 0 000 4z" />
      <path d="M8 15h.01M16 15h.01M8 19h8" />
    </svg>
  );
}

function FolderIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function ClockIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}

function MemoryIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}

function CrisisIcon({ size = 16, color = "var(--red)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

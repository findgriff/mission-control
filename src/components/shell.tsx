import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";

const NAV = [
  { href: "/tasks",    label: "Tasks",    icon: TaskIcon,    desc: "Live task runs" },
  { href: "/agents",   label: "Agents",   icon: AgentIcon,   desc: "Session registry" },
  { href: "/projects", label: "Projects", icon: FolderIcon,  desc: "Workspace repos" },
  { href: "/calendar", label: "Schedule", icon: ClockIcon,   desc: "Cron events" },
  { href: "/memory",   label: "Memory",   icon: MemoryIcon,  desc: "Indexed chunks" },
  { href: "/terminal", label: "Terminal", icon: TerminalIcon, desc: "Host shell" },
  { href: "/bridge",   label: "Bridge",   icon: BridgeIcon,   desc: "Agent jobs" },
];

const LOGO_SRC = "/mission-control/opspoket-official-logo.png";

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
            {/* Logo */}
            <div style={{ padding: "18px 18px 14px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Image
                  src={LOGO_SRC}
                  alt="OpsPoket Mission Control"
                  width={1536}
                  height={1024}
                  priority
                  style={{
                    width: "100%",
                    maxWidth: 176,
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
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
              <Image
                src={LOGO_SRC}
                alt="OpsPoket Mission Control"
                width={1536}
                height={1024}
                priority
                style={{
                  width: 132,
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                }}
              />
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

function TerminalIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3" />
      <path d="M13 15h4" />
    </svg>
  );
}

function BridgeIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10H7z" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M9.5 9.5h5v5h-5z" />
    </svg>
  );
}

import { headers } from "next/headers";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

const FALLBACK_IP = "http://188.166.150.21";

const TOOLS = [
  "list_tasks",
  "list_agents",
  "list_projects",
  "list_memory",
  "list_calendar",
  "health",
  "execute_command",
  "read_file",
  "write_file",
  "create_task",
  "commission_agent",
];

export default async function BridgePage() {
  const hdrs = await headers();
  const host =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (hdrs.get("x-forwarded-host")
      ? `${hdrs.get("x-forwarded-proto") ?? "http"}://${hdrs.get("x-forwarded-host")}`
      : hdrs.get("host")
      ? `http://${hdrs.get("host")}`
      : FALLBACK_IP);

  const mcpUrl = `${host}/mission-control/api/mcp`;

  const divider = (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "20px 0",
      }}
    />
  );

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-tag" style={{ marginBottom: 6 }}>
          MCP Connection Hub
        </div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            marginBottom: 4,
            letterSpacing: "0.04em",
          }}
        >
          THE BRIDGE
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          Pure MCP server — connect Claude Desktop, Cursor, or Claude Code and
          control Mission Control from your local machine.
        </p>
      </div>

      <div className="card" style={{ padding: "20px 24px" }}>
        {/* MCP Endpoint */}
        <div>
          <div
            className="section-tag"
            style={{ marginBottom: 10 }}
          >
            MCP ENDPOINT
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--cyan)",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 6,
                padding: "6px 12px",
                flex: 1,
                wordBreak: "break-all",
              }}
            >
              {mcpUrl}
            </code>
            <CopyButton text={mcpUrl} />
          </div>
        </div>

        {divider}

        {/* Connect instructions */}
        <div>
          <div className="section-tag" style={{ marginBottom: 16 }}>
            CONNECT FROM YOUR LOCAL MACHINE
          </div>

          {/* Claude Desktop */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Claude Desktop
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              Add to{" "}
              <code
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "var(--surface)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid var(--border2)",
                }}
              >
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code>
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--muted)",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                padding: "12px 16px",
                overflowX: "auto",
              }}
            >{`{
  "mcpServers": {
    "mission-control": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`}</pre>
          </div>

          {/* Cursor / Windsurf */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Cursor / Windsurf
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
              Add MCP server URL in Settings → MCP:
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                padding: "10px 16px",
              }}
            >{mcpUrl}</pre>
          </div>

          {/* Claude Code */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Claude Code (CLI)
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--muted)",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: 8,
                padding: "10px 16px",
                overflowX: "auto",
              }}
            >{`claude mcp add mission-control --transport http ${mcpUrl}`}</pre>
          </div>
        </div>

        {divider}

        {/* Available tools */}
        <div>
          <div className="section-tag" style={{ marginBottom: 10 }}>
            AVAILABLE TOOLS ({TOOLS.length})
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {TOOLS.map((tool) => (
              <span
                key={tool}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--cyan)",
                  background:
                    "color-mix(in srgb, var(--cyan) 8%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--cyan) 25%, transparent)",
                  borderRadius: 5,
                  padding: "3px 9px",
                }}
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

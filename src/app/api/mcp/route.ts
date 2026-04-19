import { executeTool, TOOL_DEFINITIONS } from "@/lib/bridge-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── CORS headers ───────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
};

// ── JSON-RPC types ─────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcOk(id: string | number | null, result: unknown): Response {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    { headers: CORS_HEADERS }
  );
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
): Response {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: CORS_HEADERS }
  );
}

// ── OPTIONS — CORS preflight ───────────────────────────────────────────────────

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — SSE stream (MCP Streamable HTTP transport) ──────────────────────────

export async function GET(request: Request): Promise<Response> {
  const postUrl = new URL(request.url).toString();

  const stream = new ReadableStream({
    start(controller) {
      // Send the endpoint event as required by MCP Streamable HTTP spec
      controller.enqueue(
        new TextEncoder().encode(`event: endpoint\ndata: ${postUrl}\n\n`)
      );
      // Keep the stream open — clients hold this connection for server-sent events
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── POST — JSON-RPC handler ────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let rpc: JsonRpcRequest;
  try {
    rpc = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonRpcError(null, -32700, "Parse error: invalid JSON.");
  }

  const { id = null, method, params = {} } = rpc;

  switch (method) {
    case "initialize":
      return jsonRpcOk(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "mission-control", version: "2.0.0" },
      });

    case "notifications/initialized":
      return jsonRpcOk(id, {});

    case "ping":
      return jsonRpcOk(id, {});

    case "tools/list":
      return jsonRpcOk(id, {
        tools: TOOL_DEFINITIONS.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          inputSchema: t.function.parameters,
        })),
      });

    case "tools/call": {
      const toolName = typeof params.name === "string" ? params.name : "";
      const toolArgs =
        params.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, unknown>)
          : {};

      if (!toolName) {
        return jsonRpcError(id, -32602, "Invalid params: name is required.");
      }

      const result = await executeTool(toolName, toolArgs);

      return jsonRpcOk(id, {
        content: [{ type: "text", text: result.result }],
        isError: !result.ok,
      });
    }

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

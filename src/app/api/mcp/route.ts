import { executeTool, TOOL_DEFINITIONS } from "@/lib/bridge-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── JSON-RPC types ─────────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function jsonRpcOk(id: string | number | null, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string
): Response {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

// ── GET — capability discovery ─────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  return Response.json({
    name: "mission-control",
    version: "2.0.0",
    description: "Mission Control MCP server — tools for reading MC data and operating the OpenClaw VPS.",
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
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

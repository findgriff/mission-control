import { runBridge, type BridgeRunRequest } from "@/lib/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: BridgeRunRequest;
  try {
    body = (await request.json()) as BridgeRunRequest;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await runBridge(body);
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

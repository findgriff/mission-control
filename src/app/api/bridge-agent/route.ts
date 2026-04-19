import { executeTool, TOOL_DEFINITIONS } from "@/lib/bridge-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Types ──────────────────────────────────────────────────────────────────────

type Provider = "openai" | "anthropic" | "ollama" | "google" | "custom";

interface BridgeAgentRequest {
  provider: Provider;
  endpoint: string;
  apiKey?: string;
  model: string;
  systemPrompt?: string;
  message: string;
  maxTurns?: number;
}

type SseEvent =
  | { type: "start"; model: string; provider: string; timestamp: string }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; ok: boolean; result: string }
  | { type: "message"; content: string }
  | { type: "done"; turns: number; timestamp: string }
  | { type: "error"; message: string };

// ── SSE helpers ────────────────────────────────────────────────────────────────

function sseEncode(event: SseEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

// ── Default system prompt ──────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `You are an AI operator with full control over an OpenClaw VPS management system called Mission Control.
You have access to tools to read data (tasks, agents, projects, memory, calendar), execute shell commands,
create tasks, commission agents, and read/write files. Use them to accomplish the user's goal.
Be methodical: check current state first, then act. Report what you find and what you did.`;

// ── Anthropic tool format ──────────────────────────────────────────────────────

function toAnthropicTools() {
  return TOOL_DEFINITIONS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

// ── OpenAI-compatible agentic loop ─────────────────────────────────────────────

async function runOpenAILoop(
  req: BridgeAgentRequest,
  send: (event: SseEvent) => void
): Promise<number> {
  const { endpoint, apiKey, model, message, maxTurns = 20 } = req;
  const systemPrompt = req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  type OAIMessage = {
    role: "system" | "user" | "assistant" | "tool";
    content: string | null;
    tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
    name?: string;
  };

  const messages: OAIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    const body = {
      model,
      messages,
      tools: TOOL_DEFINITIONS,
      stream: false,
    };

    let resp: Response;
    try {
      resp = await fetch(`${endpoint}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      send({ type: "error", message: `Network error: ${e instanceof Error ? e.message : String(e)}` });
      return turns;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      send({ type: "error", message: `LLM API error ${resp.status}: ${text}` });
      return turns;
    }

    type OAIResponse = {
      choices: Array<{
        message: {
          role: string;
          content: string | null;
          tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
        };
        finish_reason: string;
      }>;
    };

    const data = (await resp.json()) as OAIResponse;
    const choice = data.choices?.[0];
    if (!choice) {
      send({ type: "error", message: "Empty response from LLM." });
      return turns;
    }

    const assistantMsg = choice.message;

    // Emit thinking text if any
    if (assistantMsg.content) {
      send({ type: "thinking", content: assistantMsg.content });
    }

    // Add assistant message to history
    messages.push({
      role: "assistant",
      content: assistantMsg.content,
      tool_calls: assistantMsg.tool_calls as OAIMessage["tool_calls"],
    });

    // If no tool calls, we're done
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      if (assistantMsg.content) {
        send({ type: "message", content: assistantMsg.content });
      }
      break;
    }

    // Execute tool calls
    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name;
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch { /* use empty args */ }

      send({ type: "tool_call", name: toolName, args: toolArgs });

      const result = await executeTool(toolName, toolArgs);

      send({ type: "tool_result", name: toolName, ok: result.ok, result: result.result });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolName,
        content: result.result,
      });
    }
  }

  return turns;
}

// ── Anthropic agentic loop ─────────────────────────────────────────────────────

async function runAnthropicLoop(
  req: BridgeAgentRequest,
  send: (event: SseEvent) => void
): Promise<number> {
  const { apiKey, model, message, maxTurns = 20 } = req;
  const systemPrompt = req.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  type AnthropicContent =
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
    | { type: "tool_result"; tool_use_id: string; content: string };

  type AnthropicMessage = {
    role: "user" | "assistant";
    content: string | AnthropicContent[];
  };

  const messages: AnthropicMessage[] = [{ role: "user", content: message }];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    const body = {
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: toAnthropicTools(),
    };

    let resp: Response;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      send({ type: "error", message: `Network error: ${e instanceof Error ? e.message : String(e)}` });
      return turns;
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText);
      send({ type: "error", message: `Anthropic API error ${resp.status}: ${text}` });
      return turns;
    }

    type AnthropicResponse = {
      content: AnthropicContent[];
      stop_reason: string;
    };

    const data = (await resp.json()) as AnthropicResponse;
    const contentItems = data.content ?? [];

    // Collect text and tool_use blocks
    const textBlocks = contentItems.filter((c) => c.type === "text") as { type: "text"; text: string }[];
    const toolUseBlocks = contentItems.filter((c) => c.type === "tool_use") as {
      type: "tool_use"; id: string; name: string; input: Record<string, unknown>;
    }[];

    // Emit thinking text
    for (const block of textBlocks) {
      if (block.text) {
        send({ type: "thinking", content: block.text });
      }
    }

    // Add assistant turn
    messages.push({ role: "assistant", content: contentItems });

    // If no tool use, done
    if (toolUseBlocks.length === 0 || data.stop_reason === "end_turn") {
      const finalText = textBlocks.map((b) => b.text).join("\n").trim();
      if (finalText) send({ type: "message", content: finalText });
      break;
    }

    // Execute tools and build user tool_result message
    const toolResults: AnthropicContent[] = [];

    for (const toolUse of toolUseBlocks) {
      send({ type: "tool_call", name: toolUse.name, args: toolUse.input });

      const result = await executeTool(toolUse.name, toolUse.input);

      send({ type: "tool_result", name: toolUse.name, ok: result.ok, result: result.result });

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result.result,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return turns;
}

// ── POST handler ───────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: BridgeAgentRequest;
  try {
    body = (await request.json()) as BridgeAgentRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { provider, endpoint, model } = body;
  if (!provider || !endpoint || !model || !body.message) {
    return Response.json({ error: "provider, endpoint, model, and message are required." }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: SseEvent) {
        controller.enqueue(sseEncode(event));
      }

      try {
        send({ type: "start", model, provider, timestamp: new Date().toISOString() });

        let turns: number;

        if (provider === "anthropic") {
          turns = await runAnthropicLoop(body, send);
        } else {
          // openai, ollama, custom — all OpenAI-compatible
          turns = await runOpenAILoop(body, send);
        }

        send({ type: "done", turns, timestamp: new Date().toISOString() });
      } catch (e) {
        send({
          type: "error",
          message: `Bridge agent error: ${e instanceof Error ? e.message : String(e)}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

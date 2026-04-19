"use server";

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import path from "node:path";

const exec = promisify(execFile);

const OPENCLAW_USER_HOME = process.env.OPENCLAW_USER_HOME ?? "/home/clawd";
const OPENCLAW_BIN_DIR   = process.env.OPENCLAW_BIN_DIR ?? `${OPENCLAW_USER_HOME}/.npm-global/bin`;
const OPENCLAW_HOME      = process.env.OPENCLAW_HOME ?? `${OPENCLAW_USER_HOME}/.openclaw`;
const OPENCLAW_CONFIG    = path.join(OPENCLAW_HOME, "openclaw.json");

// Gateway defaults — overridden by env vars if set
const GATEWAY_URL   = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";

const CLAW_ENV = {
  ...process.env,
  PATH: `${OPENCLAW_BIN_DIR}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
  HOME: OPENCLAW_USER_HOME,
};

async function runClaw(args: string[]): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await exec("openclaw", args, {
      env: CLAW_ENV,
      timeout: 30_000,
      maxBuffer: 1024 * 512,
    });
    return { ok: true, output: (stdout || stderr).trim() };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const stderr = (e as { stderr?: string }).stderr?.trim() ?? "";
    return { ok: false, output: stderr || msg };
  }
}

// Read the gateway auth token from openclaw.json (or env override)
async function readGatewayToken(): Promise<string> {
  if (process.env.OPENCLAW_GATEWAY_TOKEN) return process.env.OPENCLAW_GATEWAY_TOKEN;
  try {
    const raw = await readFile(OPENCLAW_CONFIG, "utf8");
    const cfg = JSON.parse(raw) as { gateway?: { auth?: { token?: string } } };
    return cfg?.gateway?.auth?.token ?? "";
  } catch {
    return "";
  }
}

// ── Create Task ────────────────────────────────────────────────────────────────

export type TaskActionState = {
  ok?: boolean;
  output?: string;
  error?: string;
} | null;

export async function createTask(
  _prev: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const title       = (formData.get("title")       as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() ?? "";

  if (!title) return { ok: false, error: "Title is required." };

  const message = description ? `${title}\n\n${description}` : title;
  const token   = await readGatewayToken();

  if (!token) {
    return { ok: false, error: "Gateway token not found. Check OPENCLAW_CONFIG path or set OPENCLAW_GATEWAY_TOKEN." };
  }

  // POST to the OpenClaw gateway chat API — fire-and-forget.
  // We abort after 3 s so the HTTP request returns fast; the gateway continues
  // processing the message and creates a task_run entry in the background.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: "auto",
        messages: [{ role: "user", content: message }],
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    // AbortError is expected — we deliberately cut the connection.
    // Any other error means the gateway wasn't reachable.
    if (e instanceof Error && e.name !== "AbortError") {
      clearTimeout(timer);
      return { ok: false, error: `Gateway unreachable: ${e.message}` };
    }
  } finally {
    clearTimeout(timer);
  }

  revalidatePath("/tasks");
  return { ok: true, output: `Task sent to gateway: "${title}"` };
}

// ── Spawn Agent ────────────────────────────────────────────────────────────────

export type AgentActionState = {
  ok?: boolean;
  output?: string;
  error?: string;
} | null;

export async function spawnAgent(
  _prev: AgentActionState,
  formData: FormData
): Promise<AgentActionState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const role = (formData.get("role") as string | null)?.trim() ?? "";

  if (!name) return { ok: false, error: "Name is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const slug      = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workspace = `${OPENCLAW_USER_HOME}/.openclaw/workspace-${slug}`;

  const { mkdir, writeFile } = await import("node:fs/promises");
  try { await mkdir(workspace, { recursive: true }); } catch { /* already exists */ }

  const result = await runClaw([
    "agents", "add", name,
    "--non-interactive",
    "--workspace", workspace,
  ]);

  if (result.ok) {
    try {
      await writeFile(`${workspace}/SOUL.md`, `# SOUL.md — ${name}\n\n${role}\n`, "utf8");
    } catch { /* non-fatal */ }

    revalidatePath("/agents");
    return { ok: true, output: result.output || `Agent "${name}" commissioned.` };
  }
  return { ok: false, error: result.output || "Failed to spawn agent." };
}

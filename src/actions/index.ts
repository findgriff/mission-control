"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";

const exec = promisify(execFile);

const OPENCLAW_USER_HOME = process.env.OPENCLAW_USER_HOME ?? "/home/clawd";
const OPENCLAW_BIN_DIR = process.env.OPENCLAW_BIN_DIR ?? `${OPENCLAW_USER_HOME}/.npm-global/bin`;

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

  const task = description ? `${title}\n\n${description}` : title;
  const result = await runClaw(["tasks", "create", task]);

  if (result.ok) {
    revalidatePath("/tasks");
    return { ok: true, output: result.output || "Task created." };
  }
  return { ok: false, error: result.output || "Failed to create task." };
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
  const name  = (formData.get("name") as string | null)?.trim() ?? "";
  const role  = (formData.get("role") as string | null)?.trim() ?? "";

  if (!name) return { ok: false, error: "Name is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const result = await runClaw(["agents", "new", name, role]);

  if (result.ok) {
    revalidatePath("/agents");
    return { ok: true, output: result.output || `Agent "${name}" commissioned.` };
  }
  return { ok: false, error: result.output || "Failed to spawn agent." };
}

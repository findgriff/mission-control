"use server";

import { execFile, spawn } from "node:child_process";
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

  // `openclaw agent --message` can take minutes to complete an agent turn.
  // Fire-and-forget with a detached process so the HTTP request returns fast.
  const message = description ? `${title}\n\n${description}` : title;

  return new Promise((resolve) => {
    try {
      const child = spawn("openclaw", ["agent", "--message", message], {
        detached: true,
        stdio: "ignore",
        env: CLAW_ENV,
      });
      child.unref();
      revalidatePath("/tasks");
      resolve({ ok: true, output: "Task dispatched to agent." });
    } catch (e) {
      resolve({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  });
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

  // `openclaw agents new` does not exist — correct command is `agents add`
  // with --non-interactive (requires --workspace).
  const slug      = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workspace = `${OPENCLAW_USER_HOME}/.openclaw/workspace-${slug}`;

  // Ensure workspace dir exists before passing it to openclaw
  const { mkdir, writeFile } = await import("node:fs/promises");
  try { await mkdir(workspace, { recursive: true }); } catch { /* already exists */ }

  const result = await runClaw([
    "agents", "add", name,
    "--non-interactive",
    "--workspace", workspace,
  ]);

  if (result.ok) {
    // Write the role as SOUL.md so the agent has its personality/instructions
    try {
      await writeFile(`${workspace}/SOUL.md`, `# SOUL.md — ${name}\n\n${role}\n`, "utf8");
    } catch { /* non-fatal — agent exists, soul write failed silently */ }

    revalidatePath("/agents");
    return { ok: true, output: result.output || `Agent "${name}" commissioned.` };
  }
  return { ok: false, error: result.output || "Failed to spawn agent." };
}

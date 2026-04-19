import { exec, execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getAgents, getCalendar, getMemory, getProjects, getTasks } from "@/lib/data";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// ── Environment ────────────────────────────────────────────────────────────────

const OPENCLAW_USER_HOME = process.env.OPENCLAW_USER_HOME ?? "/home/clawd";
const OPENCLAW_BIN_DIR =
  process.env.OPENCLAW_BIN_DIR ?? `${OPENCLAW_USER_HOME}/.npm-global/bin`;
const BRIDGE_CWD =
  process.env.MISSION_CONTROL_BRIDGE_CWD ?? `${OPENCLAW_USER_HOME}/clawd`;

function bridgeEnv() {
  return {
    ...process.env,
    HOME: OPENCLAW_USER_HOME,
    PATH: `${OPENCLAW_BIN_DIR}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
  };
}

// ── Tool result type ───────────────────────────────────────────────────────────

export type ToolResult = { ok: boolean; result: string };

function ok(result: string): ToolResult {
  return { ok: true, result };
}

function fail(msg: string): ToolResult {
  return { ok: false, result: msg };
}

// ── Sandbox check ──────────────────────────────────────────────────────────────

function sandboxPath(filePath: string): { safe: true; resolved: string } | { safe: false; reason: string } {
  if (filePath.includes("../")) {
    return { safe: false, reason: "Path traversal (../) is not allowed." };
  }
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(BRIDGE_CWD, filePath);
  if (!resolved.startsWith(BRIDGE_CWD)) {
    return { safe: false, reason: `Path must be under ${BRIDGE_CWD}.` };
  }
  return { safe: true, resolved };
}

// ── Individual tool executors ──────────────────────────────────────────────────

async function toolListTasks(): Promise<ToolResult> {
  const col = await getTasks();
  return ok(JSON.stringify(col));
}

async function toolListAgents(): Promise<ToolResult> {
  const col = await getAgents();
  return ok(JSON.stringify(col));
}

async function toolListProjects(): Promise<ToolResult> {
  const col = await getProjects();
  return ok(JSON.stringify(col));
}

async function toolListMemory(): Promise<ToolResult> {
  const col = await getMemory();
  return ok(JSON.stringify(col));
}

async function toolListCalendar(): Promise<ToolResult> {
  const col = await getCalendar();
  return ok(JSON.stringify(col));
}

async function toolHealth(): Promise<ToolResult> {
  return ok(JSON.stringify({ ok: true, time: new Date().toISOString(), service: "mission-control" }));
}

async function toolExecuteCommand(args: Record<string, unknown>): Promise<ToolResult> {
  const command = typeof args.command === "string" ? args.command.trim() : "";
  if (!command) return fail("command is required.");

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: BRIDGE_CWD,
      env: bridgeEnv(),
      shell: process.env.SHELL ?? "/bin/bash",
      timeout: 30_000,
      maxBuffer: 1024 * 1024 * 4,
    });
    return ok(JSON.stringify({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 }));
  } catch (e: unknown) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
    return ok(
      JSON.stringify({
        stdout: err.stdout?.trim() ?? "",
        stderr: err.stderr?.trim() ?? "",
        exitCode: err.code ?? 1,
        error: err.message,
      })
    );
  }
}

async function toolReadFile(args: Record<string, unknown>): Promise<ToolResult> {
  const filePath = typeof args.path === "string" ? args.path : "";
  if (!filePath) return fail("path is required.");

  const check = sandboxPath(filePath);
  if (!check.safe) return fail(check.reason);

  try {
    const content = await readFile(check.resolved, "utf8");
    return ok(content);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

async function toolWriteFile(args: Record<string, unknown>): Promise<ToolResult> {
  const filePath = typeof args.path === "string" ? args.path : "";
  const content = typeof args.content === "string" ? args.content : "";
  if (!filePath) return fail("path is required.");

  const check = sandboxPath(filePath);
  if (!check.safe) return fail(check.reason);

  try {
    await mkdir(path.dirname(check.resolved), { recursive: true });
    await writeFile(check.resolved, content, "utf8");
    return ok(`Written ${content.length} bytes to ${check.resolved}`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

async function toolCreateTask(args: Record<string, unknown>): Promise<ToolResult> {
  const message = typeof args.message === "string" ? args.message.trim() : "";
  if (!message) return fail("message is required.");

  try {
    const { stdout, stderr } = await execFileAsync(
      "openclaw",
      ["agent", "--message", message],
      { env: bridgeEnv(), timeout: 30_000, maxBuffer: 1024 * 512 }
    );
    return ok((stdout || stderr).trim() || "Task queued.");
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    return fail(err.stderr?.trim() || err.message || "Failed to create task.");
  }
}

async function toolCommissionAgent(args: Record<string, unknown>): Promise<ToolResult> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  const soul = typeof args.soul === "string" ? args.soul.trim() : "";
  const workspaceArg = typeof args.workspace === "string" ? args.workspace.trim() : "";

  if (!name) return fail("name is required.");

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const workspace = workspaceArg || `${OPENCLAW_USER_HOME}/.openclaw/workspace-${slug}`;

  try {
    await mkdir(workspace, { recursive: true });
  } catch { /* already exists */ }

  try {
    const { stdout, stderr } = await execFileAsync(
      "openclaw",
      ["agents", "add", name, "--non-interactive", "--workspace", workspace],
      { env: bridgeEnv(), timeout: 30_000, maxBuffer: 1024 * 512 }
    );

    if (soul) {
      try {
        await writeFile(`${workspace}/SOUL.md`, `# SOUL.md — ${name}\n\n${soul}\n`, "utf8");
      } catch { /* non-fatal */ }
    }

    return ok((stdout || stderr).trim() || `Agent "${name}" commissioned at ${workspace}.`);
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    return fail(err.stderr?.trim() || err.message || "Failed to commission agent.");
  }
}

// ── Tool definitions (OpenAI format) ──────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "list_tasks",
      description: "List all recent tasks from the Mission Control task database. Returns task IDs, statuses, labels, and summaries.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_agents",
      description: "List all agents registered in Mission Control, including their session counts, statuses, and models.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_projects",
      description: "List all open projects in the Mission Control workspace.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_memory",
      description: "Read the most recent 100 memory chunks from the Mission Control memory database.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_calendar",
      description: "List all scheduled cron jobs and their last-run status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "health",
      description: "Check Mission Control service health. Returns ok status and current timestamp.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "execute_command",
      description:
        `Execute a shell command on the VPS. Runs in ${BRIDGE_CWD} with openclaw binaries on PATH. Timeout: 30s. Returns stdout, stderr, and exitCode.`,
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute." },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: `Read a file from the VPS workspace. Path must be under ${BRIDGE_CWD}. Absolute or relative paths accepted (relative = relative to cwd).`,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: `Write content to a file in the VPS workspace. Path must be under ${BRIDGE_CWD}. Parent directories are created automatically.`,
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to write." },
          content: { type: "string", description: "Content to write to the file." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_task",
      description: "Create a new task by sending a message to the default OpenClaw agent. This triggers an agent turn.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "The task message or instruction to send to the agent." },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "commission_agent",
      description: "Commission (create) a new OpenClaw agent with a given name and optional soul/personality instructions.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The agent's name." },
          soul: { type: "string", description: "The agent's personality/role instructions (written to SOUL.md)." },
          workspace: { type: "string", description: "Optional workspace directory path. Defaults to ~/.openclaw/workspace-<slug>." },
        },
        required: ["name"],
      },
    },
  },
];

// ── executeTool dispatcher ─────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_tasks":      return await toolListTasks();
      case "list_agents":     return await toolListAgents();
      case "list_projects":   return await toolListProjects();
      case "list_memory":     return await toolListMemory();
      case "list_calendar":   return await toolListCalendar();
      case "health":          return await toolHealth();
      case "execute_command": return await toolExecuteCommand(args);
      case "read_file":       return await toolReadFile(args);
      case "write_file":      return await toolWriteFile(args);
      case "create_task":     return await toolCreateTask(args);
      case "commission_agent":return await toolCommissionAgent(args);
      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return fail(`Tool "${name}" threw an unexpected error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

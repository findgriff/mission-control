import { exec, execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export type BridgeRunner = "codex" | "shell";

export type BridgeRunRequest = {
  runner?: unknown;
  prompt?: unknown;
  command?: unknown;
  cwd?: unknown;
};

export type BridgeRunResult = {
  ok: boolean;
  id: string;
  runner: BridgeRunner;
  cwd: string;
  command: string;
  prompt: string;
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number | string | null;
  signal?: string | null;
  durationMs: number;
  files: {
    task: string;
    log: string;
    result: string;
  };
};

const AGENT_DIR = ".agent";

export async function runBridge(raw: BridgeRunRequest): Promise<BridgeRunResult> {
  const runner = raw.runner === "shell" ? "shell" : "codex";
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  const commandInput = typeof raw.command === "string" ? raw.command.trim() : "";
  const cwdInput = typeof raw.cwd === "string" ? raw.cwd.trim() : "";
  const cwd = cwdInput || process.env.MISSION_CONTROL_BRIDGE_CWD || process.env.MISSION_CONTROL_TERMINAL_CWD || process.cwd();
  const id = createRunId();
  const startedAt = Date.now();
  const agentRoot = path.join(cwd, AGENT_DIR);
  const inboxDir = path.join(agentRoot, "inbox");
  const runDir = path.join(agentRoot, "runs");

  await mkdir(inboxDir, { recursive: true });
  await mkdir(runDir, { recursive: true });

  const taskPath = path.join(inboxDir, "current-task.md");
  const logPath = path.join(runDir, `${id}.log`);
  const resultPath = path.join(runDir, `${id}.json`);
  await writeFile(taskPath, renderTaskFile({ id, runner, cwd, prompt, command: commandInput }), "utf8");

  const command = runner === "codex"
    ? `codex exec --full-auto ${JSON.stringify(prompt)}`
    : commandInput;

  let result: Omit<BridgeRunResult, "files">;

  if (runner === "codex") {
    result = await runCodex({ id, cwd, prompt, command, startedAt });
  } else {
    result = await runShell({ id, cwd, prompt, command, startedAt });
  }

  const fullResult: BridgeRunResult = {
    ...result,
    files: {
      task: path.relative(cwd, taskPath),
      log: path.relative(cwd, logPath),
      result: path.relative(cwd, resultPath),
    },
  };

  await writeFile(logPath, renderLog(fullResult), "utf8");
  await writeFile(resultPath, `${JSON.stringify(fullResult, null, 2)}\n`, "utf8");

  return fullResult;
}

async function runCodex({
  id,
  cwd,
  prompt,
  command,
  startedAt,
}: {
  id: string;
  cwd: string;
  prompt: string;
  command: string;
  startedAt: number;
}): Promise<Omit<BridgeRunResult, "files">> {
  if (!prompt) {
    return emptyFailure({ id, runner: "codex", cwd, prompt, command, startedAt, error: "Prompt is required." });
  }

  try {
    const { stdout, stderr } = await execFileAsync("codex", ["exec", "--full-auto", prompt], {
      cwd,
      env: bridgeEnv(),
      timeout: bridgeTimeoutMs(),
      maxBuffer: bridgeMaxBuffer(),
    });

    return {
      ok: true,
      id,
      runner: "codex",
      cwd,
      command,
      prompt,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return formatExecError({ id, runner: "codex", cwd, command, prompt, startedAt, error });
  }
}

async function runShell({
  id,
  cwd,
  prompt,
  command,
  startedAt,
}: {
  id: string;
  cwd: string;
  prompt: string;
  command: string;
  startedAt: number;
}): Promise<Omit<BridgeRunResult, "files">> {
  if (!command) {
    return emptyFailure({ id, runner: "shell", cwd, prompt, command, startedAt, error: "Command is required." });
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: bridgeEnv(),
      shell: process.env.SHELL || "/bin/bash",
      timeout: bridgeTimeoutMs(),
      maxBuffer: bridgeMaxBuffer(),
    });

    return {
      ok: true,
      id,
      runner: "shell",
      cwd,
      command,
      prompt,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return formatExecError({ id, runner: "shell", cwd, command, prompt, startedAt, error });
  }
}

function bridgeEnv() {
  return {
    ...process.env,
    HOME: process.env.OPENCLAW_USER_HOME ?? process.env.HOME,
    PATH: `${process.env.OPENCLAW_BIN_DIR ?? ""}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
  };
}

function bridgeTimeoutMs(): number {
  return Number(process.env.MISSION_CONTROL_BRIDGE_TIMEOUT_MS ?? 600_000);
}

function bridgeMaxBuffer(): number {
  return Number(process.env.MISSION_CONTROL_BRIDGE_MAX_BUFFER ?? 1024 * 1024 * 16);
}

function createRunId(): string {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatExecError({
  id,
  runner,
  cwd,
  command,
  prompt,
  startedAt,
  error,
}: {
  id: string;
  runner: BridgeRunner;
  cwd: string;
  command: string;
  prompt: string;
  startedAt: number;
  error: unknown;
}): Omit<BridgeRunResult, "files"> {
  const err = error as {
    code?: number | string;
    signal?: string;
    stdout?: string;
    stderr?: string;
    message?: string;
  };

  return {
    ok: false,
    id,
    runner,
    cwd,
    command,
    prompt,
    stdout: err.stdout ?? "",
    stderr: err.stderr ?? "",
    error: err.message ?? "Bridge run failed.",
    exitCode: err.code ?? null,
    signal: err.signal ?? null,
    durationMs: Date.now() - startedAt,
  };
}

function emptyFailure({
  id,
  runner,
  cwd,
  command,
  prompt,
  startedAt,
  error,
}: {
  id: string;
  runner: BridgeRunner;
  cwd: string;
  command: string;
  prompt: string;
  startedAt: number;
  error: string;
}): Omit<BridgeRunResult, "files"> {
  return {
    ok: false,
    id,
    runner,
    cwd,
    command,
    prompt,
    stdout: "",
    stderr: "",
    error,
    durationMs: Date.now() - startedAt,
  };
}

function renderTaskFile({
  id,
  runner,
  cwd,
  prompt,
  command,
}: {
  id: string;
  runner: BridgeRunner;
  cwd: string;
  prompt: string;
  command: string;
}): string {
  return [
    `# Mission Control Bridge Task`,
    ``,
    `- Run ID: ${id}`,
    `- Runner: ${runner}`,
    `- Working directory: ${cwd}`,
    `- Created: ${new Date().toISOString()}`,
    ``,
    `## Prompt`,
    ``,
    prompt || "(none)",
    ``,
    `## Command`,
    ``,
    "```bash",
    command || "(none)",
    "```",
    ``,
  ].join("\n");
}

function renderLog(result: BridgeRunResult): string {
  return [
    `# Bridge Run ${result.id}`,
    ``,
    `Runner: ${result.runner}`,
    `Status: ${result.ok ? "ok" : "failed"}`,
    `Duration: ${result.durationMs}ms`,
    `Working directory: ${result.cwd}`,
    ``,
    `## Command`,
    ``,
    "```bash",
    result.command,
    "```",
    ``,
    `## Prompt`,
    ``,
    result.prompt || "(none)",
    ``,
    `## Stdout`,
    ``,
    "```text",
    result.stdout || "",
    "```",
    ``,
    `## Stderr`,
    ``,
    "```text",
    result.stderr || "",
    "```",
    ``,
    result.error ? `## Error\n\n${result.error}\n` : "",
  ].join("\n");
}

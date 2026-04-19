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
  model?: unknown;
  codexMode?: unknown;
};

export type BridgeRunResult = {
  ok: boolean;
  id: string;
  runner: BridgeRunner;
  cwd: string;
  command: string;
  prompt: string;
  model?: string;
  codexMode?: "unrestricted" | "full-auto";
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
  const model = typeof raw.model === "string" && raw.model.trim()
    ? raw.model.trim()
    : process.env.MISSION_CONTROL_CODEX_MODEL || "gpt-5.1-codex-mini";
  const codexMode = raw.codexMode === "full-auto" ? "full-auto" : "unrestricted";
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
  await writeFile(taskPath, renderTaskFile({ id, runner, cwd, prompt, command: commandInput, model, codexMode }), "utf8");

  const command = runner === "codex"
    ? renderCodexCommand({ prompt, model, codexMode })
    : commandInput;

  let result: Omit<BridgeRunResult, "files">;

  if (runner === "codex") {
    result = await runCodex({ id, cwd, prompt, command, model, codexMode, startedAt });
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
  model,
  codexMode,
  startedAt,
}: {
  id: string;
  cwd: string;
  prompt: string;
  command: string;
  model: string;
  codexMode: "unrestricted" | "full-auto";
  startedAt: number;
}): Promise<Omit<BridgeRunResult, "files">> {
  if (!prompt) {
    return emptyFailure({ id, runner: "codex", cwd, prompt, command, startedAt, error: "Prompt is required." });
  }

  try {
    const { stdout, stderr } = await execFileAsync("codex", codexArgs({ prompt, model, codexMode }), {
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
      model,
      codexMode,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return formatExecError({ id, runner: "codex", cwd, command, prompt, model, codexMode, startedAt, error });
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

function codexArgs({
  prompt,
  model,
  codexMode,
}: {
  prompt: string;
  model: string;
  codexMode: "unrestricted" | "full-auto";
}): string[] {
  const modeFlag = codexMode === "full-auto"
    ? "--full-auto"
    : "--dangerously-bypass-approvals-and-sandbox";
  return ["exec", modeFlag, "--model", model, prompt];
}

function renderCodexCommand({
  prompt,
  model,
  codexMode,
}: {
  prompt: string;
  model: string;
  codexMode: "unrestricted" | "full-auto";
}): string {
  return `codex ${codexArgs({ prompt, model, codexMode }).map(shellQuote).join(" ")}`;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=+-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
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
  model,
  codexMode,
  startedAt,
  error,
}: {
  id: string;
  runner: BridgeRunner;
  cwd: string;
  command: string;
  prompt: string;
  model?: string;
  codexMode?: "unrestricted" | "full-auto";
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
    model,
    codexMode,
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
  model,
  codexMode,
}: {
  id: string;
  runner: BridgeRunner;
  cwd: string;
  prompt: string;
  command: string;
  model?: string;
  codexMode?: "unrestricted" | "full-auto";
}): string {
  return [
    `# Mission Control Bridge Task`,
    ``,
    `- Run ID: ${id}`,
    `- Runner: ${runner}`,
    `- Working directory: ${cwd}`,
    runner === "codex" && model ? `- Codex model: ${model}` : "",
    runner === "codex" && codexMode ? `- Codex mode: ${codexMode}` : "",
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
  ].filter((line) => line !== "").join("\n");
}

function renderLog(result: BridgeRunResult): string {
  return [
    `# Bridge Run ${result.id}`,
    ``,
    `Runner: ${result.runner}`,
    `Status: ${result.ok ? "ok" : "failed"}`,
    `Duration: ${result.durationMs}ms`,
    `Working directory: ${result.cwd}`,
    result.model ? `Codex model: ${result.model}` : "",
    result.codexMode ? `Codex mode: ${result.codexMode}` : "",
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
  ].filter((line) => line !== "").join("\n");
}

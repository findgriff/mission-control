import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TerminalRequest = {
  command?: unknown;
  cwd?: unknown;
};

export async function POST(request: Request) {
  if (process.env.MISSION_CONTROL_TERMINAL_ENABLED !== "true") {
    return Response.json({ ok: false, error: "Terminal is disabled." }, { status: 404 });
  }

  let body: TerminalRequest;
  try {
    body = (await request.json()) as TerminalRequest;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const command = typeof body.command === "string" ? body.command.trim() : "";
  const cwdInput = typeof body.cwd === "string" ? body.cwd.trim() : "";
  const cwd = cwdInput || process.env.MISSION_CONTROL_TERMINAL_CWD || process.cwd();

  if (!command) {
    return Response.json({ ok: false, error: "Command is required." }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: {
        ...process.env,
        HOME: process.env.OPENCLAW_USER_HOME ?? process.env.HOME,
        PATH: `${process.env.OPENCLAW_BIN_DIR ?? ""}:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
      },
      shell: process.env.SHELL || "/bin/bash",
      timeout: Number(process.env.MISSION_CONTROL_TERMINAL_TIMEOUT_MS ?? 60_000),
      maxBuffer: Number(process.env.MISSION_CONTROL_TERMINAL_MAX_BUFFER ?? 1024 * 1024 * 4),
    });

    return Response.json({
      ok: true,
      command,
      cwd,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    });
  } catch (error: unknown) {
    const err = error as {
      code?: number | string;
      signal?: string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };

    return Response.json({
      ok: false,
      command,
      cwd,
      exitCode: err.code ?? null,
      signal: err.signal ?? null,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      error: err.message ?? "Command failed.",
      durationMs: Date.now() - startedAt,
    });
  }
}

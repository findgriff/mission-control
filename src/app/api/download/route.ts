import { spawn } from "node:child_process";
import path from "node:path";
import { stat } from "node:fs/promises";

const WORKSPACE = process.env.MISSION_CONTROL_WORKSPACE_ROOT ?? "/home/clawd/clawd";
const TAR_EXCLUDES = [
  "--exclude=.git",
  "--exclude=node_modules",
  "--exclude=.next",
  "--exclude=dist",
  "--exclude=build",
  "--exclude=.env",
  "--exclude=*.pem",
  "--exclude=*.key",
  "--exclude=*.sqlite",
  "--exclude=*.db",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("path") ?? "";

  if (!projectPath) {
    return new Response("Missing path", { status: 400 });
  }

  // Security: resolve and confirm path is inside the workspace
  const workspace = path.resolve(WORKSPACE);
  const resolved = path.resolve(projectPath);
  const relative = path.relative(workspace, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Confirm it exists and is a directory
  try {
    const s = await stat(resolved);
    if (!s.isDirectory()) return new Response("Not a directory", { status: 400 });
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const projectName = path.basename(resolved);

  const stream = new ReadableStream({
    start(controller) {
      // tar czf - streams a gzipped tarball to stdout
      const proc = spawn("tar", ["czf", "-", ...TAR_EXCLUDES, "."], { cwd: resolved });

      proc.stdout.on("data", (chunk: Buffer) => {
        try { controller.enqueue(new Uint8Array(chunk)); } catch { /* client disconnected */ }
      });

      proc.stdout.on("end", () => {
        try { controller.close(); } catch { /* already closed */ }
      });

      proc.on("error", (err) => {
        try { controller.error(err); } catch { /* already closed */ }
      });

      proc.stderr.on("data", () => {
        // suppress tar warnings
      });
    },
    cancel() {
      // Client disconnected mid-download — normal, nothing to clean up
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${projectName}.tar.gz"`,
      "Cache-Control": "no-store",
    },
  });
}

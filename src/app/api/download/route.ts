import { spawn } from "node:child_process";
import path from "node:path";
import { stat } from "node:fs/promises";

const WORKSPACE = process.env.MISSION_CONTROL_WORKSPACE_ROOT ?? "/home/clawd/clawd";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get("path") ?? "";

  if (!projectPath) {
    return new Response("Missing path", { status: 400 });
  }

  // Security: resolve and confirm path is inside the workspace
  const resolved = path.resolve(projectPath);
  if (!resolved.startsWith(path.resolve(WORKSPACE))) {
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
      // zip -r - . streams the zip to stdout
      const proc = spawn("zip", ["-r", "-", "."], { cwd: resolved });

      proc.stdout.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      proc.stdout.on("end", () => {
        controller.close();
      });

      proc.on("error", (err) => {
        controller.error(err);
      });

      proc.stderr.on("data", () => {
        // suppress zip warnings (e.g. symlinks)
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${projectName}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

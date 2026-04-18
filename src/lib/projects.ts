import { execFile } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

const exec = promisify(execFile);
const ROOT = process.env.MISSION_CONTROL_WORKSPACE_ROOT ?? "/home/clawd/clawd";
const SKIP = new Set([".git", ".next", ".openclaw", "node_modules", "memory", "canvas", "state"]);

type PkgJson = {
  name?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type OpenProject = {
  slug: string; name: string; relativePath: string; absolutePath: string;
  kind: string; summary: string; branch: string | null;
  changeSummary: string; lastUpdated: string;
  commands: string[]; keyFiles: string[];
};

export async function getOpenProjects(): Promise<OpenProject[]> {
  const candidates = await collectCandidates();
  const results = await Promise.all(candidates.map(inspectProject));
  return results
    .filter((p): p is OpenProject => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function collectCandidates() {
  const top = (await readdir(ROOT, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith("."))
    .map((e) => path.join(ROOT, e.name));

  const nested: string[] = [];
  try {
    const projectsRoot = path.join(ROOT, "projects");
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith("."))
        nested.push(path.join(projectsRoot, e.name));
    }
  } catch { /* no nested projects dir */ }

  return [...top, ...nested];
}

async function inspectProject(dir: string): Promise<OpenProject | null> {
  const [hasPkg, hasGit] = await Promise.all([
    exists(path.join(dir, "package.json")),
    exists(path.join(dir, ".git")),
  ]);
  if (!hasPkg && !hasGit) return null;

  const pkg = hasPkg ? await readPkg(path.join(dir, "package.json")) : null;
  const rel = path.relative(ROOT, dir) || path.basename(dir);
  const gitDir = hasGit ? dir : ROOT;
  const gitScope = hasGit ? null : rel;

  const [branch, changes, updated] = await Promise.all([
    gitBranch(gitDir),
    gitChanges(gitDir, gitScope),
    lastUpdated(dir),
  ]);

  const commands = Object.keys(pkg?.scripts ?? {}).slice(0, 4);
  const keyFiles = await getKeyFiles(dir, hasPkg, hasGit);
  const kind = inferKind(dir, pkg);
  const name = humanize(pkg?.name ?? path.basename(dir));
  const summary = pkg?.description?.trim() || `${kind} in ${rel}`;

  return {
    slug: rel.replace(/\//g, "-"),
    name, relativePath: rel, absolutePath: dir,
    kind, summary, branch,
    changeSummary: changes, lastUpdated: updated,
    commands, keyFiles,
  };
}

async function readPkg(p: string): Promise<PkgJson | null> {
  try { return JSON.parse(await readFile(p, "utf8")) as PkgJson; } catch { return null; }
}

function inferKind(dir: string, pkg: PkgJson | null): string {
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  if (deps.next) return "Next.js app";
  if (deps.react) return "React app";
  if (pkg?.scripts?.dev || pkg?.scripts?.start) return "Node app";
  if (path.basename(dir).includes("site")) return "Website";
  return "Project";
}

async function getKeyFiles(dir: string, hasPkg: boolean, hasGit: boolean) {
  const candidates = [
    hasPkg ? "package.json" : null, hasGit ? ".git" : null,
    "README.md", "src", "app", "public", "assets",
  ].filter(Boolean) as string[];
  const result: string[] = [];
  for (const c of candidates) {
    if (await exists(path.join(dir, c))) result.push(c);
  }
  return result;
}

async function lastUpdated(dir: string): Promise<string> {
  let mtime = 0;
  for (const c of ["package.json", "README.md", "src", "app", "public"]) {
    try { mtime = Math.max(mtime, (await stat(path.join(dir, c))).mtimeMs); } catch { /* skip */ }
  }
  if (!mtime) mtime = (await stat(dir)).mtimeMs;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(mtime));
}

async function gitBranch(dir: string): Promise<string | null> {
  try {
    const { stdout } = await exec("git", ["-C", dir, "branch", "--show-current"]);
    return stdout.trim() || null;
  } catch { return null; }
}

async function gitChanges(dir: string, scope: string | null): Promise<string> {
  try {
    const args = ["-C", dir, "status", "--short"];
    if (scope) args.push("--", scope);
    const { stdout } = await exec("git", args);
    const lines = stdout.split("\n").filter(Boolean);
    if (!lines.length) return "Clean";
    return `${lines.length} change${lines.length === 1 ? "" : "s"}`;
  } catch { return "Unknown"; }
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

function humanize(v: string): string {
  return v.replace(/^@[^/]+\//, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

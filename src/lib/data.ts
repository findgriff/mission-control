import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getOpenProjects } from "@/lib/projects";

const execFileAsync = promisify(execFile);

const OPENCLAW_HOME = process.env.OPENCLAW_HOME ?? "/home/clawd/.openclaw";
const TASKS_DB = process.env.OPENCLAW_TASKS_DB ?? path.join(OPENCLAW_HOME, "tasks/runs.sqlite");
const MEMORY_DB = process.env.OPENCLAW_MEMORY_DB ?? path.join(OPENCLAW_HOME, "memory/main.sqlite");
const AGENTS_DIR = path.join(OPENCLAW_HOME, "agents");
const CONFIG = process.env.OPENCLAW_CONFIG_FILE ?? path.join(OPENCLAW_HOME, "openclaw.json");
const CRON = process.env.OPENCLAW_CRON_FILE ?? path.join(OPENCLAW_HOME, "cron/jobs.json");

// ── Shared types ───────────────────────────────────────────────────────────────

export type McRecord = {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
};

export type McCollection = {
  source: string;
  items: McRecord[];
  error?: string;
};

// ── Tasks ──────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<McCollection> {
  try {
    const rows = await querySqlite(
      TASKS_DB,
      `SELECT task_id, runtime, task_kind, agent_id, run_id, label, task,
              status, delivery_status, created_at, started_at, ended_at,
              last_event_at, error, progress_summary, terminal_summary,
              terminal_outcome, parent_task_id, scope_kind
       FROM task_runs
       ORDER BY COALESCE(last_event_at, started_at, created_at) DESC
       LIMIT 200`
    );
    return {
      source: "task_runs",
      items: rows.map((r) => ({
        id: String(r.task_id),
        title: compact([r.label, r.task_kind, r.task, r.task_id]),
        description: shortText(r.task),
        taskId: r.task_id,
        runtime: r.runtime,
        taskKind: r.task_kind,
        agentId: r.agent_id,
        runId: r.run_id,
        label: r.label,
        task: r.task,
        status: r.status,
        deliveryStatus: r.delivery_status,
        createdAt: fmtMs(r.created_at),
        startedAt: fmtMs(r.started_at),
        endedAt: fmtMs(r.ended_at),
        lastEventAt: fmtMs(r.last_event_at),
        error: r.error,
        progressSummary: r.progress_summary,
        terminalSummary: r.terminal_summary,
        terminalOutcome: r.terminal_outcome,
        parentTaskId: r.parent_task_id,
        scopeKind: r.scope_kind,
      })),
    };
  } catch (e) {
    return errCollection("task_runs", e);
  }
}

// ── Agents ─────────────────────────────────────────────────────────────────────

type SessionEntry = {
  sessionId?: string;
  updatedAt?: number;
  status?: string;
  startedAt?: number;
  lastChannel?: string;
  chatType?: string;
  model?: string;
  modelProvider?: string;
  origin?: { provider?: string; surface?: string; chatType?: string };
};

type SessionsFile = Record<string, SessionEntry>;
type ClawConfig   = { agents?: { list?: Array<{ id?: string }> } };

export async function getAgents(): Promise<McCollection> {
  try {
    // Each agent stores its own sessions.json under agents/<id>/sessions/sessions.json.
    // Scan all agent directories and merge every sessions file into one view.
    const agentDirs = await readdir(AGENTS_DIR).catch(() => [] as string[]);

    const sessionFiles = await Promise.all(
      agentDirs.map(async (dir) => {
        const file = path.join(AGENTS_DIR, dir, "sessions", "sessions.json");
        try {
          return { agentDir: dir, data: await readJson<SessionsFile>(file) };
        } catch {
          return { agentDir: dir, data: {} as SessionsFile };
        }
      })
    );

    const config = await readJson<ClawConfig>(CONFIG).catch(() => ({} as ClawConfig));
    const grouped = new Map<string, McRecord & { _latestMs?: number }>();

    for (const { agentDir, data } of sessionFiles) {
      for (const [key, entry] of Object.entries(data)) {
        // Key format: "agent:<agentId>:<sessionId>" — use agentDir as the stable id
        const agentId = agentDir;
        const existing = grouped.get(agentId) ?? {
          id: agentId, title: agentId,
          sessionCount: 0, sessionKeys: [],
          channels: [], chatTypes: [], statuses: [], models: [],
        };

        (existing.sessionCount as number)++;
        pushUnique(existing.sessionKeys, key);
        pushUnique(existing.channels, entry.lastChannel ?? entry.origin?.provider);
        pushUnique(existing.chatTypes, entry.chatType ?? entry.origin?.chatType);
        pushUnique(existing.statuses, entry.status);
        pushUnique(existing.models, compact([entry.modelProvider, entry.model], "/"));

        if (typeof entry.updatedAt === "number" && entry.updatedAt > (existing._latestMs ?? 0)) {
          existing._latestMs = entry.updatedAt;
          existing.latestUpdatedAt = fmtMs(entry.updatedAt);
          existing.latestStatus = entry.status;
          existing.lastChannel = entry.lastChannel ?? entry.origin?.provider;
          existing.model = compact([entry.modelProvider, entry.model], "/");
        }
        grouped.set(agentId, existing);
      }
    }

    // Add any configured agents that have no sessions yet
    for (const a of config.agents?.list ?? []) {
      if (a.id && !grouped.has(a.id)) {
        grouped.set(a.id, { id: a.id, title: a.id, configured: true, sessionCount: 0 });
      }
    }

    const records = [...grouped.values()].map((record) => {
      delete record._latestMs;
      return record;
    });

    return {
      source: AGENTS_DIR,
      items: records.sort((a, b) => a.title.localeCompare(b.title)),
    };
  } catch (e) {
    return errCollection("agents/**/sessions.json", e);
  }
}

// ── Projects ───────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<McCollection> {
  try {
    const projects = await getOpenProjects();
    return {
      source: "workspace",
      items: projects.map((p) => ({
        id: p.slug,
        title: p.name,
        description: p.summary,
        ...p,
      })),
    };
  } catch (e) {
    return errCollection("workspace", e);
  }
}

// ── Calendar ───────────────────────────────────────────────────────────────────

type CronFile = {
  jobs?: Array<{
    id: string; name?: string; enabled?: boolean; agentId?: string;
    sessionTarget?: string; wakeMode?: string;
    createdAtMs?: number; updatedAtMs?: number;
    schedule?: { kind?: string; at?: string; expr?: string; everyMs?: number; tz?: string };
    payload?: { kind?: string; text?: string; message?: string };
    state?: { lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number };
  }>;
};

export async function getCalendar(): Promise<McCollection> {
  try {
    const cron = await readJson<CronFile>(CRON);
    return {
      source: "cron/jobs.json",
      items: (cron.jobs ?? []).map((j) => ({
        id: j.id,
        title: j.name || j.id,
        enabled: j.enabled,
        agentId: j.agentId,
        sessionTarget: j.sessionTarget,
        scheduleKind: j.schedule?.kind,
        at: j.schedule?.at,
        expr: j.schedule?.expr,
        everyMs: j.schedule?.everyMs,
        timezone: j.schedule?.tz,
        payloadKind: j.payload?.kind,
        payloadText: j.payload?.text ?? j.payload?.message,
        createdAt: fmtMs(j.createdAtMs),
        updatedAt: fmtMs(j.updatedAtMs),
        lastRunAt: fmtMs(j.state?.lastRunAtMs),
        lastStatus: j.state?.lastStatus,
        lastDurationMs: j.state?.lastDurationMs,
      })),
    };
  } catch (e) {
    return errCollection("cron/jobs.json", e);
  }
}

// ── Memory ─────────────────────────────────────────────────────────────────────

export async function getMemory(): Promise<McCollection> {
  try {
    const rows = await querySqlite(
      MEMORY_DB,
      `SELECT id, path, source, start_line, end_line, text, updated_at
       FROM chunks
       ORDER BY updated_at DESC
       LIMIT 100`
    );
    return {
      source: "memory/main.sqlite",
      items: rows.map((r) => ({
        id: String(r.id),
        title: String(r.path || r.source || r.id),
        description: shortText(r.text),
        path: r.path,
        source: r.source,
        startLine: r.start_line,
        endLine: r.end_line,
        text: r.text,
        updatedAt: fmtMs(r.updated_at),
      })),
    };
  } catch (e) {
    return errCollection("memory/main.sqlite", e);
  }
}

// ── Internals ──────────────────────────────────────────────────────────────────

async function querySqlite(db: string, sql: string): Promise<Array<Record<string, unknown>>> {
  const py = `import json,sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\nc.row_factory=sqlite3.Row\nprint(json.dumps([dict(r) for r in c.execute(sys.argv[2]).fetchall()]))`;
  const { stdout } = await execFileAsync("python3", ["-c", py, db, sql], {
    timeout: 8000,
    maxBuffer: 1024 * 1024 * 16,
  });
  return JSON.parse(stdout) as Array<Record<string, unknown>>;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function fmtMs(v: unknown): string | undefined {
  if (typeof v !== "number" || !isFinite(v) || v <= 0) return undefined;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(v));
}

function compact(vals: unknown[], sep = " · "): string {
  return vals.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean).join(sep).slice(0, 140);
}

function shortText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s ? s.slice(0, 240) : undefined;
}

function pushUnique(arr: unknown, val: unknown) {
  if (!Array.isArray(arr) || val == null || val === "") return;
  if (!arr.includes(val)) arr.push(val);
}

function errCollection(source: string, e: unknown): McCollection {
  const message = e instanceof Error ? e.message : String(e);
  if (/unable to open database file/i.test(message)) {
    return { source, items: [], error: `Unable to read ${source}. Check the configured path and file permissions.` };
  }
  if (/ENOENT|no such file or directory/i.test(message)) {
    return { source, items: [], error: `Unable to find ${source}. Check the configured path.` };
  }
  if (/permission denied|EACCES/i.test(message)) {
    return { source, items: [], error: `Unable to access ${source}. Check service account permissions.` };
  }
  return { source, items: [], error: `Unable to load ${source}. Check server logs for details.` };
}

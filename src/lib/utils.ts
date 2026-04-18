export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function statusColor(status: string | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "running":
    case "active":
    case "live":
    case "open":
    case "enabled":
      return "cyan";
    case "done":
    case "success":
    case "completed":
    case "healthy":
      return "green";
    case "failed":
    case "error":
    case "critical":
    case "blocked":
      return "red";
    case "pending":
    case "queued":
    case "waiting":
    case "in-progress":
      return "amber";
    case "cancelled":
    case "idle":
    case "disabled":
    case "paused":
    default:
      return "muted";
  }
}

export function statusClass(status: string | undefined): string {
  const c = statusColor(status);
  return {
    cyan:  "text-[#00E6FF] border-[#00E6FF33] bg-[#00E6FF11]",
    green: "text-[#4CAF50] border-[#4CAF5033] bg-[#4CAF5011]",
    red:   "text-[#FF3B1F] border-[#FF3B1F33] bg-[#FF3B1F11]",
    amber: "text-[#FFB800] border-[#FFB80033] bg-[#FFB80011]",
    muted: "text-[#888888] border-[#88888833] bg-[#88888811]",
  }[c] ?? "text-[#888888] border-[#88888833] bg-[#88888811]";
}

export function dotClass(status: string | undefined): string {
  const c = statusColor(status);
  return {
    cyan:  "bg-[#00E6FF] shadow-[0_0_6px_#00E6FF88]",
    green: "bg-[#4CAF50] shadow-[0_0_6px_#4CAF5088]",
    red:   "bg-[#FF3B1F] shadow-[0_0_6px_#FF3B1F88]",
    amber: "bg-[#FFB800] shadow-[0_0_6px_#FFB80088]",
    muted: "bg-[#555555]",
  }[c] ?? "bg-[#555555]";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (isNaN(diff)) return dateStr;
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const day = Math.floor(h / 24);
    if (day < 30) return `${day}d ago`;
    return `${Math.floor(day / 30)}mo ago`;
  } catch { return dateStr ?? ""; }
}

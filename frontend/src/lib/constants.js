// Restrained enterprise badge system: mostly neutral, tiny semantic accents only.
export const STATUS_META = {
  open: { label: "Open", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  in_progress: { label: "In Progress", cls: "bg-slate-50 text-slate-700 border-slate-200" },
  confirmation_pending: { label: "Confirmation Pending", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  resolved: { label: "Resolved", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  reopened: { label: "Reopened", cls: "bg-red-50 text-red-700 border-red-200 font-semibold" },
};

export const LANE_META = {
  RESOLVE: { label: "Resolve", cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-teal-500" },
  ACTION: { label: "Action", cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-brand-700" },
  REVIEW: { label: "Review", cls: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-amber-500" },
};

export const PRIORITY_META = {
  P0: { label: "P0", cls: "bg-red-50 text-red-700 border-red-200 font-bold" },
  P1: { label: "P1", cls: "bg-slate-100 text-slate-700 border-slate-200 font-semibold" },
  P2: { label: "P2", cls: "bg-slate-50 text-slate-600 border-slate-200" },
  P3: { label: "P3", cls: "bg-slate-50 text-slate-400 border-slate-200" },
};

export const STATUSES = Object.keys(STATUS_META);
export const LANES = Object.keys(LANE_META);
export const PRIORITIES = Object.keys(PRIORITY_META);

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// One consistent, analytical score treatment: neutral pill, severity via text color only.
export function attentionCls(score) {
  if (score >= 80) return "bg-slate-50 text-red-700 border border-slate-200";
  if (score >= 50) return "bg-slate-50 text-amber-700 border border-slate-200";
  return "bg-slate-50 text-slate-600 border border-slate-200";
}

// Thin left status edge for tables/cards — data-driven, no full-surface tint.
export function severityEdge(i) {
  if (i.is_emergency || i.failed_resolution) return "border-l-2 border-l-red-500";
  if (i.status === "reopened") return "border-l-2 border-l-amber-500";
  return "border-l-2 border-l-transparent";
}

export function fmtDuration(seconds) {
  if (!seconds || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export const STATUS_META = {
  open: { label: "Open", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  confirmation_pending: { label: "Confirmation Pending", cls: "bg-violet-100 text-violet-800 border-violet-200" },
  resolved: { label: "Resolved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  reopened: { label: "Reopened", cls: "bg-orange-100 text-orange-800 border-orange-200" },
};

export const LANE_META = {
  RESOLVE: { label: "Resolve", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ACTION: { label: "Action", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  REVIEW: { label: "Review", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const PRIORITY_META = {
  P0: { label: "P0", cls: "bg-red-100 text-red-800 border-red-200" },
  P1: { label: "P1", cls: "bg-orange-100 text-orange-800 border-orange-200" },
  P2: { label: "P2", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  P3: { label: "P3", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const STATUSES = Object.keys(STATUS_META);
export const LANES = Object.keys(LANE_META);
export const PRIORITIES = Object.keys(PRIORITY_META);

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function attentionCls(score) {
  if (score >= 80) return "bg-red-100 text-red-700 border border-red-200";
  if (score >= 50) return "bg-amber-100 text-amber-700 border border-amber-200";
  if (score >= 25) return "bg-blue-100 text-blue-700 border border-blue-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

export function fmtDuration(seconds) {
  if (!seconds || seconds < 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

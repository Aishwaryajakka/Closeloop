import React, { useEffect, useState, useMemo } from "react";
import { Search, Inbox, RefreshCw, ShieldAlert, Layers } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { STATUS_META, LANE_META, PRIORITY_META, fmtDate, attentionCls, fmtDuration } from "@/lib/constants";
import IssueDetailSheet from "@/components/IssueDetailSheet";
import StaffLayout from "@/components/StaffLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function Pill({ meta, testid }) {
  if (!meta) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <span data-testid={testid} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, testid, accent }) {
  return (
    <div data-testid={testid} className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-extrabold tracking-tight ${accent || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

const TABS = ["Overview", "REVIEW", "ACTION", "AI Resolved", "Failed Resolutions", "All Issues"];

function rank(i) {
  let r = 0;
  if (i.is_emergency) r += 100000;
  if (i.failed_resolution || (i.resolution_attempts || 0) > 0) r += 20000;
  if (i.status === "reopened") r += 10000;
  r += (i.human_attention_score || 0);
  return r;
}

export default function StaffDashboard() {
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Overview");
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [iss, st, inc] = await Promise.all([
        api.get("/issues"), api.get("/dashboard"), api.get("/incidents/detect"),
      ]);
      setIssues(iss.data);
      setStats(st.data);
      setIncidents(inc.data.incidents || []);
    } catch (e) {
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const tabFiltered = useMemo(() => {
    let list = issues;
    if (tab === "REVIEW") list = issues.filter((i) => i.lane === "REVIEW");
    else if (tab === "ACTION") list = issues.filter((i) => i.lane === "ACTION");
    else if (tab === "AI Resolved") list = issues.filter((i) => i.lane === "RESOLVE");
    else if (tab === "Failed Resolutions") list = issues.filter((i) => i.failed_resolution || (i.resolution_attempts || 0) > 0 || i.status === "reopened");
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((i) =>
        (i.unit || "").toLowerCase().includes(q) || (i.resident_name || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => rank(b) - rank(a));
  }, [issues, tab, query]);

  const needsAttention = useMemo(() => [...issues].sort((a, b) => rank(b) - rank(a)).slice(0, 6), [issues]);

  const openIssue = (id) => { setSelectedId(id); setSheetOpen(true); };

  const headerAction = (
    <button data-testid="refresh-btn" onClick={load}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200">
      <RefreshCw className="h-4 w-4" /> Refresh
    </button>
  );

  return (
    <StaffLayout title="What needs your attention?" headerAction={headerAction}>
      <div className="p-6 md:p-8 space-y-6">
        {/* Shared incident */}
        {incidents.length > 0 && incidents.map((inc, idx) => (
          <div key={idx} data-testid="shared-incident-banner" className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4 flex items-start gap-3">
            <Layers className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-purple-800 uppercase tracking-wide">Possible Shared Incident — {inc.category}</p>
              <p className="text-sm text-purple-700 mt-0.5">{inc.count} related reports from {inc.resident_count} residents (units {inc.units.slice(0, 6).join(", ")}) within a {inc.window_minutes}-minute window.</p>
            </div>
          </div>
        ))}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard testid="stat-interactions-today" label="Interactions Today" value={stats?.resident_interactions_today ?? "—"} />
          <StatCard testid="stat-handled" label="Handled Automatically" value={stats?.handled_automatically ?? "—"} accent="text-emerald-600" />
          <StatCard testid="stat-actions" label="Actions Created" value={stats?.actions_created ?? "—"} accent="text-blue-600" />
          <StatCard testid="stat-reviews" label="Human Reviews" value={stats?.human_reviews ?? "—"} accent="text-amber-600" />
          <StatCard testid="stat-failed" label="Failed Resolutions" value={stats?.failed_resolutions ?? "—"} accent="text-orange-600" />
          <StatCard testid="stat-confirmation" label="Confirmation Pending" value={stats?.confirmation_pending ?? "—"} accent="text-violet-600" />
          <StatCard testid="stat-confirmed-rate" label="Confirmed Resolution" value={stats ? `${stats.resident_confirmed_rate}%` : "—"} accent="text-emerald-600" />
          <StatCard testid="stat-median-frt" label="Median First Response" value={stats ? fmtDuration(stats.median_first_response_seconds) : "—"} />
        </div>

        {/* Needs Your Attention */}
        {tab === "Overview" && (
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-slate-900 mb-3">Needs Your Attention</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="needs-attention">
              {needsAttention.map((i) => (
                <button key={i.id} data-testid={`attention-card-${i.id}`} onClick={() => openIssue(i.id)}
                  className={`text-left rounded-xl border p-4 transition-colors duration-200 ${i.is_emergency ? "border-red-300 bg-red-50 hover:bg-red-100" : i.status === "reopened" ? "border-orange-300 bg-orange-50 hover:bg-orange-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center font-heading font-extrabold text-sm ${attentionCls(i.human_attention_score || 0)}`}>{i.human_attention_score ?? 0}</span>
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          {i.is_emergency && <ShieldAlert className="h-3.5 w-3.5 text-red-600" />}Unit {i.unit}
                          {i.status === "reopened" && <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-100 border border-orange-200 rounded-full px-1.5">Reopened</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{i.resident_name} · {i.category || "—"}</p>
                      </div>
                    </div>
                    <Pill meta={LANE_META[i.lane]} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700 line-clamp-2">{i.description}</p>
                  <p className="mt-1.5 text-xs text-slate-400 truncate">{(i.attention_reasons || [])[0] || "Routine"}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap border-b border-slate-200 pb-3">
          {TABS.map((t) => (
            <button key={t} data-testid={`tab-${t.replace(/\s+/g, "-").toLowerCase()}`} onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-200 ${tab === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input data-testid="dashboard-search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search unit, resident, category…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200">
                  {["Score", "Unit", "Resident", "Category", "Priority", "Lane", "Status", "Team", "Created"].map((h) => (
                    <TableHead key={h} className="text-xs font-bold uppercase tracking-widest text-slate-400">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-16 text-slate-400">Loading…</TableCell></TableRow>
                ) : tabFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-16 text-slate-400"><Inbox className="h-8 w-8 mx-auto mb-3 text-slate-300" />No issues here.</TableCell></TableRow>
                ) : (
                  tabFiltered.map((i) => (
                    <TableRow key={i.id} data-testid={`issue-row-${i.id}`} onClick={() => openIssue(i.id)}
                      className={`cursor-pointer border-slate-100 transition-colors duration-200 ${i.is_emergency ? "bg-red-50 hover:bg-red-100" : i.status === "reopened" ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-slate-50"}`}>
                      <TableCell><span data-testid={`row-score-${i.id}`} className={`inline-flex items-center justify-center h-7 w-9 rounded-md font-heading font-bold text-xs ${attentionCls(i.human_attention_score || 0)}`}>{i.human_attention_score ?? 0}</span></TableCell>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {i.is_emergency && <ShieldAlert data-testid={`emergency-flag-${i.id}`} className="h-4 w-4 text-red-600" />}
                          {i.unit}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700">{i.resident_name}</TableCell>
                      <TableCell className="text-slate-600 capitalize">{i.category || "—"}</TableCell>
                      <TableCell><Pill meta={PRIORITY_META[i.priority]} testid={`row-priority-${i.id}`} /></TableCell>
                      <TableCell><Pill meta={LANE_META[i.lane]} testid={`row-lane-${i.id}`} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Pill meta={STATUS_META[i.status]} testid={`row-status-${i.id}`} />
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{i.assigned_team || <span className="text-slate-400">—</span>}</TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">{fmtDate(i.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <IssueDetailSheet issueId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} onUpdated={load} />
    </StaffLayout>
  );
}

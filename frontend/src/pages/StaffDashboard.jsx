import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Inbox, RefreshCw, ShieldAlert, Layers, Info, ArrowRight, RotateCcw, Camera, MessageSquare, Sparkles, Wrench, Scale, Clock, ShieldCheck, Play } from "lucide-react";
import html2canvas from "html2canvas";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { STATUS_META, LANE_META, PRIORITY_META, fmtDate, attentionCls, fmtDuration } from "@/lib/constants";
import IssueDetailSheet from "@/components/IssueDetailSheet";
import StaffLayout from "@/components/StaffLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

function Pill({ meta, testid }) {
  if (!meta) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <span data-testid={testid} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.dot && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}
      {meta.label}
    </span>
  );
}

function StatCard({ label, value, testid, accent }) {
  return (
    <div data-testid={testid} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-extrabold tracking-tight tabular-nums ${accent || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

// Smoothly tweens to a new value so metrics "tick up" as demo data changes.
function AnimatedNumber({ value, suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(value ?? 0);
  const prev = useRef(value ?? 0);
  useEffect(() => {
    const start = prev.current;
    const end = value ?? 0;
    if (start === end) { setDisplay(end); return; }
    const dur = 700;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{Number(display).toFixed(decimals)}{suffix}</>;
}

function KpiCard({ testid, label, Icon, accent, children, footer, FootIcon }) {
  return (
    <div data-testid={testid} className="relative bg-white rounded-xl border border-slate-200 p-5 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)] overflow-hidden">
      <span className={`absolute left-0 inset-y-0 w-1 ${accent.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-snug max-w-[70%]">{label}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${accent.iconBg}`}><Icon className={`h-4 w-4 ${accent.iconText}`} strokeWidth={2} /></span>
      </div>
      <p className="mt-3 font-heading text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">{children}</p>
      {footer && <p className={`mt-2 text-sm font-semibold inline-flex items-center gap-1 ${accent.footText}`}>{FootIcon && <FootIcon className="h-3.5 w-3.5" />}{footer}</p>}
    </div>
  );
}

function ImpactStrip({ impact }) {
  const navigate = useNavigate();
  const stripRef = useRef(null);
  const [snapping, setSnapping] = useState(false);
  if (!impact) return null;
  const timeSavedTip = `Assumes ${impact.assumed_minutes_per_interaction} min of staff time per interaction handled without human review.`;

  const snapshot = async () => {
    if (!stripRef.current) return;
    setSnapping(true);
    try {
      const canvas = await html2canvas(stripRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `closeloop-impact-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Impact snapshot downloaded.");
    } catch (e) {
      toast.error("Could not export snapshot.");
    } finally {
      setSnapping(false);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div ref={stripRef} data-testid="impact-strip">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Business Impact</p>
          <span data-testid="impact-demo-badge" className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
            Demo Environment
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-amber-500 hover:text-amber-700 transition-colors" aria-label="About demo metrics">
                  <Info className="h-2.5 w-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] bg-slate-900 text-slate-100 normal-case tracking-normal font-medium">
                Metrics shown here are generated from the CloseLoop demo dataset. Production metrics calculate automatically from actual property activity.
              </TooltipContent>
            </Tooltip>
          </span>
          <div className="ml-auto flex items-center gap-3">
            <button data-testid="impact-snapshot-btn" onClick={snapshot} disabled={snapping}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors">
              <Camera className="h-3.5 w-3.5" /> {snapping ? "Saving…" : "Snapshot"}
            </button>
            <button data-testid="view-impact-link" onClick={() => navigate("/staff/insights")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors">
              View Impact <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="impact-kpis">
          <KpiCard testid="impact-automation" label="Handled without management" Icon={Sparkles} footer="Automated resolution" FootIcon={Sparkles}
            accent={{ bar: "bg-teal-500", iconBg: "bg-teal-50", iconText: "text-teal-600", footText: "text-teal-600" }}>
            <AnimatedNumber value={impact.automation_rate} suffix="%" />
          </KpiCard>
          <KpiCard testid="impact-time-saved" label="Estimated time saved" Icon={Clock} footer="Daily average" FootIcon={ArrowRight}
            accent={{ bar: "bg-indigo-500", iconBg: "bg-indigo-50", iconText: "text-indigo-600", footText: "text-indigo-600" }}>
            <AnimatedNumber value={impact.hours_saved} suffix="h" decimals={1} />
          </KpiCard>
          <KpiCard testid="impact-confirmed" label="Resident-confirmed resolution" Icon={ShieldCheck} footer="Consistent" FootIcon={ShieldCheck}
            accent={{ bar: "bg-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-600", footText: "text-amber-600" }}>
            <AnimatedNumber value={impact.resident_confirmed_rate} suffix="%" />
          </KpiCard>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5 text-sm">
          <span data-testid="impact-repeat" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600"><RotateCcw className="h-3.5 w-3.5 text-slate-400" /> Repeat issues detected: <b className="text-slate-900 tabular-nums"><AnimatedNumber value={impact.repeat_complaints} /></b></span>
          <span data-testid="impact-failed" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600"><ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Failed resolutions surfaced: <b className="text-red-700 tabular-nums"><AnimatedNumber value={impact.failed_resolutions} /></b></span>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Metric({ Icon, value, label, accent }) {
  return (
    <div className="flex items-center gap-2.5 px-4 first:pl-0">
      <Icon className={`h-[18px] w-[18px] shrink-0 ${accent || "text-slate-400"}`} strokeWidth={1.9} />
      <div>
        <p className="font-heading text-lg font-extrabold tracking-tight text-slate-900 leading-none tabular-nums">{value ?? "—"}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function MetricsRow({ stats }) {
  if (!stats) return null;
  return (
    <div data-testid="metrics-row" className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 flex flex-wrap items-center gap-y-3 divide-x divide-slate-200">
      <Metric Icon={MessageSquare} value={stats.resident_interactions_today} label="Interactions" />
      <Metric Icon={Sparkles} value={stats.handled_automatically} label="AI Resolved" accent="text-teal-600" />
      <Metric Icon={Wrench} value={stats.actions_created} label="Actions" accent="text-brand-700" />
      <Metric Icon={Scale} value={stats.human_reviews} label="Reviews" accent="text-slate-500" />
      <Metric Icon={RotateCcw} value={stats.failed_resolutions} label="Failed" accent="text-red-600" />
      <Metric Icon={Clock} value={fmtDuration(stats.median_first_response_seconds)} label="Median Response" />
    </div>
  );
}

function rank(i) {
  let r = 0;
  if (i.is_emergency) r += 100000;
  if (i.failed_resolution || (i.resolution_attempts || 0) > 0) r += 20000;
  if (i.status === "reopened") r += 10000;
  r += (i.human_attention_score || 0);
  return r;
}

// Semantic left-accent so P0 / failed / reopened stand out without over-coloring.
function cardAccent(i) {
  if (i.is_emergency || i.failed_resolution) return "border-l-2 border-l-red-500 bg-white hover:bg-slate-50";
  if (i.status === "reopened") return "border-l-2 border-l-amber-500 bg-white hover:bg-slate-50";
  return "border-l-2 border-l-transparent bg-white hover:bg-slate-50";
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [impact, setImpact] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const firstName = (user?.name || "").split(" ")[0] || "there";
  const view = searchParams.get("view") || "";
  const VIEW_TO_TAB = { review: "REVIEW", action: "ACTION", resolved: "AI Resolved", failed: "Failed Resolutions", all: "All Issues", needs: "Needs" };
  const tab = VIEW_TO_TAB[view] || "Overview";
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [iss, st, inc, imp] = await Promise.all([
        api.get("/issues"), api.get("/dashboard"), api.get("/incidents/detect"), api.get("/impact"),
      ]);
      setIssues(iss.data);
      setStats(st.data);
      setIncidents(inc.data.incidents || []);
      setImpact(imp.data);
    } catch (e) {
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Sync the table search box with the global top-bar search (?q=).
  useEffect(() => { setQuery(searchParams.get("q") || ""); }, [searchParams]);

  // Live Impact refresh: poll while on Overview so numbers tick up as demo activity arrives.
  useEffect(() => {
    if (tab !== "Overview") return;
    const id = setInterval(async () => {
      try { const r = await api.get("/impact"); setImpact(r.data); } catch (e) {}
    }, 4000);
    return () => clearInterval(id);
  }, [tab]);

  const resetDemo = async () => {
    setResetting(true);
    try {
      await api.post("/demo/reset");
      toast.success("Demo data reset to a clean state.");
      await load();
    } catch (e) {
      toast.error("Reset failed.");
    } finally {
      setResetting(false);
    }
  };

  const tabFiltered = useMemo(() => {
    let list = issues;
    if (tab === "REVIEW") list = issues.filter((i) => i.lane === "REVIEW");
    else if (tab === "ACTION") list = issues.filter((i) => i.lane === "ACTION");
    else if (tab === "AI Resolved") list = issues.filter((i) => i.lane === "RESOLVE");
    else if (tab === "Failed Resolutions") list = issues.filter((i) => i.failed_resolution || (i.resolution_attempts || 0) > 0 || i.status === "reopened");
    else if (tab === "Needs") list = issues.filter((i) => i.is_emergency || i.failed_resolution || (i.resolution_attempts || 0) > 0 || i.status === "reopened" || i.lane === "REVIEW");
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
    <div className="flex items-center gap-2">
      <button data-testid="reset-demo-btn" onClick={resetDemo} disabled={resetting}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 transition-colors duration-200">
        <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} /> {resetting ? "Resetting…" : "Reset Demo Data"}
      </button>
      <a href="/staff/demo" data-testid="run-demo-btn"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white px-3.5 py-2 text-sm font-semibold transition-colors duration-200">
        <Play className="h-4 w-4" /> Run Demo
      </a>
      <button data-testid="refresh-btn" onClick={load}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200">
        <RefreshCw className="h-4 w-4" /> Refresh
      </button>
    </div>
  );

  return (
    <StaffLayout title={tab === "Overview" ? `Good morning, ${firstName}` : ({ REVIEW: "Review", ACTION: "Action", "AI Resolved": "AI Resolved", "Failed Resolutions": "Failed Resolutions", "All Issues": "All Issues", Needs: "Needs Attention" }[tab] || tab)} headerAction={headerAction}>
      <div className="p-6 md:p-8 space-y-6">
        {tab === "Overview" && <p className="text-slate-500 -mt-2">Here's what's happening across the property today.</p>}
        {/* Shared incident */}
        {tab === "Overview" && incidents.length > 0 && incidents.map((inc, idx) => (
          <div key={idx} data-testid="shared-incident-banner" className="rounded-xl border-l-2 border-l-brand-700 border border-slate-200 bg-brand-50 p-4 flex items-start gap-3">
            <Layers className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Possible Shared Incident — {inc.category}</p>
              <p className="text-sm text-slate-600 mt-0.5">{inc.count} related reports from {inc.resident_count} residents (units {inc.units.slice(0, 6).join(", ")}) within a {inc.window_minutes}-minute window.</p>
            </div>
          </div>
        ))}

        {/* Business Impact strip (Overview only) */}
        {tab === "Overview" && <ImpactStrip impact={impact} />}

        {/* Compact operational metrics (Overview only) */}
        {tab === "Overview" && <MetricsRow stats={stats} />}

        {/* Needs Your Attention */}
        {tab === "Overview" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-bold tracking-tight text-slate-900">Needs Your Attention</h2>
              <button onClick={() => navigate("/staff?view=needs")} className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">View all <ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="needs-attention">
              {needsAttention.map((i) => (
                <button key={i.id} data-testid={`attention-card-${i.id}`} onClick={() => openIssue(i.id)}
                  className={`text-left rounded-xl border border-slate-200 p-4 transition-colors duration-200 ${cardAccent(i)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center font-heading font-extrabold text-sm ${attentionCls(i.human_attention_score || 0)}`}>{i.human_attention_score ?? 0}</span>
                      <div className="min-w-0">
                        <p className="font-mono font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          {i.is_emergency && <ShieldAlert className="h-3.5 w-3.5 text-red-600" />}Unit {i.unit}
                          {i.status === "reopened" && <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-1.5">Reopened</span>}
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
        {tab !== "Overview" && (<>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input data-testid="dashboard-search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search unit, resident, category…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-1" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                  <TableRow><TableCell colSpan={9} className="text-center py-16 text-slate-400"><Inbox className="h-8 w-8 mx-auto mb-3 text-slate-300" /><p className="font-heading font-semibold text-slate-500">You're all caught up</p><p className="text-sm">Nothing in this queue right now.</p></TableCell></TableRow>
                ) : (
                  tabFiltered.map((i) => (
                    <TableRow key={i.id} data-testid={`issue-row-${i.id}`} onClick={() => openIssue(i.id)}
                      className={`cursor-pointer border-slate-100 transition-colors duration-150 ${i.is_emergency || i.failed_resolution ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-slate-50"}`}>
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
        </>)}
      </div>

      <IssueDetailSheet issueId={selectedId} open={sheetOpen} onOpenChange={setSheetOpen} onUpdated={load} />
    </StaffLayout>
  );
}

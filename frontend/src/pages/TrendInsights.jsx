import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import StaffLayout from "@/components/StaffLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { fmtDate } from "@/lib/constants";
import { RotateCcw, XCircle, Layers, MapPin, Clock, Repeat, Info, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const RANGES = [{ k: "7d", d: 7, l: "7 Days" }, { k: "30d", d: 30, l: "30 Days" }, { k: "90d", d: 90, l: "90 Days" }, { k: "all", d: null, l: "All Time" }];
const C = { brand: "#1e3a8a", amber: "#d97706", red: "#dc2626", slate: "#94a3b8" };

const isRepeat = (i) => i.failed_resolution || (i.resolution_attempts || 0) > 0 || i.status === "reopened";
const dayKey = (iso) => (iso || "").slice(0, 10);

function Panel({ title, Icon, children, testid, action }) {
  return (
    <div data-testid={testid} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-[18px] w-[18px] text-slate-400" strokeWidth={1.9} />}
          <h2 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-widest">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function HBar({ label, value, sub, max, onClick, accent = "bg-brand-700" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <button onClick={onClick} disabled={!onClick} className={`w-full text-left group ${onClick ? "cursor-pointer" : "cursor-default"}`}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-semibold text-slate-800 capitalize group-hover:text-brand-700 transition-colors">{label}</span>
        <span className="text-slate-500 text-xs">{sub}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${accent} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

export default function TrendInsights() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState(null);
  const [range, setRange] = useState("all");
  const [series, setSeries] = useState({ all: true, repeat: true, failed: true, reviews: false });

  useEffect(() => {
    api.get("/issues").then((r) => setIssues(r.data || [])).catch(() => toast.error("Failed to load analytics"));
  }, []);

  const filtered = useMemo(() => {
    if (!issues) return [];
    const days = RANGES.find((r) => r.k === range)?.d;
    if (!days) return issues;
    const cutoff = Date.now() - days * 864e5;
    return issues.filter((i) => new Date(i.created_at).getTime() >= cutoff);
  }, [issues, range]);

  const kpi = useMemo(() => {
    if (!filtered.length) return null;
    const repeats = filtered.filter(isRepeat);
    const failed = filtered.filter((i) => i.failed_resolution);
    const withAttempts = filtered.filter((i) => (i.resolution_attempts || 0) > 0);
    const avgAttempts = withAttempts.length ? (withAttempts.reduce((a, i) => a + i.resolution_attempts, 0) / withAttempts.length) : 0;
    const catCount = {}, unitCount = {};
    filtered.forEach((i) => { if (i.category) catCount[i.category] = (catCount[i.category] || 0) + 1; if (i.unit) unitCount[i.unit] = (unitCount[i.unit] || 0) + 1; });
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    const topUnit = Object.entries(unitCount).sort((a, b) => b[1] - a[1])[0];
    const durs = filtered.filter((i) => i.resolved_at && i.created_at).map((i) => (new Date(i.resolved_at) - new Date(i.created_at)) / 36e5).filter((h) => h >= 0).sort((a, b) => a - b);
    const medHours = durs.length ? durs[Math.floor(durs.length / 2)] : null;
    const fmtDur = (h) => h == null ? "—" : h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;
    return {
      repeats: repeats.length, failed: failed.length, avgAttempts: avgAttempts ? avgAttempts.toFixed(1) : "—",
      topCat: topCat ? `${topCat[0]}` : "—", topUnit: topUnit ? `Unit ${topUnit[0]}` : "—", medRes: fmtDur(medHours),
    };
  }, [filtered]);

  const trend = useMemo(() => {
    const m = {};
    filtered.forEach((i) => {
      const k = dayKey(i.created_at); if (!k) return;
      m[k] = m[k] || { day: k, all: 0, repeat: 0, failed: 0, reviews: 0 };
      m[k].all++; if (isRepeat(i)) m[k].repeat++; if (i.failed_resolution) m[k].failed++; if (i.lane === "REVIEW") m[k].reviews++;
    });
    return Object.values(m).sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({ ...d, label: d.day.slice(5) }));
  }, [filtered]);

  const categories = useMemo(() => {
    const m = {};
    filtered.forEach((i) => {
      const c = i.category || "other"; m[c] = m[c] || { name: c, total: 0, repeat: 0, failed: 0, review: 0 };
      m[c].total++; if (isRepeat(i)) m[c].repeat++; if (i.failed_resolution) m[c].failed++; if (i.lane === "REVIEW") m[c].review++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const hotspots = useMemo(() => {
    const m = {};
    filtered.forEach((i) => {
      const u = i.unit; if (!u) return;
      m[u] = m[u] || { unit: u, total: 0, repeat: 0, failed: 0, cats: {}, last: "" };
      m[u].total++; if (isRepeat(i)) m[u].repeat++; if (i.failed_resolution) m[u].failed++;
      if (i.category) m[u].cats[i.category] = (m[u].cats[i.category] || 0) + 1;
      if ((i.created_at || "") > m[u].last) m[u].last = i.created_at;
    });
    return Object.values(m).map((u) => ({ ...u, top: Object.entries(u.cats).sort((a, b) => b[1] - a[1])[0]?.[0] || "—" }))
      .sort((a, b) => (b.repeat + b.failed) - (a.repeat + a.failed) || b.total - a.total).slice(0, 8);
  }, [filtered]);

  const quality = useMemo(() => {
    const resolved = filtered.filter((i) => i.status === "resolved");
    const confirmed = resolved.filter((i) => i.resident_confirmed).length;
    const firstAttempt = resolved.filter((i) => (i.resolution_attempts || 0) === 0).length;
    const multi = resolved.filter((i) => (i.resolution_attempts || 0) > 0).length;
    const reopened = filtered.filter((i) => i.status === "reopened").length;
    const pending = filtered.filter((i) => i.status === "confirmation_pending").length;
    return {
      confirmedRate: resolved.length ? Math.round(100 * confirmed / resolved.length) : 0,
      firstRate: resolved.length ? Math.round(100 * firstAttempt / resolved.length) : 0,
      reopened, pending,
      comp: [
        { label: "Resolved first attempt", v: firstAttempt, accent: "bg-teal-500" },
        { label: "Resolved after multiple attempts", v: multi, accent: "bg-amber-500" },
        { label: "Reopened", v: reopened, accent: "bg-red-500" },
        { label: "Still pending", v: pending, accent: "bg-slate-400" },
      ],
    };
  }, [filtered]);

  const attention = useMemo(() => {
    const m = {};
    filtered.forEach((i) => (i.attention_reasons || []).forEach((r) => { if (r) m[r] = (m[r] || 0) + 1; }));
    return Object.entries(m).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 7);
  }, [filtered]);

  const repeatFailed = useMemo(() => filtered.filter(isRepeat).sort((a, b) => (b.human_attention_score || 0) - (a.human_attention_score || 0)), [filtered]);

  if (!issues) return <StaffLayout title="Operations Intelligence"><div className="p-8 text-slate-400">Loading analytics…</div></StaffLayout>;

  const maxCat = Math.max(1, ...categories.map((c) => c.total));
  const maxAtt = Math.max(1, ...attention.map((a) => a.count));
  const maxComp = Math.max(1, ...quality.comp.map((c) => c.v));
  const empty = filtered.length === 0;

  return (
    <StaffLayout title="Operations Intelligence">
      <div className="p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-500 max-w-2xl">See where resident issues are concentrating, which problems are recurring, and where resolutions are failing.</p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {RANGES.map((r) => (
                <button key={r.k} data-testid={`range-${r.k}`} onClick={() => setRange(r.k)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${range === r.k ? "bg-brand-700 text-white" : "text-slate-500 hover:text-slate-900"}`}>{r.l}</button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-1">Demo Environment</span>
          </div>
        </div>
        <p className="-mt-2 text-xs text-slate-400 flex items-center gap-1"><Info className="h-3 w-3" /> Analytics are calculated from the seeded CloseLoop demo dataset.</p>

        {empty ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400">Not enough data in this period. Try a wider time range.</div>
        ) : (
        <>
          {/* KPI strip */}
          <div data-testid="kpi-strip" className="rounded-xl border border-slate-200 bg-white px-5 py-4 grid grid-cols-2 md:grid-cols-6 gap-y-4 divide-x-0 md:divide-x divide-slate-200">
            {[
              { v: kpi.repeats, l: "Repeat Issues" }, { v: kpi.failed, l: "Failed Resolutions" }, { v: kpi.avgAttempts, l: "Avg Resolution Attempts" },
              { v: kpi.topCat, l: "Most Affected Category", cap: true }, { v: kpi.topUnit, l: "Most Affected Unit" }, { v: kpi.medRes, l: "Median Time to Resolution" },
            ].map((m, idx) => (
              <div key={idx} className="md:px-4 md:first:pl-0">
                <p className={`font-heading text-xl font-extrabold tracking-tight text-slate-900 tabular-nums ${m.cap ? "capitalize" : ""}`}>{m.v}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{m.l}</p>
              </div>
            ))}
          </div>

          {/* Issue trend */}
          <Panel title="Issue Trend Over Time" Icon={Repeat} testid="trend-panel"
            action={
              <div className="flex gap-1.5">
                {[["all", "All", C.brand], ["repeat", "Repeat", C.amber], ["failed", "Failed", C.red], ["reviews", "Reviews", C.slate]].map(([k, l, col]) => (
                  <button key={k} onClick={() => setSeries((s) => ({ ...s, [k]: !s[k] }))}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${series[k] ? "border-slate-300 text-slate-800 bg-slate-50" : "border-slate-200 text-slate-400"}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: series[k] ? col : "#cbd5e1" }} />{l}
                  </button>
                ))}
              </div>
            }>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ left: 0, right: 8, top: 6 }}>
                  <defs>
                    <linearGradient id="gAll" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.brand} stopOpacity={0.18} /><stop offset="100%" stopColor={C.brand} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  {series.all && <Area type="monotone" dataKey="all" name="All Issues" stroke={C.brand} strokeWidth={2.2} fill="url(#gAll)" />}
                  {series.repeat && <Line type="monotone" dataKey="repeat" name="Repeat" stroke={C.amber} strokeWidth={2} dot={false} />}
                  {series.failed && <Line type="monotone" dataKey="failed" name="Failed" stroke={C.red} strokeWidth={2} dot={false} />}
                  {series.reviews && <Line type="monotone" dataKey="reviews" name="Human Reviews" stroke={C.slate} strokeWidth={2} dot={false} strokeDasharray="4 3" />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-5">
            {/* Category breakdown */}
            <Panel title="Category Breakdown" Icon={Layers} testid="category-panel">
              <div className="space-y-3.5">
                {categories.map((c) => (
                  <HBar key={c.name} label={c.name} value={c.total} max={maxCat}
                    sub={`${c.total} total · ${c.repeat} repeat · ${c.failed} failed · ${Math.round(100 * c.review / c.total)}% review`}
                    onClick={() => navigate("/staff?view=all")} />
                ))}
              </div>
            </Panel>

            {/* Resolution quality */}
            <Panel title="Resolution Quality" Icon={RotateCcw} testid="quality-panel">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div><p className="font-heading text-2xl font-extrabold text-emerald-600 tabular-nums">{quality.confirmedRate}%</p><p className="text-[11px] text-slate-500">Resident-confirmed</p></div>
                <div><p className="font-heading text-2xl font-extrabold text-teal-600 tabular-nums">{quality.firstRate}%</p><p className="text-[11px] text-slate-500">First-attempt resolution</p></div>
                <div><p className="font-heading text-2xl font-extrabold text-red-600 tabular-nums">{quality.reopened}</p><p className="text-[11px] text-slate-500">Reopened issues</p></div>
                <div><p className="font-heading text-2xl font-extrabold text-violet-600 tabular-nums">{quality.pending}</p><p className="text-[11px] text-slate-500">Confirmation pending</p></div>
              </div>
              <div className="space-y-2.5">
                {quality.comp.map((c) => <HBar key={c.label} label={c.label} value={c.v} max={maxComp} sub={c.v} accent={c.accent} />)}
              </div>
            </Panel>

            {/* Property hotspots */}
            <Panel title="Property Hotspots" Icon={MapPin} testid="hotspots-panel">
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead><tr className="text-[10px] uppercase tracking-widest text-slate-400 text-left">
                    <th className="py-1.5 font-bold">Unit</th><th className="font-bold">Issues</th><th className="font-bold">Repeat</th><th className="font-bold">Failed</th><th className="font-bold">Top</th><th className="font-bold">Last</th>
                  </tr></thead>
                  <tbody>
                    {hotspots.map((u) => (
                      <tr key={u.unit} onClick={() => navigate("/staff?view=all")} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                        <td className="py-2 font-mono font-semibold text-slate-900">{u.unit}</td>
                        <td className="text-slate-700">{u.total}</td>
                        <td className={u.repeat ? "text-amber-700 font-semibold" : "text-slate-400"}>{u.repeat}</td>
                        <td className={u.failed ? "text-red-600 font-semibold" : "text-slate-400"}>{u.failed}</td>
                        <td className="text-slate-600 capitalize">{u.top}</td>
                        <td className="text-slate-500 whitespace-nowrap">{fmtDate(u.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Human attention */}
            <Panel title="Human Attention" Icon={XCircle} testid="attention-panel">
              {attention.length === 0 ? <p className="text-sm text-slate-400">No escalation reasons recorded in this period.</p> : (
                <div className="space-y-3.5">
                  {attention.map((a) => <HBar key={a.reason} label={a.reason} value={a.count} max={maxAtt} sub={a.count} accent="bg-slate-700" />)}
                </div>
              )}
            </Panel>
          </div>

          {/* Repeat & failed table */}
          <Panel title="Repeat & Failed Issues" Icon={Clock} testid="repeat-failed-panel"
            action={<button onClick={() => navigate("/staff?view=failed")} className="text-xs font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">Open in workspace <ChevronRight className="h-3.5 w-3.5" /></button>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] uppercase tracking-widest text-slate-400 text-left border-b border-slate-200">
                  {["Unit", "Resident", "Category", "Issue", "Status", "Attempts", "Score", "Updated"].map((h) => <th key={h} className="py-2 font-bold pr-3">{h}</th>)}
                </tr></thead>
                <tbody>
                  {repeatFailed.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-slate-400">No repeat or failed issues in this period.</td></tr>
                  ) : repeatFailed.map((i) => (
                    <tr key={i.id} onClick={() => navigate("/staff?view=failed")} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <td className="py-2.5 font-mono font-semibold text-slate-900 pr-3">{i.unit}</td>
                      <td className="text-slate-700 pr-3 whitespace-nowrap">{i.resident_name}</td>
                      <td className="text-slate-600 capitalize pr-3">{i.category}</td>
                      <td className="text-slate-600 pr-3 max-w-[260px] truncate">{i.description}</td>
                      <td className="pr-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${i.status === "reopened" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>{i.status}</span></td>
                      <td className="text-slate-700 pr-3">{i.resolution_attempts || 0}</td>
                      <td className="pr-3"><span className={`inline-flex items-center justify-center h-6 w-8 rounded-md font-heading font-bold text-xs ${(i.human_attention_score || 0) >= 90 ? "bg-red-100 text-red-700" : (i.human_attention_score || 0) >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{i.human_attention_score ?? 0}</span></td>
                      <td className="text-slate-500 whitespace-nowrap">{fmtDate(i.updated_at || i.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
        )}
      </div>
    </StaffLayout>
  );
}

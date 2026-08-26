import React, { useEffect, useState } from "react";
import StaffLayout from "@/components/StaffLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { TrendingUp, Layers, Home } from "lucide-react";

function Bar({ label, count, max, testid }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div data-testid={testid} className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-sm text-slate-700 capitalize truncate">{label}</div>
      <div className="flex-1 h-6 rounded-md bg-slate-100 overflow-hidden">
        <div className="h-full bg-slate-900 rounded-md transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-right text-sm font-semibold text-slate-900">{count}</div>
    </div>
  );
}

export default function TrendInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/insights").then((r) => setData(r.data)).catch(() => toast.error("Failed to load insights")).finally(() => setLoading(false));
  }, []);

  const maxCat = Math.max(1, ...((data?.by_category || []).map((c) => c.count)));
  const maxUnit = Math.max(1, ...((data?.by_unit || []).map((c) => c.count)));
  const maxWeek = Math.max(1, ...((data?.weekly || []).map((c) => c.count)));

  return (
    <StaffLayout title="Trend Insights">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl">
        <p className="text-base text-slate-600">Where repeat complaints and failed resolutions are concentrating — by category, by unit, and week over week.</p>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading insights…</div>
        ) : (
          <>
            <div data-testid="insight-total" className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Repeat / Failed Issues</p>
              <p className="mt-1.5 font-heading text-3xl font-extrabold text-orange-600">{data.total_repeat}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 mb-4"><Layers className="h-4 w-4 text-slate-500" /><h2 className="font-heading font-bold text-slate-900">By Category</h2></div>
              <div className="space-y-2.5" data-testid="insight-categories">
                {data.by_category.length === 0 ? <p className="text-sm text-slate-400">No repeat complaints yet.</p> :
                  data.by_category.map((c) => <Bar key={c.name} label={c.name} count={c.count} max={maxCat} testid={`cat-${c.name}`} />)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 mb-4"><Home className="h-4 w-4 text-slate-500" /><h2 className="font-heading font-bold text-slate-900">By Unit</h2></div>
              <div className="space-y-2.5" data-testid="insight-units">
                {data.by_unit.length === 0 ? <p className="text-sm text-slate-400">No repeat complaints yet.</p> :
                  data.by_unit.map((c) => <Bar key={c.unit} label={`Unit ${c.unit}`} count={c.count} max={maxUnit} testid={`unit-${c.unit}`} />)}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-slate-500" /><h2 className="font-heading font-bold text-slate-900">Weekly Trend</h2></div>
              <div className="space-y-2.5" data-testid="insight-weekly">
                {data.weekly.length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> :
                  data.weekly.map((c) => <Bar key={c.week} label={c.week} count={c.count} max={maxWeek} testid={`week-${c.week}`} />)}
              </div>
            </div>
          </>
        )}
      </div>
    </StaffLayout>
  );
}

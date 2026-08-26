import React, { useEffect, useState, useMemo } from "react";
import { Building2, LogOut, Search, Inbox, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { STATUS_META, LANE_META, PRIORITY_META, STATUSES, fmtDate } from "@/lib/constants";
import IssueDetailSheet from "@/components/IssueDetailSheet";
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

function StatCard({ label, value, testid }) {
  return (
    <div data-testid={testid} className="bg-white rounded-xl border border-slate-200 p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [iss, st] = await Promise.all([api.get("/issues"), api.get("/stats")]);
      setIssues(iss.data);
      setStats(st.data);
    } catch (e) {
      toast.error("Failed to load issues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          (i.unit || "").toLowerCase().includes(q) ||
          (i.resident_name || "").toLowerCase().includes(q) ||
          (i.category || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [issues, query, statusFilter]);

  const openIssue = (id) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/staff/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-extrabold tracking-tight text-slate-900">PropTriage</span>
        </div>
        <nav className="space-y-1">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-900">
            <Inbox className="h-4 w-4" /> All Issues
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-slate-200" />
            )}
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-6 md:px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900">Issue Triage</h1>
          </div>
          <button
            data-testid="refresh-btn"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </header>

        <div className="p-6 md:p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total" value={stats?.total ?? "—"} testid="stat-total" />
            <StatCard label="Open" value={stats?.open ?? "—"} testid="stat-open" />
            <StatCard label="In Progress" value={stats?.in_progress ?? "—"} testid="stat-in-progress" />
            <StatCard label="Resolved" value={stats?.resolved ?? "—"} testid="stat-resolved" />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                data-testid="dashboard-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search unit, resident, category…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["all", ...STATUSES].map((s) => (
                <button
                  key={s}
                  data-testid={`filter-${s}`}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-200 ${statusFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  {s === "all" ? "All" : STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-200">
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Unit</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Resident</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Category</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Priority</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Lane</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Assigned Team</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-slate-400">Loading issues…</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                        <Inbox className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                        No issues match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((i) => (
                      <TableRow
                        key={i.id}
                        data-testid={`issue-row-${i.id}`}
                        onClick={() => openIssue(i.id)}
                        className="cursor-pointer border-slate-100 hover:bg-slate-50 transition-colors duration-200"
                      >
                        <TableCell className="font-mono font-semibold text-slate-900">{i.unit}</TableCell>
                        <TableCell className="text-slate-700">{i.resident_name}</TableCell>
                        <TableCell className="text-slate-600">{i.category || "—"}</TableCell>
                        <TableCell><Pill meta={PRIORITY_META[i.priority]} testid={`row-priority-${i.id}`} /></TableCell>
                        <TableCell><Pill meta={LANE_META[i.lane]} testid={`row-lane-${i.id}`} /></TableCell>
                        <TableCell><Pill meta={STATUS_META[i.status]} testid={`row-status-${i.id}`} /></TableCell>
                        <TableCell className="text-slate-600">{i.assigned_team || <span className="text-slate-400">Unassigned</span>}</TableCell>
                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">{fmtDate(i.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>

      <IssueDetailSheet
        issueId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdated={load}
      />
    </div>
  );
}

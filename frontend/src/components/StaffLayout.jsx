import React, { useEffect, useState } from "react";
import { LogOut, LayoutDashboard, AlertTriangle, Scale, Wrench, Sparkles, RotateCcw, ListChecks, BookOpen, TrendingUp, Users, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

export default function StaffLayout({ title, headerAction, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get("/issues").then((r) => {
      const iss = r.data || [];
      const isFailed = (i) => i.failed_resolution || (i.resolution_attempts || 0) > 0 || i.status === "reopened";
      setCounts({
        needs: iss.filter((i) => i.is_emergency || isFailed(i) || i.lane === "REVIEW").length,
        review: iss.filter((i) => i.lane === "REVIEW").length,
        action: iss.filter((i) => i.lane === "ACTION").length,
        resolved: iss.filter((i) => i.lane === "RESOLVE").length,
        failed: iss.filter(isFailed).length,
        all: iss.length,
      });
    }).catch(() => {});
  }, []);

  const params = new URLSearchParams(location.search);
  const view = params.get("view") || "";
  const isStaff = location.pathname === "/staff";

  const GROUPS = [
    { label: "Workspace", items: [
      { to: "/staff", label: "Overview", icon: LayoutDashboard, active: isStaff && !view },
    ]},
    { label: "Issues", items: [
      { to: "/staff?view=needs", label: "Needs Attention", icon: AlertTriangle, badge: counts?.needs, active: isStaff && view === "needs" },
      { to: "/staff?view=review", label: "Review", icon: Scale, badge: counts?.review, active: isStaff && view === "review" },
      { to: "/staff?view=action", label: "Action", icon: Wrench, badge: counts?.action, active: isStaff && view === "action" },
      { to: "/staff?view=resolved", label: "AI Resolved", icon: Sparkles, badge: counts?.resolved, active: isStaff && view === "resolved" },
      { to: "/staff?view=failed", label: "Failed Resolutions", icon: RotateCcw, badge: counts?.failed, active: isStaff && view === "failed" },
      { to: "/staff?view=all", label: "All Issues", icon: ListChecks, badge: counts?.all, active: isStaff && view === "all" },
    ]},
    { label: "Operations", items: [
      { to: "/staff/knowledge", label: "Knowledge Base", icon: BookOpen, active: location.pathname === "/staff/knowledge" },
      { to: "/staff/insights", label: "Analytics", icon: TrendingUp, active: location.pathname === "/staff/insights" },
      ...(!user?.is_demo ? [{ to: "/staff/leads", label: "Demo Requests", icon: Users, active: location.pathname === "/staff/leads" }] : []),
    ]},
  ];

  const handleLogout = async () => { await logout(); window.location.href = "/staff/login"; };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-slate-200 p-4">
        <div className="flex items-center gap-2.5 px-1 mb-1">
          <div className="h-9 w-9 rounded-lg bg-brand-700 flex items-center justify-center">
            <BrandMark className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</p>
            <p className="text-[11px] text-slate-400">Riverside Luxury Residences</p>
          </div>
        </div>
        {user?.is_demo && (
          <span data-testid="demo-viewer-badge" className="mt-3 self-start inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">Demo Environment</span>
        )}

        <nav className="mt-5 space-y-5 flex-1 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} data-testid={`nav-${item.label.replace(/\s+/g, "-").toLowerCase()}`}
                      onClick={() => navigate(item.to)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${item.active ? "bg-brand-50 text-brand-800 font-semibold" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"}`}>
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className={`text-[11px] font-semibold rounded-full px-1.5 min-w-[20px] text-center ${item.active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-500"}`}>{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            {user?.picture ? <img src={user.picture} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-slate-200" />}
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button data-testid="logout-btn" onClick={handleLogout}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150">
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white p-4 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center"><BrandMark className="h-5 w-5 text-white" /></div>
                <span className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-slate-500"><X className="h-5 w-5" /></button>
            </div>
            <nav className="space-y-5 flex-1 overflow-y-auto">
              {GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{g.label}</p>
                  <div className="space-y-0.5">
                    {g.items.map((item) => { const Icon = item.icon; return (
                      <button key={item.label} onClick={() => { navigate(item.to); setMobileOpen(false); }}
                        className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${item.active ? "bg-brand-50 text-brand-800 font-semibold" : "text-slate-600 hover:bg-slate-50 font-medium"}`}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} /><span className="flex-1 text-left truncate">{item.label}</span>
                        {typeof item.badge === "number" && item.badge > 0 && <span className="text-[11px] font-semibold rounded-full px-1.5 bg-slate-100 text-slate-500">{item.badge}</span>}
                      </button> ); })}
                  </div>
                </div>
              ))}
            </nav>
            <button onClick={handleLogout} className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600"><LogOut className="h-4 w-4" /> Sign Out</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-4 md:px-8 py-3 md:py-0 md:h-16 flex flex-wrap items-center gap-2 md:gap-3">
          <button onClick={() => setMobileOpen(true)} data-testid="mobile-nav-toggle" className="md:hidden text-slate-600 p-1"><Menu className="h-6 w-6" /></button>
          <h1 className="font-heading text-lg md:text-xl font-bold tracking-tight text-slate-900 flex-1 min-w-0 truncate">{title}</h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">{headerAction}</div>
        </header>
        {children}
      </main>
    </div>
  );
}

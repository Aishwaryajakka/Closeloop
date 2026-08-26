import React from "react";
import { Building2, LogOut, Inbox, BookOpen, TrendingUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/staff", label: "All Issues", icon: Inbox, testid: "nav-issues" },
  { to: "/staff/knowledge", label: "Property Knowledge", icon: BookOpen, testid: "nav-knowledge" },
  { to: "/staff/insights", label: "Trend Insights", icon: TrendingUp, testid: "nav-insights" },
];

export default function StaffLayout({ title, headerAction, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/staff/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</span>
        </div>
        <p className="text-[11px] leading-tight text-slate-400 mb-7 pl-0.5">Close problems, not tickets.</p>

        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                data-testid={item.testid}
                onClick={() => navigate(item.to)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </button>
            );
          })}
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

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 px-6 md:px-8 h-16 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          {headerAction}
        </header>
        {children}
      </main>
    </div>
  );
}

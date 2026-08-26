import React, { useEffect, useState } from "react";
import { Building2, Send, Search, LayoutDashboard, MessageSquarePlus, Clock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { STATUS_META, fmtDate } from "@/lib/constants";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  return (
    <span data-testid={`status-badge-${status}`} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export default function ResidentPortal() {
  const [config, setConfig] = useState(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("new"); // new | track
  const [requests, setRequests] = useState([]);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    api.get("/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  const submit = async () => {
    if (!name.trim() || !unit.trim() || !message.trim()) {
      toast.error("Please enter your name, unit, and a message.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/issues", {
        name: name.trim(),
        unit: unit.trim(),
        message: message.trim(),
        category: category || null,
      });
      toast.success("Request submitted! Our team will follow up shortly.");
      setMessage("");
      setCategory("");
      await loadRequests(name.trim(), unit.trim());
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadRequests = async (n, u) => {
    try {
      const r = await api.post("/residents/requests", { name: n, unit: u });
      setRequests(r.data.issues || []);
      setTracked(true);
    } catch (e) {
      setRequests([]);
    }
  };

  const track = async () => {
    if (!name.trim() || !unit.trim()) {
      toast.error("Enter your name and unit to see your requests.");
      return;
    }
    await loadRequests(name.trim(), unit.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</p>
              <p className="text-xs text-slate-500">{config?.property?.name || "Resident Portal"}</p>
            </div>
          </div>
          <a
            href="/staff/login"
            data-testid="staff-portal-link"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors duration-200"
          >
            <LayoutDashboard className="h-4 w-4" /> Staff Login
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            How can we help?
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Tell us what's going on in your unit. No account needed &mdash; every issue is followed through to resolution.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-full w-fit mx-auto mb-6">
          <button
            data-testid="tab-new-request"
            onClick={() => setTab("new")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${tab === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <MessageSquarePlus className="h-4 w-4" /> New Request
          </button>
          <button
            data-testid="tab-track-request"
            onClick={() => setTab("track")}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${tab === "track" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
          >
            <Clock className="h-4 w-4" /> My Requests
          </button>
        </div>

        {/* Identity fields (shared) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Your Name</label>
              <input
                data-testid="resident-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maria Garcia"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Unit</label>
              <input
                data-testid="resident-unit-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 312"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
              />
            </div>
          </div>

          {tab === "new" ? (
            <>
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Category <span className="text-slate-300 normal-case font-medium tracking-normal">(optional)</span>
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="resident-category-select" className="mt-1.5 rounded-lg">
                    <SelectValue placeholder="Choose a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(config?.categories || []).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Message</label>
                <textarea
                  data-testid="resident-message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  rows={4}
                  placeholder="Describe the issue in your own words…"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                />
              </div>

              <button
                data-testid="submit-issue-btn"
                onClick={submit}
                disabled={submitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold py-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </>
          ) : (
            <button
              data-testid="track-requests-btn"
              onClick={track}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Search className="h-4 w-4" /> View My Requests
            </button>
          )}
        </div>

        {/* Requests list */}
        {tab === "track" && tracked && (
          <div className="mt-6 space-y-3" data-testid="resident-requests-list">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                No requests found for this name and unit yet.
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} data-testid={`resident-request-${req.id}`} className="animate-fade-up bg-white rounded-xl border border-slate-200 p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {req.category && <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{req.category}</span>}
                        <span className="text-xs text-slate-400">Unit {req.unit}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-800 line-clamp-2">{req.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{fmtDate(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

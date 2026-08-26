import React, { useEffect, useState } from "react";
import { Send, Search, LayoutDashboard, MessageSquarePlus, Clock, Check, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { STATUS_META, fmtDate } from "@/lib/constants";
import { BrandMark } from "@/components/BrandMark";

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
  const [result, setResult] = useState(null);
  const [openThread, setOpenThread] = useState(null);
  const [thread, setThread] = useState([]);

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
      const res = await api.post("/issues", {
        name: name.trim(),
        unit: unit.trim(),
        message: message.trim(),
      });
      setResult(res.data);
      toast.success("We've got it — CloseLoop is on it.");
      setMessage("");
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

  const toggleThread = async (issueId) => {
    if (openThread === issueId) { setOpenThread(null); return; }
    setOpenThread(issueId);
    setThread([]);
    try {
      const r = await api.post("/residents/thread", { name: name.trim(), unit: unit.trim(), issue_id: issueId });
      setThread(r.data.interactions || []);
    } catch (e) {
      toast.error("Could not load the conversation.");
    }
  };

  const track = async () => {
    if (!name.trim() || !unit.trim()) {
      toast.error("Enter your name and unit to see your requests.");
      return;
    }
    await loadRequests(name.trim(), unit.trim());
  };

  const confirmResolution = async (issueId, confirmed) => {
    try {
      await api.post(`/issues/${issueId}/confirm`, { confirmed });
      toast.success(confirmed ? "Thanks for confirming!" : "We've reopened your request — help is on the way.");
      await loadRequests(name.trim(), unit.trim());
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/80 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-brand-700 flex items-center justify-center">
              <BrandMark className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</p>
              <p className="text-xs text-slate-500">{config?.property?.name || "Resident Portal"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              data-testid="tab-track-request-top"
              onClick={() => setTab("track")}
              className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors duration-200"
            >
              My Requests
            </button>
            <a
              href="/staff/login"
              data-testid="staff-portal-link"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors duration-200"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Staff Login
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 md:py-14">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* LEFT */}
          <div className="lg:pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">{(config?.property?.name || "Riverside Luxury Residences").toUpperCase()}</p>
            <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              How can we help?
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 max-w-md">
              Tell us what's happening and CloseLoop will get it to the right team, keep you updated, and follow it through to resolution.
            </p>
            <ul className="mt-6 space-y-2.5">
              {["No account needed", "Automatically routed", "Followed through to resolution"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm font-medium text-slate-400">Report once. Stay informed. Get resolved.</p>
          </div>

          {/* RIGHT */}
          <div>
        {result && (
          <div data-testid="submission-result" className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] animate-fade-up">
            <p className="text-sm font-bold text-emerald-700">We've got it.</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-slate-900 capitalize">{result.category || "Your request"}</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {[result.assigned_team, result.priority && `${result.priority} ${result.priority === "P0" ? "Emergency" : result.priority === "P1" ? "Urgent" : result.priority === "P2" ? "Normal" : "Admin"}`].filter(Boolean).join(" · ")}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Request understood</li>
              {result.matched_existing && (
                <>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Previous issue found</li>
                  <li className="flex items-center gap-2 text-orange-700"><RotateCcw className="h-4 w-4" /> Existing issue reopened</li>
                </>
              )}
              {result.lane === "ACTION" && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Property team notified</li>}
              {result.lane === "RESOLVE" && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Answered from property documents</li>}
              {result.lane === "REVIEW" && !result.matched_existing && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Sent to the property team for review</li>}
            </ul>
            {result.lane === "RESOLVE" && result.auto_response && (
              <div data-testid="submission-answer" className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-0.5">Answer</p>
                <p className="text-sm text-slate-700">{result.auto_response}</p>
                {result.answer_source && <p className="mt-1 text-xs text-emerald-700">Source: {result.answer_source}</p>}
              </div>
            )}
            <p className="mt-4 text-sm text-slate-500">You don't need to submit another request. We'll keep this issue together and update you here.</p>
            <button data-testid="submit-another-btn" onClick={() => setResult(null)} className="mt-3 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors duration-200">Report something else</button>
          </div>
        )}
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-full w-fit mb-6">
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
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Unit</label>
              <input
                data-testid="resident-unit-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 312"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-1"
              />
            </div>
          </div>

          {tab === "new" ? (
            <>
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">How can we help?</label>
                <textarea
                  data-testid="resident-message-input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  rows={4}
                  placeholder="Tell us what's happening in your own words…"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-1"
                />
                <p className="mt-1.5 text-xs text-slate-400">e.g. "The sink maintenance fixed yesterday has started leaking again."</p>
              </div>

              <button
                data-testid="submit-issue-btn"
                onClick={submit}
                disabled={submitting}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-semibold py-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2"
              >
                {submitting ? "Working…" : "Get Help"} <Send className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              data-testid="track-requests-btn"
              onClick={track}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold py-3 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2"
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
                      {req.auto_response && (
                        <div data-testid={`resident-answer-${req.id}`} className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-0.5">Answer</p>
                          <p className="text-sm text-slate-700">{req.auto_response}</p>
                          {req.answer_source && <p className="mt-1 text-xs text-emerald-700">Source: {req.answer_source}</p>}
                        </div>
                      )}
                      {!req.auto_response && req.acknowledgement && (
                        <p data-testid={`resident-ack-${req.id}`} className="mt-2 text-sm text-blue-700">{req.acknowledgement}</p>
                      )}
                      {req.status === "confirmation_pending" && (
                        <div data-testid={`resident-confirm-${req.id}`} className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
                          <p className="text-sm font-semibold text-violet-900">Is everything working now?</p>
                          <div className="mt-2 flex gap-2">
                            <button data-testid={`confirm-yes-${req.id}`} onClick={() => confirmResolution(req.id, true)}
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-3.5 py-1.5 transition-colors duration-200">
                              Yes, it's resolved
                            </button>
                            <button data-testid={`confirm-no-${req.id}`} onClick={() => confirmResolution(req.id, false)}
                              className="rounded-full bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-semibold px-3.5 py-1.5 transition-colors duration-200">
                              No, I still need help
                            </button>
                          </div>
                        </div>
                      )}
                      {req.status === "reopened" && (
                        <p data-testid={`resident-reopened-${req.id}`} className="mt-2 text-sm text-amber-700 font-medium">We've reopened your request — a specialist will follow up here shortly.</p>
                      )}
                      <button data-testid={`toggle-thread-${req.id}`} onClick={() => toggleThread(req.id)}
                        className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors duration-200">
                        {openThread === req.id ? "Hide conversation" : "View conversation"}
                      </button>
                      {openThread === req.id && (
                        <div data-testid={`thread-${req.id}`} className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                          {thread.length === 0 ? (
                            <p className="text-xs text-slate-400">Loading…</p>
                          ) : thread.map((m) => {
                            const mine = m.sender === "resident";
                            return (
                              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-slate-900 text-white" : m.sender === "ai" ? "bg-emerald-100 text-emerald-900" : m.sender === "system" ? "bg-slate-100 text-slate-500 italic" : "bg-blue-100 text-blue-900"}`}>
                                  {!mine && <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{m.sender === "ai" ? "Assistant" : m.sender}</p>}
                                  {m.message}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-400">{fmtDate(req.created_at)}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

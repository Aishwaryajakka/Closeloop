import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { Check, RotateCcw, ArrowRight, ShieldAlert, Wrench, BookOpen, AlertTriangle, RefreshCw, X, Droplet, Car, Package, Volume2, Building2 } from "lucide-react";

const INBOX = [
  { unit: "118", name: "Elena Petrova", msg: "What time does the pool close?", cat: "Amenity", Icon: Building2, cls: "bg-cyan-50 text-cyan-700", time: "9:31 AM", status: "New" },
  { unit: "204", name: "Marcus Bell", msg: "Can my guest park overnight?", cat: "Parking", Icon: Car, cls: "bg-teal-50 text-teal-700", time: "9:36 AM", status: "New" },
  { unit: "312", name: "Priya Nair", msg: "My dishwasher isn't working.", cat: "Maintenance", Icon: Wrench, cls: "bg-blue-50 text-blue-700", time: "9:42 AM", status: "New" },
  { unit: "410", name: "Tom Reyes", msg: "There's a package missing.", cat: "Package", Icon: Package, cls: "bg-slate-100 text-slate-600", time: "9:48 AM", status: "New" },
  { unit: "521", name: "Dana Lee", msg: "The upstairs noise is back again.", cat: "Noise", Icon: Volume2, cls: "bg-amber-50 text-amber-700", time: "9:55 AM", status: "New" },
  { unit: "603", name: "Nathan Brooks", msg: "Water is coming through my ceiling.", cat: "Leak", Icon: Droplet, cls: "bg-red-50 text-red-700", time: "10:02 AM", status: "Urgent" },
];

function Metric({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1.5 font-heading text-2xl font-extrabold tracking-tight ${accent || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function TL({ children, done, active }) {
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="flex flex-col items-center">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-teal-100 text-teal-700" : active ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
          {done ? <Check className="h-4 w-4" /> : active ? <RotateCcw className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </div>
        <div className="w-px flex-1 bg-slate-200 my-1" />
      </div>
      <div className="pb-4 text-sm text-slate-700">{children}</div>
    </div>
  );
}

export default function DemoMode() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const startAct = Math.min(Math.max(parseInt(params.get("act") || "0", 10) || 0, 0), 5);
  const [act, setAct] = useState(startAct);
  const [auto, setAuto] = useState(false);
  const next = () => setAct((a) => Math.min(a + 1, 5));

  React.useEffect(() => {
    if (!auto || act === 0 || act >= 5) return;
    const t = setTimeout(() => setAct((a) => Math.min(a + 1, 5)), 4500);
    return () => clearTimeout(t);
  }, [auto, act]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-auto">
      {/* Top control bar */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/85 border-b border-slate-200/70 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center"><BrandMark className="h-5 w-5 text-white" /></div>
          <span className="font-heading font-extrabold tracking-tight text-slate-900">CloseLoop</span>
          <span data-testid="demo-badge" className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">Demo Environment</span>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="demo-jump-act3" onClick={() => setAct(3)} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-orange-200 text-orange-700 px-3 py-1.5 text-xs font-semibold hover:bg-orange-50 transition-colors duration-200">Jump to reopen moment</button>
          <button data-testid="demo-autoplay" onClick={() => setAuto((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${auto ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>{auto ? "Auto-play: On" : "Auto-play"}</button>
          <button data-testid="demo-restart" onClick={() => setAct(0)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors duration-200"><RefreshCw className="h-3.5 w-3.5" /> Restart Demo</button>
          <button data-testid="demo-exit" onClick={() => navigate("/staff")} className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white px-3 py-1.5 text-xs font-semibold transition-colors duration-200"><X className="h-3.5 w-3.5" /> Exit Demo</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Workflow step indicator */}
        <div className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto">
          {[["01", "Inbox"], ["02", "Triage"], ["03", "Resolution"], ["04", "Memory"], ["05", "Dashboard"]].map(([n, l], idx) => {
            const step = idx + 1;
            const state = act > step ? "done" : act === step ? "active" : "todo";
            return (
              <React.Fragment key={n}>
                <button onClick={() => setAct(step)} data-testid={`demo-step-${step}`}
                  className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 shrink-0 ${state === "active" ? "bg-brand-700 text-white" : state === "done" ? "bg-brand-50 text-brand-700" : "text-slate-400 hover:text-slate-600"}`}>
                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] ${state === "active" ? "bg-white/20 text-white" : state === "done" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"}`}>{state === "done" ? <Check className="h-3 w-3" /> : n}</span>
                  <span className="hidden sm:inline">{l}</span>
                </button>
                {idx < 4 && <span className={`h-px w-3 sm:w-6 shrink-0 ${act > step ? "bg-brand-300" : "bg-slate-200"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {act === 0 && (
          <div className="animate-fade-up text-center py-10">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900">See CloseLoop in 2 minutes</h1>
            <p className="mt-3 text-slate-600 max-w-md mx-auto">Watch a batch of resident messages arrive, get sorted automatically, and see what happens when a fixed problem comes back.</p>
            <button data-testid="run-demo-inbox" onClick={next} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors duration-200">Run Demo Inbox <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {act === 1 && (
          <div className="animate-fade-up" data-testid="demo-act1">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Act 1 · Resident inbox</p>
                <h2 className="font-heading text-2xl font-extrabold text-slate-900 mt-1">24 resident interactions</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-3 py-1">Live queue</span>
            </div>
            <div className="mt-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-400 text-left border-b border-slate-200 bg-slate-50/60">
                    <th className="py-2.5 px-4 font-bold">Unit / Resident</th>
                    <th className="font-bold">Message</th>
                    <th className="font-bold">Category</th>
                    <th className="font-bold">Received</th>
                    <th className="font-bold pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {INBOX.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
                      <td className="py-2.5 px-4"><p className="font-mono font-semibold text-slate-900">{r.unit}</p><p className="text-xs text-slate-500">{r.name}</p></td>
                      <td className="text-slate-700 pr-4 max-w-[280px] truncate">{r.msg}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md ${r.cls}`}><r.Icon className="h-3.5 w-3.5" strokeWidth={1.9} /></span>
                          {r.cat}
                        </span>
                      </td>
                      <td className="text-slate-500 whitespace-nowrap">{r.time}</td>
                      <td className="pr-4"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${r.status === "Urgent" ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 text-xs text-slate-400 border-t border-slate-100 bg-slate-50/40">Showing 6 of 24 interactions</div>
            </div>
            <button onClick={next} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3">Sort the work <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {act === 2 && (
          <div className="animate-fade-up" data-testid="demo-act2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Act 2 · CloseLoop sorts the work</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {[
                { t: "RESOLVE", d: "Answered from property documents", Icon: BookOpen, cls: "border-emerald-200 bg-emerald-50/70 text-emerald-800" },
                { t: "ACTION", d: "Routed to Maintenance, Leasing or Concierge", Icon: Wrench, cls: "border-blue-200 bg-blue-50/70 text-blue-800" },
                { t: "REVIEW", d: "Needs human judgment", Icon: AlertTriangle, cls: "border-amber-200 bg-amber-50/70 text-amber-800" },
              ].map(({ t, d, Icon, cls }) => (
                <div key={t} className={`rounded-xl border p-4 ${cls}`}><Icon className="h-5 w-5" /><p className="mt-2 font-heading font-bold">{t}</p><p className="text-xs mt-0.5 opacity-80">{d}</p></div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Interactions" value="24" />
              <Metric label="AI Resolved" value="15" accent="text-emerald-600" />
              <Metric label="Actions Underway" value="6" accent="text-blue-600" />
              <Metric label="Need Attention" value="3" accent="text-amber-600" />
            </div>
            <p className="mt-5 font-heading text-lg font-bold text-slate-900">CloseLoop handled the routine. Here's what needs you.</p>
            <p className="text-sm text-slate-500">Management doesn't need to read every resident message.</p>
            <button onClick={next} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3">The important part <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {act === 3 && (
          <div className="animate-fade-up" data-testid="demo-act3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Act 3 · Resolution Memory</p>
            <h2 className="font-heading text-2xl font-extrabold text-slate-900 mt-1">Unit 603 · Kitchen sink leak</h2>
            <div className="mt-5">
              <TL done>Resident reported leaking sink</TL>
              <TL done>CloseLoop routed → Maintenance</TL>
              <TL done>Maintenance completed repair</TL>
              <TL done>Resident confirmed resolution ✓</TL>
              <TL active>New message: "The sink you fixed is leaking again."</TL>
            </div>
            <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">CloseLoop recognizes this is the <span className="font-semibold text-slate-800">same underlying issue</span> — no new ticket created. It reopens the existing one.</div>
            <div data-testid="demo-failed" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> PREVIOUS RESOLUTION FAILED</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-red-700">
                <div>Same issue reopened</div><div>Repeat problem detected</div>
                <div>Resolution attempts: <span className="font-semibold">1</span></div><div>Human Attention: <span className="font-semibold">96/100</span></div>
              </div>
              <p className="mt-2 text-sm font-semibold text-red-700">Management review recommended.</p>
            </div>
            <button onClick={next} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3">Why this matters <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {act === 4 && (
          <div className="animate-fade-up text-center py-8" data-testid="demo-act4">
            <p className="text-slate-400 font-medium">Most systems would create another ticket.</p>
            <p className="mt-4 font-heading text-3xl font-extrabold text-slate-900">CloseLoop remembers the problem.</p>
            <div className="mt-8 max-w-lg mx-auto rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">Traditional systems track whether a <span className="font-semibold text-slate-700">ticket was closed</span>.</p>
              <p className="mt-2 text-base font-semibold text-slate-900">CloseLoop tracks whether the resident's problem was actually resolved.</p>
            </div>
            <button onClick={next} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3">See it in the live dashboard <ArrowRight className="h-4 w-4" /></button>
          </div>
        )}

        {act === 5 && (
          <div className="animate-fade-up" data-testid="demo-act5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Act 5 · Back in CloseLoop</p>
            <h2 className="font-heading text-2xl font-extrabold text-slate-900 mt-1">This all lives in the real product.</h2>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="AI Resolved" value="15" accent="text-emerald-600" />
              <Metric label="Actions Underway" value="6" accent="text-blue-600" />
              <Metric label="Needs Attention" value="3" accent="text-amber-600" />
              <Metric label="Resolution Failures" value="3" accent="text-orange-600" />
            </div>
            <button data-testid="demo-enter-live" onClick={() => navigate("/staff")} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3">Enter the live dashboard <ArrowRight className="h-4 w-4" /></button>
            <p className="mt-3 text-sm text-slate-500">The reopened Unit 603 sink is the top card in <button onClick={() => navigate("/staff")} className="font-semibold text-slate-800 underline">Needs Your Attention</button> — inspect the real record.</p>
          </div>
        )}
      </div>
    </div>
  );
}

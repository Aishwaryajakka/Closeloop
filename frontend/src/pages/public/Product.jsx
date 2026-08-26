import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { ArrowRight, MessageSquare, Cpu, GitBranch, Send, CircleCheck, RotateCcw } from "lucide-react";

const STAGES = [
  { key: "intake", label: "Intake", Icon: MessageSquare, title: "Resident Interaction", desc: "Portal, email or existing system" },
  { key: "intelligence", label: "Intelligence", Icon: Cpu, title: "CloseLoop Intelligence", desc: "Understand what the resident actually needs — context, urgency, history and property knowledge", center: true },
  { key: "decision", label: "Decision", Icon: GitBranch, title: "Resolve · Action · Review", desc: "The right path for each message", lanes: true },
  { key: "execution", label: "Execution", Icon: Send, title: "Respond · Route · Escalate", desc: "Answer directly, route work or surface for judgment" },
  { key: "resolution", label: "Resolution", Icon: CircleCheck, title: "Track Resolution", desc: "Confirm the outcome and remember what happened" },
];

const LANES = [
  { t: "RESOLVE", cls: "text-teal-700 bg-teal-50 border-teal-200" },
  { t: "ACTION", cls: "text-brand-700 bg-brand-50 border-brand-200" },
  { t: "REVIEW", cls: "text-[#8a6d3b] bg-[#faf5ea] border-[#e7d9bd]" },
];

function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); obs.disconnect(); }
    }, { threshold: 0.25 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen]);
  return [ref, seen];
}

function Stage({ s, i }) {
  const { Icon } = s;
  return (
    <div className="flow-stage relative" style={{ animationDelay: `${150 + i * 130}ms` }}>
      <div className="flex md:flex-col md:items-center gap-4 md:gap-0 md:text-center">
        <div className={`relative h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center border ${s.center ? "bg-brand-700 border-brand-700 text-white shadow-lg shadow-brand-700/25 ring-4 ring-brand-100" : "bg-white border-slate-200 text-slate-700"}`}>
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="md:mt-4">
          <p className={`text-[10px] font-bold uppercase tracking-widest ${s.center ? "text-brand-700" : "text-slate-400"}`}>{s.label}</p>
          <p className="mt-1 font-heading text-sm font-bold text-slate-900 md:px-1">{s.title}</p>
          <p className="mt-1 text-xs text-slate-500 leading-snug md:px-1 max-w-[190px] md:mx-auto">{s.desc}</p>
          {s.lanes && (
            <div className="mt-2.5 flex md:justify-center gap-1.5">
              {LANES.map((l) => (
                <span key={l.t} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${l.cls}`}>{l.t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Product() {
  const enterDemo = useDemoEntry();
  const [flowRef, seen] = useInView();

  return (
    <PublicLayout>
      {/* Compact editorial hero */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Product / How It Works</p>
            <h1 className="mt-4 font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              An intelligence layer for resident operations.
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              CloseLoop can be your resident request experience or the intelligence layer behind the systems your residents already use. Either way, every message follows the same path to resolution.
            </p>
          </div>
          {/* Mini product concept visual */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resident message</p>
              <p className="mt-1 text-sm text-slate-800">"The dishwasher you fixed is leaking again."</p>
            </div>
            <div className="my-3 flex items-center justify-center gap-2 text-slate-400">
              <span className="h-px w-8 bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 text-white px-3 py-1 text-xs font-semibold">
                <Cpu className="h-3.5 w-3.5" strokeWidth={1.75} /> CloseLoop
              </span>
              <span className="h-px w-8 bg-slate-200" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANES.map((l) => (
                <div key={l.t} className={`rounded-lg border px-2 py-2 text-center text-[11px] font-bold tracking-wide ${l.cls}`}>{l.t}</div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-red-600" />
              <p className="text-xs font-semibold text-red-700">Recognized as a returning problem — reopened, not duplicated.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Flow */}
      <section id="flow" className="bg-slate-50 border-y border-slate-200">
        <div ref={flowRef} className={`max-w-6xl mx-auto px-6 py-12 md:py-14 ${seen ? "flow-in-view" : ""}`}>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">The Intelligence Flow</p>
              <h2 className="mt-1 font-heading text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">One message. One path to resolution.</h2>
            </div>
            <Link to="/#resolution-memory" className="text-sm font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              See how resolution is tracked <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Desktop: horizontal with animated connector line */}
          <div className="hidden md:block relative mt-10">
            <div className="absolute left-[10%] right-[10%] top-7 h-px bg-slate-200 flow-line" style={{ animationDelay: "0ms" }} />
            <div className="relative grid grid-cols-5 gap-4">
              {STAGES.map((s, i) => <Stage key={s.key} s={s} i={i} />)}
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="md:hidden mt-8 relative">
            <div className="absolute left-7 top-4 bottom-4 w-px bg-slate-200 flow-line" style={{ transformOrigin: "top", animationName: seen ? "flow-line" : "none" }} />
            <div className="space-y-6">
              {STAGES.map((s, i) => <Stage key={s.key} s={s} i={i} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Two ways to run it — editorial, not boxed */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          <div>
            <h3 className="font-heading text-xl font-extrabold tracking-tight text-slate-900">Standalone</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">Use the CloseLoop resident request experience directly — no other software required.</p>
            <div className="mt-5 h-px bg-slate-200" />
            <h3 className="mt-5 font-heading text-xl font-extrabold tracking-tight text-slate-900">Alongside existing systems</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">Already have a resident portal, PMS, or maintenance system? Keep it. CloseLoop is positioned to sit behind existing workflows as the intelligence and resolution layer.</p>
            <p className="mt-2 text-xs text-slate-400">Integration-ready architecture — API/integration capability available as the product develops.</p>
          </div>
          <div>
            <h3 className="font-heading text-xl font-extrabold tracking-tight text-slate-900">What CloseLoop understands</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
              {["Resident intent, category, and desired outcome", "Approved property knowledge and documents", "Repeat complaints and failed resolutions", "Emergencies and policy conflicts", "A Human Attention Score for every issue", "Whether the resident's problem was actually resolved"].map((t) => (
                <li key={t} className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-700 shrink-0" /> {t}</li>
              ))}
            </ul>
            <button onClick={enterDemo} className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors">See it live <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

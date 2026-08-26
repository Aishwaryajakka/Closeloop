import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { ArrowRight, BookOpen, Wrench, AlertTriangle, Check, RotateCcw, Cpu, MessageSquare, Search, ShieldAlert } from "lucide-react";

const LANES = [
  {
    Icon: BookOpen, tag: "RESOLVE", title: "Answer the routine.",
    desc: "CloseLoop answers routine questions using approved property documents and knowledge.",
    example: "What time does the pool close?", arrow: "Answered automatically from Amenity Rules.",
    accent: { top: "border-t-teal-500", icon: "bg-teal-50 text-teal-600", arrow: "text-teal-700" },
  },
  {
    Icon: Wrench, tag: "ACTION", title: "Route the work.",
    desc: "CloseLoop understands operational requests and sends them to the appropriate team.",
    example: "My dishwasher stopped working.", arrow: "Routed to Maintenance",
    accent: { top: "border-t-blue-500", icon: "bg-blue-50 text-blue-600", arrow: "text-blue-700" },
  },
  {
    Icon: AlertTriangle, tag: "REVIEW", title: "Surface what matters.",
    desc: "Emergencies, repeated complaints, failed resolutions, policy conflicts, and situations requiring human judgment reach management.",
    example: "I've complained about this four times.", arrow: "Human review",
    accent: { top: "border-t-amber-500", icon: "bg-amber-50 text-amber-600", arrow: "text-amber-700" },
  },
];

function Lane({ Icon, tag, title, desc, example, arrow, accent }) {
  return (
    <div data-testid={`lane-${tag.toLowerCase()}`}
      className={`rounded-2xl border border-slate-200 border-t-4 ${accent.top} bg-white p-6 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${accent.icon}`}><Icon className="h-4 w-4" strokeWidth={2} /></span>
        <span className="font-heading font-extrabold tracking-widest text-xs text-slate-500">{tag}</span>
      </div>
      <p className="mt-4 font-heading text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
        <p className="text-sm text-slate-700">"{example}"</p>
        <p className={`mt-1.5 text-xs font-semibold inline-flex items-center gap-1 ${accent.arrow}`}><ArrowRight className="h-3.5 w-3.5" /> {arrow}</p>
      </div>
    </div>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-500 border-slate-200",
  indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  red: "bg-red-100 text-red-600 border-red-200",
};

function TItem({ Icon, tone = "slate", last, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border shrink-0 ${TONES[tone]}`}><Icon className="h-3.5 w-3.5" strokeWidth={2.2} /></span>
        {!last && <span className="w-px flex-1 my-1 bg-slate-200 min-h-[18px]" />}
      </div>
      <p className="pb-4 text-sm text-slate-700 pt-0.5">{children}</p>
    </div>
  );
}

export default function Home() {
  const enterDemo = useDemoEntry();
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#f6f5ff] to-white border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-16 md:pt-16 md:pb-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">AI Resident Operations</p>
            <h1 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              Resident requests shouldn't disappear into an inbox.
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
              CloseLoop understands resident requests, resolves routine questions, routes operational work, and surfaces the problems that actually need human attention.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button data-testid="hero-view-demo" onClick={enterDemo}
                className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 shadow-sm shadow-brand-700/20 transition-colors">
                View Live Demo <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/product" data-testid="hero-how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 transition-colors">
                See How It Works
              </Link>
            </div>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white/70 backdrop-blur px-5 py-4 max-w-xl">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Already have a resident portal? Keep it.</span> CloseLoop can work behind your existing workflow as the intelligence and resolution layer.
              </p>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative" data-testid="hero-product-preview">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-brand-900/30 overflow-hidden">
              <div className="flex items-center gap-2 px-4 h-10 border-b border-slate-800/80">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <div className="ml-3 flex-1 flex items-center gap-2 rounded-md bg-slate-800/70 px-3 py-1 text-[11px] text-slate-400">
                  <Search className="h-3 w-3" /> Search operations…
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> AI Online</span>
              </div>
              <div className="relative px-5 py-8 min-h-[300px] flex items-center justify-center">
                <div className="absolute left-4 top-6 max-w-[180px] rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 shadow-lg">
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Resident · Unit 603</p>
                  <p className="mt-1 text-sm text-slate-100">"My kitchen sink is leaking."</p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-2xl animate-pulse" />
                    <div className="relative h-full w-full rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/10">
                      <Cpu className="h-9 w-9 text-white" strokeWidth={1.75} />
                    </div>
                  </div>
                  <p className="mt-5 font-heading font-bold text-white">CloseLoop is triaging…</p>
                  <div className="mt-2 flex gap-1.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: `${d * 200}ms` }} />
                    ))}
                  </div>
                </div>

                <div className="absolute right-4 top-6 flex flex-col gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/20"><BookOpen className="h-4 w-4" /></span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/20"><Wrench className="h-4 w-4" /></span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20"><AlertTriangle className="h-4 w-4" /></span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> CloseLoop is triaging
            </div>
          </div>
        </div>
      </section>

      {/* Three lanes */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">One resident message. The right outcome.</h2>
            <p className="mt-3 text-slate-600">Every interaction is understood and sent down one of three lanes.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {LANES.map((l) => <Lane key={l.tag} {...l} />)}
          </div>
        </div>
      </section>

      {/* Resolution Memory */}
      <section id="resolution-memory" className="bg-[#f6f5ff] border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid lg:grid-cols-[45fr_55fr] gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Resolution Memory</p>
            <h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Closing a ticket isn't the same as solving the problem.
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed">
              Most systems see another ticket. CloseLoop sees the same unresolved problem. It reconnects the new interaction with the original issue, reopens the full history, raises the attention score, and gives management the complete context.
            </p>
            <p className="mt-6 font-heading text-xl font-extrabold text-slate-900 border-l-2 border-indigo-500 pl-4">Don't just track tickets. Track resolution.</p>
          </div>
          <div className="seq rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)]">
            <TItem Icon={MessageSquare} tone="indigo">Resident: "My kitchen sink is leaking."</TItem>
            <TItem Icon={Cpu} tone="indigo">CloseLoop routes to Maintenance</TItem>
            <TItem Icon={Check} tone="teal">Repair completed</TItem>
            <TItem Icon={Check} tone="teal"><span className="text-teal-700 font-semibold">Resident confirms resolution</span></TItem>
            <TItem Icon={RotateCcw} tone="red" last>Three days later: "The sink you fixed is leaking again."</TItem>
            <div className="mt-1 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 flex items-center gap-2" data-testid="home-resolution-failed">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="text-sm font-extrabold tracking-wide">PREVIOUS RESOLUTION FAILED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Existing stack positioning — dark architecture */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight">Don't replace your property stack. Make it smarter.</h2>
          <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
            CloseLoop is designed for operators starting from scratch and operators that already have resident-facing systems. It's an intelligence and resolution layer — not another system to rip and replace.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-sm">
            {["Existing Resident Channel", "CloseLoop Intelligence", "Intent + Knowledge + Resolution Memory", "RESOLVE · ACTION · REVIEW", "Property Teams"].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className={`rounded-full px-4 py-2 font-medium border ${i === 1 ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200" : "bg-white/5 border-white/15 text-slate-200"}`}>{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-600" />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-7 text-xs text-slate-500">Integration-ready architecture. API/integration capability available as the product develops.</p>
        </div>
      </section>

      {/* Metrics strip */}
      <section className="bg-gradient-to-br from-brand-700 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6 text-center" data-testid="home-metrics">
          {[
            { v: "94%", l: "Resolved without escalation" },
            { v: "<2m", l: "Average response time" },
            { v: "100%", l: "Resolutions tracked" },
          ].map((m) => (
            <div key={m.l}>
              <p className="font-heading text-5xl font-extrabold tracking-tight">{m.v}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-white/70">{m.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">See CloseLoop handle a real inbox.</h2>
          <p className="mt-3 text-slate-600">Explore the seeded demo environment — no login required.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={enterDemo} data-testid="cta-view-demo" className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 shadow-sm shadow-brand-700/20 transition-colors">View Live Demo <ArrowRight className="h-4 w-4" /></button>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 transition-colors">Request a Demo</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

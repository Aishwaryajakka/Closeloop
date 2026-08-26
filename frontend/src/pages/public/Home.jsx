import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { ArrowRight, BookOpen, Wrench, AlertTriangle, Check, RotateCcw } from "lucide-react";

function Lane({ Icon, tag, title, desc, example, arrow, cls }) {
  return (
    <div className={`rounded-2xl border p-6 ${cls}`} data-testid={`lane-${tag.toLowerCase()}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <span className="font-heading font-extrabold tracking-tight">{tag}</span>
      </div>
      <p className="mt-3 font-heading text-lg font-bold text-slate-900">{title}</p>
      <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
      <div className="mt-4 rounded-lg bg-white/70 border border-slate-200 p-3">
        <p className="text-sm text-slate-700">"{example}"</p>
        <p className="mt-1.5 text-xs font-semibold text-slate-500">→ {arrow}</p>
      </div>
    </div>
  );
}

function Step({ children, last }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-brand-700 mt-1.5" />
        {!last && <div className="w-px flex-1 bg-slate-200 my-1 min-h-[28px]" />}
      </div>
      <p className="pb-4 text-sm text-slate-700">{children}</p>
    </div>
  );
}

export default function Home() {
  const enterDemo = useDemoEntry();
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-14 md:pt-24 md:pb-20">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700">AI Resident Operations</p>
          <h1 className="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
            Resident requests shouldn't disappear into an inbox.
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
            CloseLoop understands resident requests, resolves routine questions, routes operational work, and surfaces the problems that actually need human attention.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button data-testid="hero-view-demo" onClick={enterDemo}
              className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors">
              View Live Demo <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/product" data-testid="hero-how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 transition-colors">
              See How It Works
            </Link>
          </div>
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 max-w-2xl">
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Already have a resident portal? Keep it.</span> CloseLoop can work behind your existing workflow as the intelligence and resolution layer.
            </p>
          </div>
        </div>
      </section>

      {/* Three lanes */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">One resident message. The right outcome.</h2>
          <p className="mt-2 text-slate-600">Every interaction is understood and sent down one of three lanes.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Lane Icon={BookOpen} tag="RESOLVE" title="Answer the routine." cls="border-emerald-200 bg-emerald-50/60 text-emerald-800"
              desc="CloseLoop answers routine questions using approved property documents and knowledge."
              example="What time does the pool close?" arrow="Answered automatically from Amenity Rules." />
            <Lane Icon={Wrench} tag="ACTION" title="Route the work." cls="border-blue-200 bg-blue-50/60 text-blue-800"
              desc="CloseLoop understands operational requests and sends them to the appropriate team."
              example="My dishwasher stopped working." arrow="Maintenance" />
            <Lane Icon={AlertTriangle} tag="REVIEW" title="Surface what matters." cls="border-amber-200 bg-amber-50/60 text-amber-800"
              desc="Emergencies, repeated complaints, failed resolutions, policy conflicts, and situations requiring human judgment reach management."
              example="I've complained about this four times." arrow="Human review" />
          </div>
        </div>
      </section>

      {/* Resolution Memory */}
      <section id="resolution-memory" className="max-w-5xl mx-auto px-6 py-14 md:py-16">
        <div className="grid lg:grid-cols-[45fr_55fr] gap-8 lg:gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Resolution Memory</p>
            <h2 className="mt-3 font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Closing a ticket isn't the same as solving the problem.
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed">
              Most systems see another ticket. CloseLoop sees the same unresolved problem. It reconnects the new interaction with the original issue, reopens the full history, raises the attention score, and gives management the complete context.
            </p>
            <p className="mt-5 font-heading text-xl font-extrabold text-slate-900">Don't just track tickets. Track resolution.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Step>Resident: "My kitchen sink is leaking."</Step>
            <Step>CloseLoop routes to Maintenance</Step>
            <Step>Repair completed</Step>
            <Step><span className="text-emerald-700 font-semibold">Resident confirms resolution ✓</span></Step>
            <Step>Three days later: "The sink you fixed is leaking again."</Step>
            <div className="ml-5 rounded-lg bg-red-600 text-white px-4 py-2.5 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-extrabold tracking-wide">PREVIOUS RESOLUTION FAILED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Existing stack positioning */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight">Don't replace your property stack. Make it smarter.</h2>
          <p className="mt-3 text-slate-300 max-w-2xl">
            CloseLoop is designed for operators starting from scratch and operators that already have resident-facing systems. It's an intelligence and resolution layer — not another system to rip and replace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
            {["Existing Resident Channel", "CloseLoop Intelligence", "Intent + Knowledge + Resolution Memory", "RESOLVE | ACTION | REVIEW", "Property Teams / Existing Systems"].map((s, i, arr) => (
              <React.Fragment key={s}>
                <span className="rounded-full border border-white/20 bg-white/5 px-4 py-2 font-medium">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-400">Integration-ready architecture. API/integration capability available as the product develops.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">See CloseLoop handle a real inbox.</h2>
        <p className="mt-3 text-slate-600">Explore the seeded demo environment — no login required.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={enterDemo} data-testid="cta-view-demo" className="inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors">View Live Demo <ArrowRight className="h-4 w-4" /></button>
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 transition-colors">Request a Demo</Link>
        </div>
      </section>
    </PublicLayout>
  );
}

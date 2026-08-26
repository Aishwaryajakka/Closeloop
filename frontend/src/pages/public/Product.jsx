import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { ArrowRight, ArrowDown } from "lucide-react";

const FLOW = [
  "Resident Interaction",
  "CloseLoop Intelligence",
  "Understand Intent",
  "RESOLVE | ACTION | REVIEW",
  "Route / Respond / Escalate",
  "Track Resolution",
  "Detect Repeat or Failed Resolution",
];

export default function Product() {
  const enterDemo = useDemoEntry();
  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Product · How It Works</p>
        <h1 className="mt-4 font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          An intelligence layer for resident operations.
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl leading-relaxed">
          CloseLoop can be your resident request experience or the intelligence layer behind the systems your residents already use. Either way, every message follows the same path to resolution.
        </p>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900 text-center">The intelligence flow</h2>
          <div className="mt-8 flex flex-col items-center gap-2">
            {FLOW.map((f, i) => (
              <React.Fragment key={f}>
                <div className={`w-full max-w-md text-center rounded-xl border px-5 py-3 font-semibold ${i === 3 ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-800"}`}>{f}</div>
                {i < FLOW.length - 1 && <ArrowDown className="h-4 w-4 text-slate-400" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900">Two ways to run it</h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="font-heading font-bold text-slate-900">Standalone</p>
                <p className="mt-1.5 text-sm text-slate-600">Use the CloseLoop resident request experience directly — no other software required.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="font-heading font-bold text-slate-900">Alongside existing systems</p>
                <p className="mt-1.5 text-sm text-slate-600">Already have a resident portal, PMS, or maintenance system? Keep it. CloseLoop is positioned to sit behind existing workflows as the intelligence and resolution layer.</p>
                <p className="mt-2 text-xs text-slate-400">Integration-ready architecture — API/integration capability available as the product develops.</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-slate-900">What CloseLoop understands</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              {["Resident intent, category, and desired outcome", "Approved property knowledge and documents", "Repeat complaints and failed resolutions", "Emergencies and policy conflicts", "Human Attention Score for every issue", "Whether the resident's problem was actually resolved"].map((t) => (
                <li key={t} className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-700 shrink-0" /> {t}</li>
              ))}
            </ul>
            <button onClick={enterDemo} className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors">See it live <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

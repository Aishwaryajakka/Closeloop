import React from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import { Check } from "lucide-react";

function Tier({ name, price, unit, tagline, features, cta, ctaTo, ctaAction, secondary, popular, note }) {
  return (
    <div data-testid={`tier-${name.toLowerCase()}`} className={`relative rounded-2xl border p-6 flex flex-col ${popular ? "border-brand-700 shadow-lg ring-1 ring-brand-700" : "border-slate-200 shadow-sm"}`}>
      {popular && <span className="absolute -top-3 left-6 rounded-full bg-brand-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">Most Popular</span>}
      <p className="font-heading text-lg font-extrabold tracking-tight text-slate-900">{name}</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">{price}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      <p className="mt-2 text-sm text-slate-600 min-h-[40px]">{tagline}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-slate-700 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {f}</li>
        ))}
      </ul>
      {ctaAction ? (
        <button onClick={ctaAction} className={`mt-6 w-full text-center rounded-full font-semibold py-3 transition-colors ${popular ? "bg-brand-700 hover:bg-brand-800 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-800"}`}>{cta}</button>
      ) : (
        <Link to={ctaTo} className={`mt-6 w-full text-center rounded-full font-semibold py-3 transition-colors ${popular ? "bg-brand-700 hover:bg-brand-800 text-white" : "border border-slate-200 hover:bg-slate-50 text-slate-800"}`}>{cta}</Link>
      )}
      {secondary && <Link to="/contact" className="mt-2 w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-900">{secondary}</Link>}
      {note && <p className="mt-3 text-xs text-slate-400 text-center">{note}</p>}
    </div>
  );
}

export default function Pricing() {
  const enterDemo = useDemoEntry();
  return (
    <PublicLayout>
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Pricing</p>
        <h1 className="mt-4 font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">Simple plans that scale with your property.</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">Start with CloseLoop directly or add it alongside your existing resident operations stack.</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          <Tier name="Free" price="$0" unit="/month" tagline="For independent properties and teams exploring CloseLoop."
            features={["1 property", "Up to 50 resident interactions / month", "Resident request portal", "AI request understanding", "RESOLVE / ACTION / REVIEW", "Basic property knowledge & routing", "Staff dashboard", "Basic analytics"]}
            cta="Start Free" ctaAction={enterDemo} note="No credit card required" />
          <Tier name="Standard" price="$149" unit="/property/month" popular tagline="For professional property teams using CloseLoop in daily resident operations."
            features={["Everything in Free, plus:", "Up to 1,000 interactions / month", "Resolution Memory", "Repeat complaint detection", "Failed-resolution detection", "Resident-confirmed resolution", "Human Attention Score", "Advanced knowledge & analytics", "Multiple staff/team workflows", "Priority support", "Integration/API capability for existing systems"]}
            cta="Start Standard" ctaTo="/contact" secondary="Request Demo" />
          <Tier name="Portfolio" price="Custom" tagline="For large properties, management companies, and multi-property operators."
            features={["Everything in Standard, plus:", "Multiple properties", "Custom interaction volume", "Portfolio-wide dashboard", "Cross-property analytics", "Centralized property & knowledge management", "Advanced roles and permissions", "Custom workflows", "Integration & API/webhook capability where supported", "Onboarding & priority support"]}
            cta="Contact Sales" ctaTo="/contact" note="Custom plans based on portfolio size, units, usage, and integration requirements." />
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <h2 className="font-heading text-xl font-extrabold tracking-tight text-slate-900">Already have a resident portal?</h2>
          <p className="mt-1.5 font-semibold text-slate-700">You don't have to replace it.</p>
          <p className="mt-3 text-sm text-slate-600 max-w-2xl mx-auto">Standard and Portfolio are designed to support operators that want CloseLoop's intelligence and Resolution Memory alongside their existing technology stack.</p>
        </div>
      </section>
    </PublicLayout>
  );
}

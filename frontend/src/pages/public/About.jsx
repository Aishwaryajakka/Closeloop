import React from "react";
import PublicLayout from "@/components/PublicLayout";

export default function About() {
  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">About</p>
        <h1 className="mt-4 font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">Resident operations should end in resolution.</h1>
        <p className="mt-6 text-lg text-slate-600 leading-relaxed">
          Property teams manage resident interactions across portals, email, front desks, maintenance systems, and internal teams. The challenge isn't receiving another request — it's understanding what the resident needs, getting it to the right place, and knowing whether the problem was actually solved.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="font-heading text-2xl font-extrabold tracking-tight text-slate-900">A closed ticket doesn't always mean a resolved resident.</p>
        </div>
        <p className="mt-8 text-slate-600 leading-relaxed">CloseLoop combines:</p>
        <ul className="mt-4 space-y-2.5 text-slate-700">
          {["AI request understanding", "Property knowledge", "Intelligent routing", "Resolution Memory", "Resident confirmation", "Human judgment"].map((t) => (
            <li key={t} className="flex items-start gap-2.5"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-700 shrink-0" /> {t}</li>
          ))}
        </ul>
        <p className="mt-6 text-slate-600 leading-relaxed">— to help property teams close the communication and resolution loop.</p>
      </section>
    </PublicLayout>
  );
}

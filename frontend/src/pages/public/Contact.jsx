import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { useDemoEntry } from "@/lib/useDemoEntry";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const INTERESTS = [
  "Using CloseLoop as our resident request portal",
  "Adding CloseLoop to our existing resident portal",
  "Multi-property / Portfolio deployment",
  "Integrations / API",
  "Just exploring",
];

const inputCls = "mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-1";
const labelCls = "text-sm font-medium text-slate-700";

export default function Contact() {
  const enterDemo = useDemoEntry();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", work_email: "", company: "", job_title: "", num_properties: "", approx_units: "", current_platform: "", interest: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.work_email.trim() || !form.company.trim()) {
      toast.error("Please fill in your name, work email and company.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/leads", form);
      setDone(true);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-16">
        {done ? (
          <div data-testid="contact-success" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-slate-900">Thanks — we've received your request.</h1>
            <p className="mt-3 text-slate-600">We'll be in touch about CloseLoop. In the meantime, you can explore the live demo.</p>
            <button data-testid="success-view-demo" onClick={enterDemo} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 transition-colors">View Demo <ArrowRight className="h-4 w-4" /></button>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Request a Demo</p>
            <h1 className="mt-4 font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">See CloseLoop in action</h1>
            <p className="mt-4 text-lg text-slate-600">Tell us a little about your property or portfolio and we'll show you how CloseLoop could fit into your resident operations.</p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full name *</label>
                  <input data-testid="lead-name" className={inputCls} value={form.name} onChange={set("name")} placeholder="Maria Garcia" />
                </div>
                <div>
                  <label className={labelCls}>Work email *</label>
                  <input data-testid="lead-email" type="email" className={inputCls} value={form.work_email} onChange={set("work_email")} placeholder="maria@property.com" />
                </div>
                <div>
                  <label className={labelCls}>Company / Property *</label>
                  <input data-testid="lead-company" className={inputCls} value={form.company} onChange={set("company")} placeholder="Riverside Residences" />
                </div>
                <div>
                  <label className={labelCls}>Job title</label>
                  <input data-testid="lead-title" className={inputCls} value={form.job_title} onChange={set("job_title")} placeholder="Property Manager" />
                </div>
                <div>
                  <label className={labelCls}>Number of properties</label>
                  <input data-testid="lead-properties" className={inputCls} value={form.num_properties} onChange={set("num_properties")} placeholder="e.g. 3" />
                </div>
                <div>
                  <label className={labelCls}>Approximate number of units</label>
                  <input data-testid="lead-units" className={inputCls} value={form.approx_units} onChange={set("approx_units")} placeholder="e.g. 450" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Current resident/property-management platform</label>
                  <input data-testid="lead-platform" className={inputCls} value={form.current_platform} onChange={set("current_platform")} placeholder="e.g. we use email + spreadsheets" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>What are you interested in?</label>
                  <Select value={form.interest} onValueChange={(v) => setForm((f) => ({ ...f, interest: v }))}>
                    <SelectTrigger data-testid="lead-interest" className="mt-1.5 rounded-lg"><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>
                      {INTERESTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Message</label>
                  <textarea data-testid="lead-message" rows={3} className={`${inputCls} resize-none`} value={form.message} onChange={set("message")} placeholder="Anything you'd like us to know…" />
                </div>
              </div>

              <button data-testid="lead-submit" onClick={submit} disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-semibold py-3 transition-colors">
                {submitting ? "Sending…" : "Request a Demo"} <ArrowRight className="h-4 w-4" />
              </button>
              <button data-testid="explore-demo-instead" onClick={enterDemo} className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                Explore the live demo instead →
              </button>
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}

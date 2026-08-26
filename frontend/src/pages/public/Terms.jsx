import React from "react";
import PublicLayout from "@/components/PublicLayout";

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <h2 className="font-heading text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function Terms() {
  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Terms of Use</h1>
        <p className="mt-3 text-sm text-slate-500">These terms apply to the current demo-stage CloseLoop product.</p>

        <Section title="Acceptance">
          <p>By accessing or using CloseLoop, you agree to these terms. If you do not agree, do not use the service.</p>
        </Section>
        <Section title="Permitted use & accounts">
          <p>You may use CloseLoop only for lawful resident-operations purposes. Staff access requires authentication; you are responsible for activity under your account.</p>
        </Section>
        <Section title="Demo environment">
          <p>CloseLoop provides a seeded demo environment for evaluation. Demo data is illustrative, may be reset at any time, and should not be treated as production data.</p>
        </Section>
        <Section title="User-submitted information & acceptable use">
          <p>You are responsible for information you submit. You agree not to misuse the service, attempt to disrupt it, or submit unlawful, harmful, or infringing content.</p>
        </Section>
        <Section title="Availability">
          <p>The service is provided on an as-available basis. We may modify, suspend, or discontinue features at any time, particularly during this demo stage.</p>
        </Section>
        <Section title="Intellectual property">
          <p>CloseLoop and its associated software, design, and content are owned by CloseLoop. These terms do not grant you ownership of the service.</p>
        </Section>
        <Section title="Third-party services">
          <p>CloseLoop relies on third-party infrastructure and AI processing. Their availability and behavior are outside our direct control.</p>
        </Section>
        <Section title="Disclaimers & limitation of liability">
          <p>The service is provided "as is" without warranties of any kind. To the maximum extent permitted, CloseLoop is not liable for indirect or consequential damages arising from use of the service.</p>
        </Section>
        <Section title="Changes & contact">
          <p>We may update these terms from time to time. Questions can be sent through the CloseLoop Contact page.</p>
        </Section>
      </section>
    </PublicLayout>
  );
}

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

export default function Privacy() {
  return (
    <PublicLayout>
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-500">This policy describes how CloseLoop handles information in its current demo-stage product. It is provided for transparency and does not constitute a legal guarantee.</p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          CloseLoop is currently a demo-stage product. Some functionality shown is a demonstration and may differ from a full production deployment.
        </div>

        <Section title="Information we handle">
          <p>Depending on how CloseLoop is used, we may process: resident-submitted request information; staff/account information used to sign in; property request and issue information; uploaded property documents; contact/demo request information; and technical/usage information such as basic logs.</p>
        </Section>
        <Section title="How we use information">
          <p>To understand and route resident requests, answer questions from approved property knowledge, track resolution, operate and secure the service, respond to demo requests, and improve the product.</p>
        </Section>
        <Section title="Service providers">
          <p>We use third-party infrastructure and AI processing providers to operate CloseLoop. These providers process information on our behalf to deliver the service.</p>
        </Section>
        <Section title="Security">
          <p>We take reasonable measures to protect information. No method of transmission or storage is completely secure, and we do not claim any specific certification or standard at this stage.</p>
        </Section>
        <Section title="Retention">
          <p>We retain information for as long as needed to provide the service and for legitimate operational purposes. Demo data may be reset periodically.</p>
        </Section>
        <Section title="Your choices">
          <p>You may request access to or deletion of information you have submitted by contacting us through the Contact page.</p>
        </Section>
        <Section title="Contact">
          <p>Questions about this policy can be sent through the CloseLoop Contact page.</p>
        </Section>
      </section>
    </PublicLayout>
  );
}

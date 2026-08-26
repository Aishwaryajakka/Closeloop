import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, User, Wrench, Cog, Sparkles, AlertTriangle, Info, ShieldAlert, FileText, ArrowRight, CheckCircle2, RotateCcw, Clock } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { STATUS_META, LANE_META, PRIORITY_META, STATUSES, LANES, PRIORITIES, fmtDate } from "@/lib/constants";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function AiField({ label, value, full, testid }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p data-testid={testid} className="text-sm font-medium text-slate-800 capitalize">{value || "—"}</p>
    </div>
  );
}

function Pill({ meta }) {
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
      {meta.dot && <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />}{meta.label}
    </span>
  );
}

function scoreCls(s) {
  if (s >= 80) return "bg-red-100 text-red-700";
  if (s >= 50) return "bg-amber-100 text-amber-700";
  if (s >= 25) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

// Subtle left-edge accent for the Staff Review Brief, keyed to issue state.
function briefAccent(issue) {
  if (issue.is_emergency || issue.failed_resolution || issue.status === "reopened") return "border-l-red-500";
  if (issue.lane === "REVIEW") return "border-l-amber-500";
  if (issue.lane === "RESOLVE") return "border-l-teal-500";
  if (issue.lane === "ACTION") return "border-l-blue-500";
  return "border-l-slate-300";
}

function TimelineItem({ item }) {
  const isResident = item.sender === "resident";
  const isSystem = item.sender === "system";
  const isAi = item.sender === "ai";
  const Icon = isResident ? User : isAi ? Sparkles : isSystem ? Cog : Wrench;
  const senderLabel = isAi ? "Auto-response" : item.sender;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isResident ? "bg-slate-900 text-white" : isAi ? "bg-emerald-100 text-emerald-700" : isSystem ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <div className="w-px flex-1 bg-slate-200 my-1" />
      </div>
      <div className="pb-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 capitalize">{senderLabel}</span>
          <span className="text-xs text-slate-400">{fmtDate(item.created_at)}</span>
        </div>
        <p className={`mt-0.5 text-sm ${isSystem ? "text-slate-500 italic" : "text-slate-700"}`}>{item.message}</p>
      </div>
    </div>
  );
}

function SectionLabel({ children, Icon, accent }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {Icon && <Icon className={`h-3.5 w-3.5 ${accent || "text-slate-400"}`} strokeWidth={2} />}
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</p>
    </div>
  );
}

export default function IssueDetailSheet({ issueId, open, onOpenChange, onUpdated }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [config, setConfig] = useState(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    api.get("/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const r = await api.get(`/issues/${issueId}`);
      setIssue(r.data);
      setDraftAnswer(r.data.suggested_response || "");
    } catch (e) {
      toast.error("Failed to load issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && issueId) load();
    // eslint-disable-next-line
  }, [open, issueId]);

  const patch = async (payload) => {
    try {
      const r = await api.patch(`/issues/${issueId}`, payload);
      setIssue((prev) => ({ ...r.data, interactions: prev?.interactions || [] }));
      toast.success("Issue updated.");
      await load();
      onUpdated && onUpdated();
    } catch (e) {
      toast.error("Update failed.");
    }
  };

  const approveAnswer = async () => {
    if (!draftAnswer.trim()) { toast.error("Answer cannot be empty."); return; }
    setApproving(true);
    try {
      await api.post(`/issues/${issueId}/approve-answer`, { answer: draftAnswer.trim() });
      toast.success("Answer approved and sent to the resident.");
      await load();
      onUpdated && onUpdated();
    } catch (e) {
      toast.error("Could not send the answer.");
    } finally {
      setApproving(false);
    }
  };

  const sendMessage = async () => {
    if (!reply.trim()) return;
    try {
      await api.post(`/issues/${issueId}/message`, { message: reply.trim() });
      setReply("");
      await load();
    } catch (e) {
      toast.error("Failed to send message.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="issue-detail-sheet" className="w-full sm:max-w-[520px] p-0 flex flex-col gap-0">
        <SheetTitle className="sr-only">Issue details</SheetTitle>
        <SheetDescription className="sr-only">Resident issue detail, AI understanding and interaction history</SheetDescription>
        {loading || !issue ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* HEADER */}
            <SheetHeader className="shrink-0 px-5 py-4 border-b border-slate-200 space-y-0 text-left bg-white">
              <div className="flex items-baseline gap-2 pr-8">
                <span className="font-mono text-lg font-bold text-slate-900">Unit {issue.unit}</span>
                <span className="text-slate-600 text-sm truncate">{issue.resident_name}</span>
                {issue.status === "reopened" && (
                  <span data-testid="reopened-chip" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                    <RotateCcw className="h-2.5 w-2.5" /> Reopened
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-500 capitalize">{issue.category || "General request"}</p>
              <p className="text-sm text-slate-600 pt-1">{issue.description}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
                <Pill meta={PRIORITY_META[issue.priority]} />
                <Pill meta={LANE_META[issue.lane]} />
                <Pill meta={STATUS_META[issue.status]} />
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" /> {fmtDate(issue.created_at)}</span>
              </div>
            </SheetHeader>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Emergency */}
              {issue.is_emergency && (
                <div data-testid="emergency-banner" className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Emergency — P0 · requires human review</p>
                    <p className="text-xs text-red-700 mt-0.5">Escalated automatically. AI surfaces approved procedures only; a staff member must handle high-risk decisions.</p>
                  </div>
                </div>
              )}

              {/* RESOLUTION MEMORY — previous resolution failed */}
              {issue.failed_resolution && (
                <div data-testid="failed-resolution-banner" className="rounded-lg border border-red-300 bg-white overflow-hidden">
                  <div className="bg-red-600 text-white px-3.5 py-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-sm font-extrabold tracking-wide">PREVIOUS RESOLUTION FAILED</p>
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 border border-teal-200 px-2 py-1 text-teal-700 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Resolved {fmtDate(issue.previous_resolved_at)}</span>
                      <ArrowRight className="h-4 w-4 text-red-400 shrink-0" />
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1 text-red-700 font-semibold"><RotateCcw className="h-3.5 w-3.5" /> Reopened by resident</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-600">
                      <div>Original report: <span className="font-semibold text-slate-900">{fmtDate(issue.first_reported_at || issue.created_at)}</span></div>
                      <div>Resident contacts: <span className="font-semibold text-slate-900">{issue.contact_count || 1}</span></div>
                      <div>Resolution attempts: <span className="font-semibold text-slate-900">{issue.resolution_attempts || 0}</span></div>
                      <div>Same issue, not a duplicate</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Repeat complaint */}
              {issue.repeat_complaint && (
                <div data-testid="repeat-complaint-banner" className="rounded-lg border border-red-200 bg-red-50 p-3.5">
                  <p className="text-sm font-bold text-red-800">Repeat complaint</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-red-900">
                    <div>First contact: <span className="font-medium">{fmtDate(issue.repeat_complaint.first_contact)}</span></div>
                    <div>Contact count: <span className="font-medium">{issue.repeat_complaint.contact_count}</span></div>
                    <div>Current sentiment: <span className="font-medium capitalize">{issue.repeat_complaint.current_sentiment || "—"}</span></div>
                    <div>Prior fix accepted: <span className="font-medium">{issue.repeat_complaint.intervention_worked ? "Yes, then failed" : "No"}</span></div>
                  </div>
                  {issue.repeat_complaint.previous_actions?.length > 0 && (
                    <p className="mt-2 text-xs text-red-700">Previous actions: {issue.repeat_complaint.previous_actions.join(" · ")}</p>
                  )}
                </div>
              )}

              {/* Policy conflict */}
              {issue.policy_conflict && (
                <div data-testid="policy-conflict-banner" className="rounded-lg border border-red-300 bg-red-50 p-3.5">
                  <p className="text-sm font-bold text-red-800">Review — policy conflict</p>
                  <p className="text-sm text-red-900 mt-1">Uploaded property documents give conflicting rules. Staff must resolve the conflict before answering.</p>
                  {issue.conflicting_documents?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {issue.conflicting_documents.map((d, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800"><FileText className="h-3 w-3" /> {d}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STAFF REVIEW BRIEF — first content block */}
              {issue.lane === "REVIEW" && issue.review_summary && (
                <div data-testid="review-outcome" className={`rounded-lg border border-slate-200 border-l-4 ${briefAccent(issue)} bg-white p-3.5`}>
                  <SectionLabel Icon={AlertTriangle} accent="text-amber-500">Staff Review Brief</SectionLabel>
                  <dl className="space-y-2.5">
                    {[
                      ["What happened", issue.review_summary.what_happened],
                      ["Why a human is needed", issue.review_summary.why_human_needed],
                      ["Suggested next action", issue.review_summary.suggested_next_action],
                      ["What the resident wants", issue.review_summary.resident_wants],
                      ["Relevant history", issue.review_summary.relevant_history],
                      ["Relevant policy", issue.review_summary.relevant_policy],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k}</dt>
                        <dd className="text-sm text-slate-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {issue.review_policy_source && issue.review_policy_source.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {issue.review_policy_source.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          <FileText className="h-3 w-3" /> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Suggested response (approve) */}
              {issue.suggested_response && (
                <div data-testid="suggested-response" className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3.5">
                  <SectionLabel Icon={Sparkles} accent="text-indigo-500">Suggested response — review, edit &amp; approve</SectionLabel>
                  <textarea data-testid="approve-answer-input" value={draftAnswer} onChange={(e) => setDraftAnswer(e.target.value)} rows={3}
                    className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1" />
                  {issue.answer_source && <p className="text-xs text-indigo-700 mt-1.5">Source: {issue.answer_source}{issue.answer_confidence ? ` · confidence ${issue.answer_confidence}` : ""}</p>}
                  <button data-testid="approve-answer-btn" onClick={approveAnswer} disabled={approving}
                    className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 transition-colors duration-200">
                    <CheckCircle2 className="h-4 w-4" /> {approving ? "Sending…" : "Approve & Send to Resident"}
                  </button>
                </div>
              )}

              {/* Resolve outcome */}
              {issue.lane === "RESOLVE" && issue.auto_response && (
                <div data-testid="resolve-outcome" className="rounded-lg border border-teal-200 bg-teal-50/60 p-3.5">
                  <SectionLabel Icon={CheckCircle2} accent="text-teal-600">Auto-resolved from documents</SectionLabel>
                  <p className="text-sm text-slate-800">{issue.auto_response}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    {issue.answer_source && (
                      <span data-testid="resolve-source" className="inline-flex items-center gap-1.5 rounded-full bg-white border border-teal-200 px-2.5 py-0.5 font-medium text-teal-800">
                        <FileText className="h-3 w-3" /> {issue.answer_source}
                      </span>
                    )}
                    {issue.answer_confidence && (
                      <span data-testid="resolve-confidence" className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 font-medium text-slate-600 capitalize">
                        Confidence: {issue.answer_confidence}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action outcome */}
              {issue.lane === "ACTION" && issue.assigned_team && (
                <div data-testid="action-outcome" className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5">
                  <SectionLabel Icon={ArrowRight} accent="text-blue-600">Auto-routed</SectionLabel>
                  <p className="text-sm text-slate-800">Routed to <span className="font-semibold">{issue.assigned_team}</span></p>
                  {issue.acknowledgement && <p className="mt-1 text-sm text-slate-600 italic">"{issue.acknowledgement}"</p>}
                </div>
              )}

              {/* AI Understanding */}
              <div data-testid="ai-understanding" className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-5 rounded-md bg-slate-900 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">AI Understanding</p>
                  {issue.ai_analyzed === false && (
                    <span className="text-xs text-slate-400" data-testid="ai-not-analyzed">not analyzed</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
                  <AiField label="Intent" value={issue.primary_intent} testid="ai-intent" />
                  <AiField label="Category" value={issue.category} testid="ai-category" />
                  <AiField label="Desired Outcome" value={issue.desired_outcome} testid="ai-outcome" full />
                  <AiField label="Priority" value={issue.priority} testid="ai-priority" />
                  <AiField label="Sentiment" value={issue.sentiment} testid="ai-sentiment" />
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Key Entities</p>
                    {issue.entities && issue.entities.length ? (
                      <div className="flex flex-wrap gap-1.5" data-testid="ai-entities">
                        {issue.entities.map((e, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">{e}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">—</p>
                    )}
                  </div>
                </div>
                <div
                  data-testid="ai-human-judgment"
                  className={`mt-3 rounded-md border p-2.5 ${issue.human_judgment_required ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}
                >
                  <div className="flex items-center gap-2">
                    {issue.human_judgment_required
                      ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                      : <Info className="h-4 w-4 text-slate-400" />}
                    <p className="text-sm font-semibold text-slate-800">
                      Human judgment {issue.human_judgment_required ? "required" : "not required"}
                    </p>
                  </div>
                  {issue.human_reason && <p className="mt-1 text-sm text-slate-600">{issue.human_reason}</p>}
                </div>
              </div>

              {/* Human Attention Score */}
              {typeof issue.human_attention_score === "number" && (
                <div data-testid="attention-score" className="rounded-lg border border-slate-200 bg-white p-3.5 flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center font-heading font-extrabold text-lg ${scoreCls(issue.human_attention_score)}`}>{issue.human_attention_score}</div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Human Attention Score</p>
                    <p className="text-sm text-slate-600 mt-0.5">{(issue.attention_reasons || []).join(" · ") || "Routine request"}</p>
                  </div>
                </div>
              )}

              {/* Similar previous cases */}
              {issue.similar_cases?.length > 0 && (
                <div data-testid="similar-cases" className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <SectionLabel Icon={FileText}>Similar previous cases</SectionLabel>
                  <div className="space-y-2">
                    {issue.similar_cases.map((c, i) => (
                      <div key={i} className="rounded-md border border-slate-100 p-2.5">
                        <p className="text-sm text-slate-800">{c.issue}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Answer: {c.previous_answer}</p>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">Outcome: {c.outcome}{c.resident_confirmed ? " · resident-confirmed" : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interaction History */}
              <div>
                <SectionLabel Icon={Clock}>Interaction history</SectionLabel>
                <div data-testid="interaction-timeline">
                  {(issue.interactions || []).map((it) => (
                    <TimelineItem key={it.id} item={it} />
                  ))}
                </div>
              </div>

              {/* Manage */}
              <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                <SectionLabel Icon={Cog}>Manage issue</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <Select value={issue.status} onValueChange={(v) => patch({ status: v })}>
                      <SelectTrigger data-testid="status-select" className="rounded-lg h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (<SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Priority">
                    <Select value={issue.priority} onValueChange={(v) => patch({ priority: v })}>
                      <SelectTrigger data-testid="priority-select" className="rounded-lg h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Lane">
                    <Select value={issue.lane} onValueChange={(v) => patch({ lane: v })}>
                      <SelectTrigger data-testid="lane-select" className="rounded-lg h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANES.map((l) => (<SelectItem key={l} value={l}>{LANE_META[l].label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Assigned Team">
                    <Select value={issue.assigned_team || "unassigned"} onValueChange={(v) => patch({ assigned_team: v === "unassigned" ? "" : v })}>
                      <SelectTrigger data-testid="team-select" className="rounded-lg h-9"><SelectValue placeholder="Assign a team" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {(config?.teams || []).map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>

            {/* STICKY ACTION BAR */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-3">
              <div className="flex gap-2">
                <input
                  data-testid="staff-message-input"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                  placeholder="Add a message to the thread…"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                />
                <button
                  data-testid="send-staff-message-btn"
                  onClick={sendMessage}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white transition-colors duration-200"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

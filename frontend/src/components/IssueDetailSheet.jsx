import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send, User, Wrench, Cog } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { STATUS_META, LANE_META, PRIORITY_META, STATUSES, LANES, PRIORITIES, fmtDate } from "@/lib/constants";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TimelineItem({ item }) {
  const isResident = item.sender === "resident";
  const isSystem = item.sender === "system";
  const Icon = isResident ? User : isSystem ? Cog : Wrench;
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="flex flex-col items-center">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isResident ? "bg-slate-900 text-white" : isSystem ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-px flex-1 bg-slate-200 my-1" />
      </div>
      <div className="pb-5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 capitalize">{item.sender}</span>
          <span className="text-xs text-slate-400">{fmtDate(item.created_at)}</span>
        </div>
        <p className={`mt-1 text-sm ${isSystem ? "text-slate-500 italic" : "text-slate-700"}`}>{item.message}</p>
      </div>
    </div>
  );
}

export default function IssueDetailSheet({ issueId, open, onOpenChange, onUpdated }) {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get("/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const r = await api.get(`/issues/${issueId}`);
      setIssue(r.data);
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
      <SheetContent data-testid="issue-detail-sheet" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetTitle className="sr-only">Issue details</SheetTitle>
        {loading || !issue ? (
          <div className="h-full flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 border-b border-slate-200 space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">Unit {issue.unit}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600">{issue.resident_name}</span>
              </div>
              <h2 className="font-heading text-lg font-bold text-slate-900">
                {issue.category || "General Request"}
              </h2>              <p className="text-sm text-slate-600">{issue.description}</p>
            </SheetHeader>

            <div className="p-6 space-y-5">
              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <Select value={issue.status} onValueChange={(v) => patch({ status: v })}>
                    <SelectTrigger data-testid="status-select" className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Priority">
                  <Select value={issue.priority} onValueChange={(v) => patch({ priority: v })}>
                    <SelectTrigger data-testid="priority-select" className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Lane">
                  <Select value={issue.lane} onValueChange={(v) => patch({ lane: v })}>
                    <SelectTrigger data-testid="lane-select" className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANES.map((l) => (
                        <SelectItem key={l} value={l}>{LANE_META[l].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Assigned Team">
                  <Select value={issue.assigned_team || "unassigned"} onValueChange={(v) => patch({ assigned_team: v === "unassigned" ? "" : v })}>
                    <SelectTrigger data-testid="team-select" className="rounded-lg">
                      <SelectValue placeholder="Assign a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {(config?.teams || []).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Meta badges */}
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[issue.status].cls}`}>{STATUS_META[issue.status].label}</span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_META[issue.priority].cls}`}>{PRIORITY_META[issue.priority].label}</span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${LANE_META[issue.lane].cls}`}>{LANE_META[issue.lane].label}</span>
                <span className="text-xs text-slate-400 ml-auto">Created {fmtDate(issue.created_at)}</span>
              </div>

              {/* Timeline */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Interaction History</p>
                <div data-testid="interaction-timeline">
                  {(issue.interactions || []).map((it) => (
                    <TimelineItem key={it.id} item={it} />
                  ))}
                </div>
              </div>

              {/* Staff reply */}
              <div className="sticky bottom-0 bg-white pt-3 border-t border-slate-200">
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
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

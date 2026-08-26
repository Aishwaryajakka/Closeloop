import React, { useEffect, useState } from "react";
import StaffLayout from "@/components/StaffLayout";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { fmtDate } from "@/lib/constants";
import { Inbox, Mail, Lock } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const STATUS_OPTS = ["New", "Contacted", "Qualified", "Closed"];
const STATUS_CLS = {
  New: "bg-blue-100 text-blue-800 border-blue-200",
  Contacted: "bg-amber-100 text-amber-800 border-amber-200",
  Qualified: "bg-violet-100 text-violet-800 border-violet-200",
  Closed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function AdminLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/leads");
      setLeads(r.data);
    } catch (e) {
      toast.error(e?.response?.status === 403 ? "Demo viewers cannot access leads." : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!user?.is_demo) load(); else setLoading(false); }, [user]);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/leads/${id}`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success("Lead updated.");
    } catch (e) {
      toast.error("Update failed.");
    }
  };

  return (
    <StaffLayout title="Demo Requests">
      <div className="p-6 md:p-8 space-y-4">
        {user?.is_demo ? (
          <div data-testid="leads-demo-blocked" className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Lock className="h-8 w-8 mx-auto mb-3 text-slate-300" />
            <p className="font-heading font-bold text-slate-700">Available to staff accounts only</p>
            <p className="mt-1 text-sm text-slate-500">Demo requests contain private lead information and are hidden in the demo environment.</p>
          </div>
        ) : (
        <>
        <p className="text-slate-500 -mt-1">Leads captured from the public Request a Demo form.</p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200">
                  {["Name", "Work Email", "Company", "Properties / Units", "Interest", "Submitted", "Status"].map((h) => (
                    <TableHead key={h} className="text-xs font-bold uppercase tracking-widest text-slate-400">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400">Loading…</TableCell></TableRow>
                ) : leads.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400"><Inbox className="h-8 w-8 mx-auto mb-3 text-slate-300" /><p className="font-heading font-semibold text-slate-500">No demo requests yet</p></TableCell></TableRow>
                ) : (
                  leads.map((l) => (
                    <TableRow key={l.id} data-testid={`lead-row-${l.id}`} className="border-slate-100">
                      <TableCell className="font-semibold text-slate-900">{l.name}</TableCell>
                      <TableCell className="text-slate-600"><a href={`mailto:${l.work_email}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Mail className="h-3.5 w-3.5" />{l.work_email}</a></TableCell>
                      <TableCell className="text-slate-700">{l.company}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{[l.num_properties && `${l.num_properties} prop`, l.approx_units && `${l.approx_units} units`].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell className="text-slate-600 text-sm max-w-[220px] truncate">{l.interest || "—"}</TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">{fmtDate(l.submitted_at)}</TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => setStatus(l.id, v)}>
                          <SelectTrigger data-testid={`lead-status-${l.id}`} className={`h-8 w-[130px] rounded-full border text-xs font-semibold ${STATUS_CLS[l.status] || ""}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        </>
        )}
      </div>
    </StaffLayout>
  );
}

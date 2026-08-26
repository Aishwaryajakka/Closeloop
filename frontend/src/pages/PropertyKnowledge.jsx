import React, { useEffect, useState } from "react";
import StaffLayout from "@/components/StaffLayout";
import api from "@/lib/api";
import { API } from "@/lib/api";
import { toast } from "sonner";
import { fmtDate } from "@/lib/constants";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, RefreshCw, Trash2, Download, Loader2, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const STATUS_META = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock },
  processing: { label: "Processing", cls: "bg-blue-100 text-blue-800 border-blue-200", icon: Loader2 },
  ready: { label: "Ready", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span data-testid={`doc-status-${status}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      <Icon className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} /> {meta.label}
    </span>
  );
}

export default function PropertyKnowledge() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docTypes, setDocTypes] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const replaceInputRef = React.useRef(null);
  const [replaceId, setReplaceId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, cfg] = await Promise.all([api.get("/documents"), api.get("/config")]);
      setDocs(d.data);
      setDocTypes(cfg.data.document_types || []);
    } catch (e) {
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitUpload = async () => {
    if (!file || !docType) {
      toast.error("Choose a file and a document type.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim() || file.name);
      fd.append("doc_type", docType);
      await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded and processed.");
      setUploadOpen(false);
      setName(""); setDocType(""); setFile(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const triggerReplace = (id) => {
    setReplaceId(id);
    replaceInputRef.current?.click();
  };

  const onReplaceFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !replaceId) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      await api.put(`/documents/${replaceId}/replace`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document replaced.");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Replace failed.");
    } finally {
      setBusy(false);
      setReplaceId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      toast.success("Document removed.");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error("Remove failed.");
    }
  };

  const download = (doc) => {
    window.open(`${API}/documents/${doc.id}/download`, "_blank");
  };

  const headerAction = (
    <div className="flex items-center gap-2">
      <button
        data-testid="refresh-docs-btn"
        onClick={load}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200"
      >
        <RefreshCw className="h-4 w-4" /> Refresh
      </button>
      <button
        data-testid="open-upload-btn"
        onClick={() => setUploadOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-sm font-semibold transition-colors duration-200"
      >
        <Plus className="h-4 w-4" /> Upload Document
      </button>
    </div>
  );

  return (
    <StaffLayout title="Property Knowledge" headerAction={headerAction}>
      <input ref={replaceInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={onReplaceFile} data-testid="replace-file-input" />

      <div className="p-6 md:p-8 space-y-6">
        <div className="max-w-3xl">
          <p className="text-base text-slate-600">
            Upload lease, handbook and policy documents for the property. Files are indexed and prepared so they can later power semantic answers to resident questions.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200">
                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Document Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Uploaded</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-16 text-slate-400">Loading documents…</TableCell></TableRow>
                ) : docs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-400">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      No documents yet. Upload your first policy document.
                    </TableCell>
                  </TableRow>
                ) : (
                  docs.map((doc) => (
                    <TableRow key={doc.id} data-testid={`doc-row-${doc.id}`} className="border-slate-100 hover:bg-slate-50 transition-colors duration-200">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{doc.name}</p>
                            <p className="text-xs text-slate-400 truncate">{doc.original_filename}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{doc.doc_type}</TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">{fmtDate(doc.uploaded_at)}</TableCell>
                      <TableCell><StatusBadge status={doc.processing_status} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button data-testid={`download-doc-${doc.id}`} onClick={() => download(doc)} title="Download" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200">
                            <Download className="h-4 w-4" />
                          </button>
                          <button data-testid={`replace-doc-${doc.id}`} onClick={() => triggerReplace(doc.id)} title="Replace" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button data-testid={`delete-doc-${doc.id}`} onClick={() => setDeleteTarget(doc)} title="Remove" className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent data-testid="upload-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Upload Document</DialogTitle>
            <DialogDescription>
              Add a lease or policy document (PDF, DOCX or TXT). It will be indexed for future semantic search.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Document Type</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger data-testid="upload-doctype-select" className="mt-1.5 rounded-lg">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Display Name <span className="text-slate-300 normal-case font-medium tracking-normal">(optional)</span></label>
              <input
                data-testid="upload-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2026 Pet Policy"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400">File</label>
              <label className="mt-1.5 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3.5 py-3 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors duration-200">
                <Upload className="h-4 w-4 text-slate-400" />
                <span className="truncate">{file ? file.name : "Choose PDF, DOCX or TXT"}</span>
                <input
                  data-testid="upload-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <button
              data-testid="submit-upload-btn"
              onClick={submitUpload}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold py-2.5 transition-colors duration-200"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Uploading…" : "Upload"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="delete-doc-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be removed from the knowledge base. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">Cancel</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-btn" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}

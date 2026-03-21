import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertTriangle, Trash2, Edit2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { appendLogEntry } from "./ActivityLog";

const FINAL_STATES = ["PAID", "REFUNDED", "CANCELED", "FAILED", "DELETED"];
const EDITABLE_STATES = ["DRAFT", "UNPAID"];

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-600",
  UNPAID: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  REFUNDED: "bg-purple-100 text-purple-700",
  CANCELED: "bg-red-100 text-red-600",
  FAILED: "bg-red-200 text-red-800",
  DELETED: "bg-gray-100 text-gray-400",
};

export default function InvoiceActionsSection({ record, onUpdate }) {
  const [invoiceStatus, setInvoiceStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editFields, setEditFields] = useState({ title: "", description: "", dueDate: "", amount: "" });

  const invoiceId = record.squareInvoiceId;

  useEffect(() => {
    if (!invoiceId) { setInvoiceStatus(null); return; }
    setLoading(true);
    // Fetch live invoice status via a lightweight approach — use intakePublishInvoice's GET pattern
    fetch(`/api/functions/intakeGetInvoiceStatus`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }) })
      .catch(() => null)
      .finally(() => setLoading(false));
    // We'll use the void function's GET as a proxy — actually just show stored id
    setLoading(false);
  }, [invoiceId]);

  async function fetchInvoiceStatus() {
    if (!invoiceId) return null;
    setLoading(true);
    try {
      // Use intakeVoidInvoice as a status checker by calling a dedicated status fetch
      // We'll call intakeUpdateInvoice with empty updates to get the invoice back
      const res = await base44.functions.invoke("intakeUpdateInvoice", { invoiceId, updates: {} });
      if (res.data?.updatedInvoice) {
        setInvoiceStatus(res.data.updatedInvoice.state);
        setEditFields(f => ({
          ...f,
          title: res.data.updatedInvoice.title || "",
          description: res.data.updatedInvoice.description || "",
          dueDate: res.data.updatedInvoice.payment_requests?.[0]?.due_date || "",
        }));
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (invoiceId) fetchInvoiceStatus();
  }, [invoiceId]);

  async function handleVoid() {
    setVoiding(true);
    setMsg(null);
    const res = await base44.functions.invoke("intakeVoidInvoice", { invoiceId, intakeId: record.id });
    if (res.data?.success) {
      const newLog = appendLogEntry(record.internalNotes, record.created_date, "Invoice voided", "Staff");
      await base44.entities.HotelTreatmentIntake.update(record.id, { squareInvoiceId: null, internalNotes: newLog });
      setMsg({ success: true, text: "Invoice voided ✓" });
      setShowVoidConfirm(false);
      setInvoiceStatus("DELETED");
      onUpdate();
    } else {
      setMsg({ success: false, text: res.data?.error || "Could not void invoice" });
    }
    setVoiding(false);
  }

  async function handleEditAndResend() {
    setSaving(true);
    setMsg(null);
    // 1. Update invoice
    const updateRes = await base44.functions.invoke("intakeUpdateInvoice", { invoiceId, updates: editFields });
    if (!updateRes.data?.success) {
      setMsg({ success: false, text: updateRes.data?.error || "Update failed" });
      setSaving(false);
      return;
    }
    // 2. Republish
    const pubRes = await base44.functions.invoke("intakePublishInvoice", { invoiceId });
    if (pubRes.data?.success || pubRes.data?.message) {
      const newLog = appendLogEntry(record.internalNotes, record.created_date, `Invoice updated and resent to ${record.email}`, "Staff");
      await base44.entities.HotelTreatmentIntake.update(record.id, { internalNotes: newLog });
      setMsg({ success: true, text: `Invoice updated and resent to ${record.email}` });
      setShowEditForm(false);
      onUpdate();
    } else {
      setMsg({ success: false, text: pubRes.data?.error || "Resend failed" });
    }
    setSaving(false);
  }

  if (!invoiceId) return null;

  const isFinal = invoiceStatus && FINAL_STATES.includes(invoiceStatus);
  const isEditable = !invoiceStatus || EDITABLE_STATES.includes(invoiceStatus);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase">Invoice</p>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[rgb(150,150,150)]">ID: {invoiceId.slice(0, 12)}…</span>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-[rgb(150,150,150)]" />
        ) : invoiceStatus ? (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[invoiceStatus] || "bg-gray-100 text-gray-500"}`}>
            {invoiceStatus}
          </span>
        ) : null}
      </div>

      {/* Void button */}
      {!isFinal && (
        <button
          onClick={() => setShowVoidConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Void Invoice
        </button>
      )}
      {isFinal && (
        <div className="text-xs text-[rgb(150,150,150)] italic px-1">
          This invoice is in a final state ({invoiceStatus}) and cannot be modified.
        </div>
      )}

      {/* Edit & Resend button */}
      {isEditable && !isFinal && (
        <button
          onClick={() => setShowEditForm(v => !v)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgb(150,170,155)] text-xs text-[rgb(80,120,90)] hover:bg-[rgb(245,250,246)] transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit & Resend Invoice
        </button>
      )}

      {/* Edit form */}
      {showEditForm && (
        <div className="border border-[rgb(235,225,213)] rounded-xl p-3 space-y-2 bg-[rgb(250,248,245)]">
          {invoiceStatus === "UNPAID" && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              The guest will receive an updated invoice email.
            </div>
          )}
          <div>
            <label className="text-[10px] text-[rgb(150,130,110)] font-medium">Title</label>
            <input
              value={editFields.title}
              onChange={e => setEditFields(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-[rgb(220,210,200)] rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-[rgb(150,130,110)] font-medium">Description</label>
            <textarea
              value={editFields.description}
              onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-[rgb(220,210,200)] rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[rgb(150,130,110)] font-medium">Due Date</label>
              <input
                type="date"
                value={editFields.dueDate}
                onChange={e => setEditFields(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-[rgb(220,210,200)] rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[rgb(150,130,110)] font-medium">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={editFields.amount}
                onChange={e => setEditFields(f => ({ ...f, amount: e.target.value }))}
                placeholder="Leave blank to keep"
                className="w-full border border-[rgb(220,210,200)] rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleEditAndResend}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-xs font-medium disabled:opacity-50 hover:bg-[rgb(85,65,45)] transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {saving ? "Saving & Resending…" : "Save & Resend to Guest"}
          </button>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div className={`text-xs rounded-xl border px-3 py-2 ${msg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Void confirmation modal */}
      {showVoidConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(45,45,45)]">Void This Invoice?</h3>
                <p className="text-xs text-[rgb(150,150,150)]">This will cancel or delete the invoice sent to {record.guestName}.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVoidConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-[rgb(220,210,200)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voiding}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
              >
                {voiding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {voiding ? "Voiding…" : "Yes, Void It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
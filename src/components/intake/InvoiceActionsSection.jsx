import React, { useState, useEffect } from "react";
import { Loader2, Trash2, Send, ExternalLink, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { appendLogEntry } from "./ActivityLog";

const FINAL_STATES = ["PAID", "REFUNDED", "CANCELED", "FAILED", "DELETED"];

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

const STATUS_LABELS = {
  DRAFT: "Draft",
  UNPAID: "Unpaid — awaiting payment",
  SCHEDULED: "Scheduled",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid ✓",
  REFUNDED: "Refunded",
  CANCELED: "Canceled",
  FAILED: "Failed",
  DELETED: "Voided",
};

export default function InvoiceActionsSection({ record, onUpdate }) {
  const invoiceId = record.squareInvoiceId;
  const [invoiceStatus, setInvoiceStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidInput, setVoidInput] = useState("");
  const [msg, setMsg] = useState(null);
  const [publicUrl, setPublicUrl] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    setLoading(true);
    base44.functions.invoke("squareInvoiceActions", { action: "get", invoiceId })
      .then(res => {
        if (res.data?.invoice?.status) setInvoiceStatus(res.data.invoice.status);
        if (res.data?.invoice?.public_url) setPublicUrl(res.data.invoice.public_url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [invoiceId]);

  async function handleRecordPayment() {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    setRecordingPayment(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("squareInvoiceActions", {
        action: "record_payment",
        invoiceId,
        amount: paymentAmount,
        paymentMethod,
        note: paymentNote || `${paymentMethod} payment recorded`,
      });
      if (res.data?.success) {
        const newLog = appendLogEntry(record.internalNotes, record.created_date, `Payment of $${paymentAmount} recorded (${paymentMethod})`, "Staff");
        await base44.entities.HotelTreatmentIntake.update(record.id, { internalNotes: newLog });
        setMsg({ success: true, text: `$${paymentAmount} payment recorded successfully` });
        setShowPaymentModal(false);
        setPaymentAmount(""); setPaymentNote(""); setPaymentMethod("CASH");
        // Refresh status
        const statusRes = await base44.functions.invoke("squareInvoiceActions", { action: "get", invoiceId });
        if (statusRes.data?.invoice?.status) setInvoiceStatus(statusRes.data.invoice.status);
        onUpdate();
        setTimeout(() => setMsg(null), 5000);
      } else {
        setMsg({ success: false, text: res.data?.error || "Payment recording failed" });
      }
    } catch (e) {
      setMsg({ success: false, text: e.message });
    }
    setRecordingPayment(false);
  }

  async function handleResend() {
    setResending(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("intakePublishInvoice", { invoiceId });
      if (res.data?.error) {
        setMsg({ success: false, text: res.data.error });
      } else {
        const newLog = appendLogEntry(record.internalNotes, record.created_date, `Invoice resent to ${record.email}`, "Staff");
        await base44.entities.HotelTreatmentIntake.update(record.id, { internalNotes: newLog });
        setMsg({ success: true, text: `Resent to ${record.email}` });
        setTimeout(() => setMsg(null), 4000);
        onUpdate();
      }
    } catch (e) {
      setMsg({ success: false, text: e.message });
    }
    setResending(false);
  }

  async function handleVoid() {
    setVoiding(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("intakeVoidInvoice", { invoiceId, intakeId: record.id });
      if (res.data?.success) {
        const newLog = appendLogEntry(record.internalNotes, record.created_date, "Invoice voided", "Staff");
        await base44.entities.HotelTreatmentIntake.update(record.id, { squareInvoiceId: null, internalNotes: newLog });
        setMsg({ success: true, text: "Invoice voided" });
        setShowVoidConfirm(false);
        setVoidInput("");
        setInvoiceStatus("DELETED");
        onUpdate();
      } else {
        setMsg({ success: false, text: res.data?.error || "Could not void invoice" });
      }
    } catch (e) {
      setMsg({ success: false, text: e.message });
    }
    setVoiding(false);
  }

  if (!invoiceId) return null;

  const isFinal = invoiceStatus && FINAL_STATES.includes(invoiceStatus);

  return (
    <div className="space-y-2">
      {/* Label + status */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase">Square Invoice</p>
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[rgb(150,150,150)]" />
        ) : invoiceStatus ? (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[invoiceStatus] || "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[invoiceStatus] || invoiceStatus}
          </span>
        ) : (
          <span className="text-[10px] text-[rgb(150,150,150)]">Loading status…</span>
        )}
      </div>

      {/* Resend */}
      {!isFinal && (
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgb(107,85,64)] bg-[rgb(250,247,244)] text-xs text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)] transition-colors disabled:opacity-40"
        >
          {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {resending ? "Resending…" : "Resend Invoice to Guest"}
        </button>
      )}

      {/* Open Payment Page */}
      {publicUrl && (
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Open Guest Payment Page
        </a>
      )}

      {/* View in Square */}
      <a
        href="https://squareup.com/dashboard/invoices"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(120,120,120)] hover:bg-[rgb(248,246,242)] transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" /> View in Square Dashboard
      </a>

      {/* Void */}
      {!isFinal && (
        <button
          onClick={() => setShowVoidConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Void Invoice
        </button>
      )}

      {/* Message */}
      {msg && (
        <div className={`text-xs rounded-xl border px-3 py-2 ${msg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Void confirm modal */}
      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(45,45,45)]">Record a Payment</h3>
                <p className="text-xs text-[rgb(150,150,150)]">For {record.guestName}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-1">Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full border border-[rgb(220,210,200)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgb(107,85,64)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full border border-[rgb(220,210,200)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgb(107,85,64)] bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="CARD">Card (manual)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-1">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Cash deposit at check-in"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full border border-[rgb(220,210,200)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[rgb(107,85,64)]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentAmount(""); setPaymentNote(""); }}
                className="flex-1 py-2 rounded-xl border border-[rgb(220,210,200)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 py-2 rounded-xl bg-green-700 text-white text-sm font-medium disabled:opacity-40 hover:bg-green-800 transition-colors flex items-center justify-center gap-1.5"
              >
                {recordingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {recordingPayment ? "Recording…" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoidConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(45,45,45)]">Void This Invoice?</h3>
                <p className="text-xs text-[rgb(150,150,150)]">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[rgb(120,120,120)] mb-4">
              This will cancel the invoice sent to <strong>{record.guestName}</strong>. Type <strong>VOID</strong> to confirm.
            </p>
            <input
              value={voidInput}
              onChange={e => setVoidInput(e.target.value)}
              placeholder="Type VOID to confirm"
              className="w-full border border-[rgb(220,210,200)] rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowVoidConfirm(false); setVoidInput(""); }}
                className="flex-1 py-2 rounded-xl border border-[rgb(220,210,200)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                disabled={voiding || voidInput.trim().toUpperCase() !== "VOID"}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5"
              >
                {voiding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {voiding ? "Voiding…" : "Yes, Void It"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
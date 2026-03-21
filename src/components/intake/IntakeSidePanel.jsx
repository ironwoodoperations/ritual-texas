import React, { useState } from "react";
import { X, Phone, Mail, Copy, CheckCircle2, Loader2, CreditCard, AlertTriangle, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ActivityLog, { appendLogEntry } from "./ActivityLog";
import InvoicePreviewModal from "./InvoicePreviewModal";

const STATUS_STEPS = ["new_inquiry", "pending", "confirmed"];
const STATUS_LABELS = {
  new_inquiry: "New Inquiry", pending: "Pending", confirmed: "Confirmed",
  not_now: "Not Now", lost_price: "Lost – Price", lost_competitor: "Lost – Competitor",
  lost_no_response: "Lost – No Response", lost_dates_unavailable: "Lost – Dates N/A",
  do_not_contact: "Do Not Contact", declined: "Declined", archived: "Archived",
};
const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  not_now: "bg-purple-100 text-purple-700",
  lost_price: "bg-orange-100 text-orange-700",
  lost_competitor: "bg-orange-100 text-orange-700",
  lost_no_response: "bg-orange-100 text-orange-700",
  lost_dates_unavailable: "bg-orange-100 text-orange-700",
  do_not_contact: "bg-red-200 text-red-800",
  declined: "bg-red-100 text-red-600",
  archived: "bg-gray-100 text-gray-500",
};

const THERAPIST_STATUS_COLORS = {
  not_contacted: "bg-gray-100 text-gray-500",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};
const THERAPIST_STATUS_LABELS = {
  not_contacted: "Not Contacted", contacted: "Contacted",
  follow_up: "Follow Up", approved: "✅ Approved", declined: "❌ Declined",
};

function parseTreatmentEntries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === "object") return item;
    try { return JSON.parse(item); } catch { return { name: item, price: 0 }; }
  });
}

function fmtMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function IntakeSidePanel({ record, onClose, onUpdate, onEdit }) {
  const [actioning, setActioning] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const storageKey = `intake_completed_${record.id}`;
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });

  function markCompleted(key) {
    setCompleted(c => {
      const next = { ...c, [key]: true };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function logEvent(text) {
    const newLog = appendLogEntry(record.internalNotes, record.created_date, text, "System");
    await base44.entities.HotelTreatmentIntake.update(record.id, { internalNotes: newLog });
  }

  async function deleteRecord() {
    if (deleteInput.trim().toLowerCase() !== record.guestName.trim().toLowerCase()) return;
    setDeleting(true);
    await base44.entities.HotelTreatmentIntake.delete(record.id);
    setDeleting(false);
    setShowDeleteModal(false);
    onClose();
    onUpdate();
  }

  async function changeStatus(newStatus) {
    if (record.bookingStatus === newStatus) return;
    const oldLabel = STATUS_LABELS[record.bookingStatus] || record.bookingStatus;
    const newLabel = STATUS_LABELS[newStatus] || newStatus;
    const newLog = appendLogEntry(record.internalNotes, record.created_date, `Status changed: ${oldLabel} → ${newLabel}`, "Staff");
    await base44.entities.HotelTreatmentIntake.update(record.id, { bookingStatus: newStatus, internalNotes: newLog });
    onUpdate();
  }

  async function runAction(type) {
    setActioning(type);
    setActionMsg(null);
    try {
      const sbParsed = parseTreatmentEntries(record.selectedTreatments || []);
      const ctbParsed = parseTreatmentEntries(record.callToBookTreatments || []);
      const intakeData = { ...record, _sbEntries: sbParsed, _ctbEntries: ctbParsed };

      if (type === "SendQuote") {
        if (!record.email) { setActionMsg({ success: false, text: "Guest email required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeCreateInvoiceDraft", { intake: intakeData });
        if (res.data?.error) { setActionMsg({ success: false, text: res.data.error }); }
        else {
          const invoiceId = res.data?.invoiceId;
          const pubRes = await base44.functions.invoke("intakePublishInvoice", { invoiceId });
          if (pubRes.data?.error) {
            setActionMsg({ success: true, text: `Draft created. Send manually.`, invoiceId, draftUrl: res.data?.draftUrl, isPending: true });
          } else {
            markCompleted("SendQuote");
            await logEvent(`Quote sent to ${record.email}`);
            setActionMsg({ success: true, text: `Invoice sent to ${record.email}!` });
            onUpdate();
            setTimeout(() => setActionMsg(null), 5000);
          }
        }
      } else if (type === "BookHotel") {
        if (!record.checkInDate || !record.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out required." }); setActioning(null); return; }
        if (!record.email) { setActionMsg({ success: false, text: "Guest email required for Cloudbeds." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookHotel", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error });
        else {
          markCompleted("BookHotel");
          await logEvent("Hotel reservation created in Cloudbeds");
          setActionMsg({ success: true, text: res.data?.message || "Hotel booked!" });
          onUpdate();
          setTimeout(() => setActionMsg(null), 5000);
        }
      } else if (type === "AddToCRM") {
        const nameParts = record.guestName?.trim().split(" ") || [];
        const res = await base44.functions.invoke("crmUpsertContact", {
          firstName: nameParts[0] || record.guestName, lastName: nameParts.slice(1).join(" ") || "",
          fullName: record.guestName, email: record.email || "", phone: record.phone || "", tags: ["intake"],
        });
        if (res.data?.ok) {
          markCompleted("AddToCRM");
          await logEvent("Guest added to CRM");
          setActionMsg({ success: true, text: "Added to CRM." });
          setTimeout(() => setActionMsg(null), 4000);
        } else {
          setActionMsg({ success: false, text: res.data?.error || "CRM error" });
        }
      } else if (type === "PublishQuote") {
        if (!actionMsg?.invoiceId) { setActioning(null); return; }
        const res = await base44.functions.invoke("intakePublishInvoice", { invoiceId: actionMsg.invoiceId });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error });
        else {
          markCompleted("SendQuote");
          setActionMsg({ success: true, text: res.data?.message, isPending: false });
          setTimeout(() => setActionMsg(null), 5000);
        }
      }
    } catch (err) {
      setActionMsg({ success: false, text: err.message });
    }
    setActioning(null);
  }

  const sbEntries = parseTreatmentEntries(record.selectedTreatments || []);
  const ctbEntries = parseTreatmentEntries(record.callToBookTreatments || []);
  const allTreatments = [
    ...sbEntries.map(e => ({ ...e, isCtb: false })),
    ...ctbEntries.map(e => ({ ...e, isCtb: true })),
  ];
  const treatmentTotal = allTreatments.reduce((s, t) => s + Number(t.price || 0), 0);

  const missingEmail = !record.email;
  const missingDates = !record.checkInDate || !record.checkOutDate;

  const stepIndex = STATUS_STEPS.indexOf(record.bookingStatus);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(235,225,213)] bg-[rgb(248,246,242)] shrink-0">
          <div>
            <h2 className="font-semibold text-[rgb(45,45,45)]">{record.guestName}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.bookingStatus] || ""}`}>
              {STATUS_LABELS[record.bookingStatus] || record.bookingStatus}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgb(235,225,213)] transition-colors">
            <X className="w-4 h-4 text-[rgb(107,85,64)]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Contact Info */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase">Contact</p>
            <div className="flex flex-wrap gap-2">
              {record.phone && (
                <a href={`tel:${record.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)]">
                  <Phone className="w-3.5 h-3.5" /> {record.phone}
                </a>
              )}
              {record.email && (
                <>
                  <a href={`mailto:${record.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)]">
                    <Mail className="w-3.5 h-3.5" /> {record.email}
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(record.email); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)]"
                  >
                    {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[rgb(45,45,45)]">
              {record.checkInDate && <div><span className="text-[rgb(150,130,110)]">Dates: </span>{record.checkInDate} → {record.checkOutDate}</div>}
              {record.numberOfGuests && <div><span className="text-[rgb(150,130,110)]">Guests: </span>{record.numberOfGuests}</div>}
              {record.cloudbedsRoomTypeId && <div className="col-span-2"><span className="text-[rgb(150,130,110)]">Room: </span>{record.cloudbedsRoomTypeId}</div>}
              {record.howDidYouHearAboutUs && <div className="col-span-2"><span className="text-[rgb(150,130,110)]">Source: </span>{record.howDidYouHearAboutUs}</div>}
            </div>
          </div>

          {/* Status Progression */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Status</p>
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button
                    onClick={() => changeStatus(s)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all border ${
                      record.bookingStatus === s
                        ? "bg-[rgb(107,85,64)] text-white border-[rgb(107,85,64)]"
                        : i < stepIndex
                          ? "bg-[rgb(235,225,213)] text-[rgb(107,85,64)] border-[rgb(198,182,165)]"
                          : "bg-white text-[rgb(150,150,150)] border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]"
                    }`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                  {i < STATUS_STEPS.length - 1 && <div className="w-4 h-px bg-[rgb(220,210,200)] shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowInvoicePreview(true)}
                disabled={missingDates || missingEmail || !!actioning}
                title={missingEmail ? "Guest email required" : missingDates ? "Check-in/out dates required" : ""}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 ${completed.SendQuote ? "border-green-300 bg-green-50 text-green-700" : "border-[rgb(107,85,64)] bg-[rgb(250,247,244)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]"}`}
              >
                {completed.SendQuote ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                {(missingEmail || missingDates) && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                View & Send Quote
              </button>
              <button
                onClick={() => runAction("BookHotel")}
                disabled={missingDates || missingEmail || !!actioning}
                title={missingEmail ? "Guest email required" : missingDates ? "Dates required" : ""}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 ${completed.BookHotel ? "border-green-300 bg-green-50 text-green-700" : "border-[rgb(235,225,213)] text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]"}`}
              >
                {actioning === "BookHotel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : completed.BookHotel ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                🏨 Book Cloudbeds
              </button>
              <a
                href="https://simplybook.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[rgb(150,170,155)] text-xs text-[rgb(80,120,90)] hover:bg-[rgb(245,250,246)] transition-colors"
              >
                🧘 Open SimplyBook
              </a>
              <button
                onClick={() => runAction("AddToCRM")}
                disabled={!!actioning}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-all disabled:opacity-40 ${completed.AddToCRM ? "border-green-300 bg-green-50 text-green-700" : "border-[rgb(235,225,213)] text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]"}`}
              >
                {actioning === "AddToCRM" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : completed.AddToCRM ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                👤 Add to CRM
              </button>
            </div>
            <button
              onClick={onEdit}
              className="w-full mt-2 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors"
            >
              ✏️ Edit Full Record
            </button>
            <button
              onClick={() => { setDeleteInput(""); setShowDeleteModal(true); }}
              className="w-full mt-1 py-2 rounded-xl border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Record
            </button>
          </div>

          {/* Action Message */}
          {actionMsg && (
            <div className={`text-xs rounded-xl border px-3 py-2 ${actionMsg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
              <div className="font-medium">{actionMsg.text}</div>
              {actionMsg.isPending && actionMsg.draftUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <a href={actionMsg.draftUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">📄 Preview Invoice</a>
                  <button onClick={() => runAction("PublishQuote")} disabled={!!actioning} className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Send to Guest</button>
                </div>
              )}
            </div>
          )}

          {/* Treatments */}
          {allTreatments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Treatments</p>
              <div className="space-y-1.5">
                {allTreatments.map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[rgb(248,246,242)] rounded-lg px-3 py-2">
                    <div>
                      <span className="text-[rgb(45,45,45)]">{t.serviceName || t.name}</span>
                      {t.date && <span className="text-[rgb(150,150,150)] ml-1.5">{t.date}{t.time ? ` @ ${t.time}` : ""}</span>}
                      {t.isCtb && <span className="ml-1.5 text-[rgb(120,100,160)] italic">(call-to-book)</span>}
                    </div>
                    {t.price > 0 && <span className="text-[rgb(107,85,64)] font-medium shrink-0 ml-2">{fmtMoney(t.price)}</span>}
                  </div>
                ))}
                {treatmentTotal > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-[rgb(107,85,64)] pt-1 px-3">
                    <span>Treatment Subtotal</span>
                    <span>{fmtMoney(treatmentTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Therapist */}
          {(record.therapistAssigned || record.therapistStatus) && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Therapist</p>
              <div className="flex items-center gap-2 flex-wrap">
                {record.therapistAssigned && <span className="text-sm text-[rgb(45,45,45)]">🧘 {record.therapistAssigned}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${THERAPIST_STATUS_COLORS[record.therapistStatus || "not_contacted"]}`}>
                  {THERAPIST_STATUS_LABELS[record.therapistStatus || "not_contacted"]}
                </span>
                {record.therapistFollowUpDate && <span className="text-xs text-[rgb(150,150,150)]">Follow-up: {record.therapistFollowUpDate}</span>}
              </div>
            </div>
          )}

          {/* Card on File */}
          {record.ccNumber && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Card on File</p>
              <div className="flex items-center gap-2 border border-[rgb(220,210,200)] rounded-xl px-3 py-2">
                <CreditCard className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" />
                <span className="text-sm text-[rgb(45,45,45)]">
                  {record.ccType && `${record.ccType} · `}•••• {record.ccNumber.slice(-4)}
                  {record.ccExpiry && ` · ${record.ccExpiry}`}
                </span>
                <span className="ml-auto text-xs text-green-600 font-medium">Card on file ✓</span>
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Activity Log</p>
            <ActivityLog record={record} onUpdate={onUpdate} />
          </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {showInvoicePreview && (
        <InvoicePreviewModal
          intake={record}
          onClose={() => setShowInvoicePreview(false)}
          sending={actioning === "SendQuote"}
          onConfirmSend={() => { setShowInvoicePreview(false); runAction("SendQuote"); }}
        />
      )}
    </>
  );
}
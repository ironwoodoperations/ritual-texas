import React, { useState, useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

const THERAPIST_STATUSES = [
  { value: "not_contacted", label: "Not Contacted", color: "text-gray-500" },
  { value: "contacted", label: "Contacted", color: "text-blue-600" },
  { value: "follow_up", label: "Follow Up Needed", color: "text-yellow-600" },
  { value: "approved", label: "Approved / Confirmed", color: "text-green-600" },
  { value: "declined", label: "Declined", color: "text-red-500" },
];

export default function TherapistSection({ form, onChange, sbEntries, ctbEntries }) {
  const [therapists, setTherapists] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    base44.functions.invoke("simplybookGetStaff", {})
      .then(res => { if (res.data?.staff) setTherapists(res.data.staff); })
      .catch(() => {})
      .finally(() => setLoadingStaff(false));
  }, []);

  const selectedTherapist = therapists.find(t => t.name === form.therapistAssigned);

  // Build a summary of requested treatments for the text message
  function buildTextBody() {
    const guestName = form.guestName || "Guest";
    const lines = [`Hi! This is Hotel RITUAL. We have a guest, ${guestName}, requesting the following:`];

    sbEntries.filter(e => e.serviceName).forEach(e => {
      lines.push(`• ${e.serviceName} on ${e.date || "TBD"} at ${e.time || "TBD"}`);
    });
    ctbEntries.filter(e => e.name).forEach(e => {
      lines.push(`• ${e.name} on ${e.date || "TBD"} at ${e.time || "TBD"} (call-to-book)`);
    });

    if (form.treatmentsRequested) lines.push(`Notes: ${form.treatmentsRequested}`);
    if (form.followUpDate) lines.push(`Please confirm by: ${form.followUpDate}`);
    lines.push("Can you accommodate? Thanks!");

    return lines.join("\n");
  }

  function openSmsToTherapist() {
    if (!selectedTherapist?.phone) return;
    const body = encodeURIComponent(buildTextBody());
    const phone = selectedTherapist.phone.replace(/\D/g, "");
    window.open(`sms:${phone}&body=${body}`, "_blank");
  }

  const statusInfo = THERAPIST_STATUSES.find(s => s.value === (form.therapistStatus || "not_contacted"));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {/* Therapist selector */}
        <div>
          <label className={labelCls}>Assign Therapist</label>
          {loadingStaff ? (
            <div className="flex items-center gap-2 py-2 text-xs text-[rgb(150,150,150)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading therapists…
            </div>
          ) : (
            <select
              value={form.therapistAssigned || ""}
              onChange={e => onChange("therapistAssigned", e.target.value)}
              className={selectCls}
            >
              <option value="">No therapist assigned</option>
              {therapists.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name}{t.position ? ` — ${t.position}` : ""}
                </option>
              ))}
            </select>
          )}
          {selectedTherapist?.phone && (
            <p className="text-xs text-[rgb(150,130,110)] mt-1">
              📱 {selectedTherapist.phone}
            </p>
          )}
        </div>

        {/* Pipeline status */}
        <div>
          <label className={labelCls}>Therapist Status</label>
          <select
            value={form.therapistStatus || "not_contacted"}
            onChange={e => onChange("therapistStatus", e.target.value)}
            className={selectCls}
          >
            {THERAPIST_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {statusInfo && (
            <p className={`text-xs mt-1 font-medium ${statusInfo.color}`}>● {statusInfo.label}</p>
          )}
        </div>

        {/* Follow-up date */}
        <div>
          <label className={labelCls}>Therapist Follow-Up Date</label>
          <input
            type="date"
            value={form.therapistFollowUpDate || ""}
            onChange={e => onChange("therapistFollowUpDate", e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Text message button */}
        <div className="flex flex-col justify-end">
          <label className={labelCls}>Quick Text</label>
          {selectedTherapist ? (
            <button
              type="button"
              onClick={openSmsToTherapist}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgb(150,170,155)] text-white text-sm hover:opacity-90 transition-opacity w-fit"
            >
              <MessageSquare className="w-4 h-4" />
              Text {selectedTherapist.name}
            </button>
          ) : (
            <p className="text-xs text-[rgb(180,165,150)] py-2 italic">Assign a therapist to enable quick text</p>
          )}
        </div>
      </div>

      {/* Message preview */}
      {selectedTherapist && (
        <div>
          <label className={labelCls}>Message Preview</label>
          <div className="mt-1 bg-[rgb(240,248,242)] border border-[rgb(200,225,210)] rounded-xl px-4 py-3 text-xs text-[rgb(45,45,45)] whitespace-pre-wrap font-mono leading-relaxed">
            {buildTextBody()}
          </div>
        </div>
      )}

      {/* Therapist notes */}
      <div>
        <label className={labelCls}>Therapist Notes</label>
        <textarea
          placeholder="Confirmation details, special requests, availability notes…"
          value={form.therapistNotes || ""}
          onChange={e => onChange("therapistNotes", e.target.value)}
          className={fieldCls + " resize-none h-16"}
        />
      </div>
    </div>
  );
}
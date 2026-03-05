import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, ChevronDown, ChevronUp,
  Save, CheckCircle2, Clock, Phone, Mail, MessageSquare, CreditCard, Loader2, Lock
} from "lucide-react";

// ── Treatments hardcoded from Treatment entity ────────────────────────────────
const DB_TREATMENTS = [
  { id: "royal-facial", name: "The Royal Treatment Facial", duration: 60, price: 198 },
  { id: "aura-glow", name: "Aura Glow", duration: 120, price: 250 },
  { id: "shirodhara", name: "Shirodhara", duration: 60, price: 150 },
  { id: "reiki-forgiveness-bowl", name: "Reiki Forgiveness Bowl", duration: 60, price: 75 },
  { id: "reiki", name: "Reiki", duration: 60, price: 150 },
  { id: "swedish-massage-90", name: "Swedish Massage (90 min)", duration: 90, price: 250 },
  { id: "swedish-massage-60", name: "Swedish Massage (60 min)", duration: 60, price: 198 },
  { id: "sound-bath-group", name: "Sound Bath Group", duration: 60, price: 20 },
  { id: "sound-bath", name: "Sound Bath (Private)", duration: 60, price: 150 },
  { id: "yoga", name: "Yoga (Private)", duration: 60, price: 60 },
  { id: "parisian-scalp", name: "Parisian Scalp & Hair Treatment", duration: 45, price: 98 },
  { id: "crystal-chakra", name: "Crystal Chakra Tuning", duration: 60, price: 125 },
];

const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS = {
  new_inquiry: "New Inquiry", pending: "Pending", confirmed: "Confirmed",
  declined: "Declined", archived: "Archived",
};

const BLANK = {
  guestName: "", phone: "", email: "", preferredContactMethod: "phone",
  checkInDate: "", checkOutDate: "", numberOfGuests: 1, numberOfChildren: 0,
  cloudbedsRoomTypeId: "", flexibleOnRoom: false, hotelNotes: "",
  selectedTreatments: [], preferredTreatmentDate: "", preferredTreatmentTime: "",
  preferredTherapist: "", flexibleOnTime: false, treatmentsRequested: "",
  bookingStatus: "new_inquiry", followUpDate: "", internalNotes: "",
  ccName: "", ccLast4: "", ccExpiry: "", ccType: "", ccNotes: "",
};

// Shared styles
const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

function NumSelect({ value, onChange, max = 20 }) {
  return (
    <select value={value} onChange={e => onChange(parseInt(e.target.value))} className={selectCls}>
      {Array.from({ length: max }, (_, i) => i).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

function NumSelect1({ value, onChange, max = 20 }) {
  return (
    <select value={value} onChange={e => onChange(parseInt(e.target.value))} className={selectCls}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-[rgb(220,210,200)]" />
        <span className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase whitespace-nowrap">{title}</span>
        <div className="h-px flex-1 bg-[rgb(220,210,200)]" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// ── Long-scroll intake form ────────────────────────────────────────────────────
function IntakeForm({ initial = BLANK, roomTypes = [], loading = false, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function toggleTreatment(t) {
    const cur = form.selectedTreatments || [];
    const exists = cur.find(s => s.id === t.id);
    set("selectedTreatments", exists ? cur.filter(s => s.id !== t.id) : [...cur, t]);
  }

  async function submit() {
    setSaving(true);
    // Entity expects selectedTreatments as array of strings — store as "Name ($price)" for readability
    // but pass the full objects via a parallel field for action buttons
    const payload = {
      ...form,
      selectedTreatments: (form.selectedTreatments || []).map(t => typeof t === "object" ? t.name : t),
      _selectedTreatmentsMeta: JSON.stringify(form.selectedTreatments || []),
    };
    await onSave(payload);
    setSaving(false);
  }

  return (
    <div className="font-['Georgia',serif]">
      {/* Guest Info */}
      <Section title="Guest Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Guest Full Name *">
            <input placeholder="First Last" value={form.guestName} onChange={e => set("guestName", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Email *">
            <input placeholder="guest@email.com" value={form.email} onChange={e => set("email", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Phone">
            <input placeholder="(555) 000-0000" value={form.phone} onChange={e => set("phone", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Preferred Contact Method">
            <select value={form.preferredContactMethod} onChange={e => set("preferredContactMethod", e.target.value)} className={selectCls}>
              <option value="phone">Phone Call</option>
              <option value="text">Text Message</option>
              <option value="email">Email</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Hotel — Cloudbeds */}
      <Section title="Hotel Reservation · Cloudbeds">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Check-In Date">
            <input type="date" value={form.checkInDate} onChange={e => set("checkInDate", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Check-Out Date">
            <input type="date" value={form.checkOutDate} onChange={e => set("checkOutDate", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Adults">
            <NumSelect1 value={form.numberOfGuests} onChange={v => set("numberOfGuests", v)} />
          </Field>
          <Field label="Children">
            <NumSelect value={form.numberOfChildren || 0} onChange={v => set("numberOfChildren", v)} />
          </Field>
          <Field label="Room Type">
            {loading ? (
              <p className={fieldCls + " text-[rgb(170,155,140)]"}>Loading rooms…</p>
            ) : (
              <select value={form.cloudbedsRoomTypeId} onChange={e => set("cloudbedsRoomTypeId", e.target.value)} className={selectCls}>
                <option value="">Select a room type</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="Flexible on Room?">
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-[rgb(45,45,45)]">
              <input type="checkbox" checked={form.flexibleOnRoom} onChange={e => set("flexibleOnRoom", e.target.checked)} className="accent-[rgb(107,85,64)]" />
              Yes, flexible
            </label>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Special Hotel Requests">
              <textarea placeholder="Ground floor, early check-in, pet, anniversary setup…" value={form.hotelNotes} onChange={e => set("hotelNotes", e.target.value)} className={fieldCls + " resize-none h-16"} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Treatments — SimplyBook */}
      <Section title="Spa & Wellness · SimplyBook">
        <div className="mb-5">
          <label className={labelCls}>Select Treatments</label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DB_TREATMENTS.map(t => {
              const selected = (form.selectedTreatments || []).some(s => s.id === t.id);
              return (
                <label key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selected ? "border-[rgb(107,85,64)] bg-[rgb(252,248,244)]" : "border-[rgb(220,210,200)] hover:border-[rgb(180,160,140)]"}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleTreatment(t)} className="accent-[rgb(107,85,64)] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[rgb(45,45,45)] leading-snug">{t.name}</p>
                    <p className="text-xs text-[rgb(150,130,110)] mt-0.5">{t.duration} min · ${t.price}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {(form.selectedTreatments || []).length > 0 && (
            <p className="text-xs text-[rgb(107,85,64)] mt-2 font-semibold">
              {form.selectedTreatments.length} treatment{form.selectedTreatments.length > 1 ? "s" : ""} selected ·
              ${form.selectedTreatments.reduce((s, t) => s + (t.price || 0), 0)} total
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Preferred Treatment Date">
            <input type="date" value={form.preferredTreatmentDate} onChange={e => set("preferredTreatmentDate", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Preferred Time">
            <input type="time" value={form.preferredTreatmentTime} onChange={e => set("preferredTreatmentTime", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Preferred Therapist">
            <input placeholder="Name or 'No preference'" value={form.preferredTherapist} onChange={e => set("preferredTherapist", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Flexible on Time?">
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-[rgb(45,45,45)]">
              <input type="checkbox" checked={form.flexibleOnTime} onChange={e => set("flexibleOnTime", e.target.checked)} className="accent-[rgb(107,85,64)]" />
              Yes, flexible
            </label>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Treatment Notes">
              <textarea placeholder="Injuries, sensitivities, preferences…" value={form.treatmentsRequested} onChange={e => set("treatmentsRequested", e.target.value)} className={fieldCls + " resize-none h-16"} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Internal */}
      <Section title="Internal Notes & Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Booking Status">
            <select value={form.bookingStatus} onChange={e => set("bookingStatus", e.target.value)} className={selectCls}>
              <option value="new_inquiry">New Inquiry</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Follow-Up Date">
            <input type="date" value={form.followUpDate} onChange={e => set("followUpDate", e.target.value)} className={fieldCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Internal Notes">
              <textarea placeholder="Internal notes for the team…" value={form.internalNotes} onChange={e => set("internalNotes", e.target.value)} className={fieldCls + " resize-none h-24"} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Card on File */}
      <Section title="Card on File · Internal Only">
        <p className="text-xs text-[rgb(170,140,110)] mb-4 italic">⚠️ Reference info only — never enter full card numbers here.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Cardholder Name">
            <input placeholder="Name on card" value={form.ccName} onChange={e => set("ccName", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Card Type">
            <select value={form.ccType} onChange={e => set("ccType", e.target.value)} className={selectCls}>
              <option value="">Select type</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Discover">Discover</option>
            </select>
          </Field>
          <Field label="Last 4 Digits">
            <input placeholder="0000" value={form.ccLast4} onChange={e => set("ccLast4", e.target.value)} className={fieldCls} maxLength={4} />
          </Field>
          <Field label="Expiry MM/YY">
            <input placeholder="MM/YY" value={form.ccExpiry} onChange={e => set("ccExpiry", e.target.value)} className={fieldCls} maxLength={5} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Card Notes">
              <textarea placeholder="Deposit auth amount, date, any notes…" value={form.ccNotes} onChange={e => set("ccNotes", e.target.value)} className={fieldCls + " resize-none h-14"} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex gap-3 pt-4 border-t border-[rgb(220,210,200)]">
        <button
          onClick={submit}
          disabled={saving || !form.guestName}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Record"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[rgb(220,210,200)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, actionKey, completed, actioning, onClick, variant = "default" }) {
  const done = completed[actionKey];
  const isLoading = actioning === actionKey;
  const variantCls = variant === "primary"
    ? "border-[rgb(107,85,64)] text-[rgb(107,85,64)] bg-[rgb(250,247,244)]"
    : "border-[rgb(235,225,213)] text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]";
  return (
    <button
      onClick={onClick}
      disabled={!!actioning}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs disabled:opacity-50 transition-colors ${done ? "border-green-300 bg-green-50 text-green-700" : variantCls}`}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : null}
      {label}
    </button>
  );
}

// ── Intake record card ────────────────────────────────────────────────────────
function IntakeCard({ record, onUpdate, roomTypes, loadingRooms }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

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

  async function save(form) {
    await base44.entities.HotelTreatmentIntake.update(record.id, form);
    onUpdate();
    setEditing(false);
  }

  async function runAction(type) {
    setActioning(type);
    setActionMsg(null);
    try {
      const intakeData = { ...record };

      if (type === "SendQuote") {
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required." }); setActioning(null); return; }
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeCreateSquareQuote", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { markCompleted("SendQuote"); setActionMsg({ success: true, text: res.data?.message + (res.data?.publicUrl ? ` — ${res.data.publicUrl}` : "") }); setTimeout(() => setActionMsg(null), 10000); }

      } else if (type === "BookHotel") {
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required for Cloudbeds." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookHotel", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { markCompleted("BookHotel"); setActionMsg({ success: true, text: res.data?.message || "Hotel booked!" }); setTimeout(() => { setActionMsg(null); onUpdate(); }, 5000); }

      } else if (type === "BookTreatments") {
        if (!intakeData.selectedTreatments?.length) { setActionMsg({ success: false, text: "No treatments selected." }); setActioning(null); return; }
        if (!intakeData.preferredTreatmentDate) { setActionMsg({ success: false, text: "Preferred treatment date required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookTreatments", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { markCompleted("BookTreatments"); setActionMsg({ success: true, text: res.data?.message || "Treatments booked!" }); setTimeout(() => setActionMsg(null), 5000); }

      } else if (type === "AddToCRM") {
        const nameParts = intakeData.guestName?.trim().split(" ") || [];
        const res = await base44.functions.invoke("crmUpsertContact", {
          firstName: nameParts[0] || intakeData.guestName, lastName: nameParts.slice(1).join(" ") || "",
          fullName: intakeData.guestName, email: intakeData.email || "", phone: intakeData.phone || "", tags: ["intake"],
        });
        if (res.data?.ok) { markCompleted("AddToCRM"); setActionMsg({ success: true, text: "Added to CRM." }); setTimeout(() => setActionMsg(null), 4000); }
        else setActionMsg({ success: false, text: res.data?.error || "CRM error" });
      }
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : null;
      setActionMsg({ success: false, text: err.message, detail });
    }
    setActioning(null);
  }

  async function handleArchive() {
    await base44.entities.HotelTreatmentIntake.update(record.id, { bookingStatus: "archived" });
    onUpdate();
  }

  const contactIcon = record.preferredContactMethod === "email" ? <Mail className="w-3 h-3" /> :
    record.preferredContactMethod === "text" ? <MessageSquare className="w-3 h-3" /> : <Phone className="w-3 h-3" />;

  const hasHotel = record.checkInDate && record.checkOutDate;
  const hasTreatments = Array.isArray(record.selectedTreatments) && record.selectedTreatments.length > 0;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
      <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-4" onClick={() => { setExpanded(e => !e); setEditing(false); }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[rgb(45,45,45)]">{record.guestName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.bookingStatus] || "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[record.bookingStatus] || record.bookingStatus}
            </span>
            {hasHotel && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🏨 Hotel</span>}
            {hasTreatments && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✨ {record.selectedTreatments.length} tx</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[rgb(120,120,120)] flex-wrap">
            {record.phone && <a href={`sms:${record.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[rgb(107,85,64)] hover:underline">{contactIcon} {record.phone}</a>}
            {record.checkInDate && <span>{record.checkInDate} → {record.checkOutDate}</span>}
            {record.followUpDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.followUpDate}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[rgb(235,225,213)] px-5 py-5 bg-[rgb(250,248,245)]">
          {editing ? (
            <IntakeForm initial={record} roomTypes={roomTypes} loading={loadingRooms} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {record.email && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Email</p><a href={`mailto:${record.email}`} className="text-[rgb(107,85,64)] hover:underline">{record.email}</a></div>}
                {record.phone && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Phone</p><a href={`sms:${record.phone}`} className="text-[rgb(107,85,64)] hover:underline">{record.phone}</a></div>}
                {record.numberOfGuests && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Adults</p><p>{record.numberOfGuests}</p></div>}
                {record.checkInDate && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Dates</p><p>{record.checkInDate} → {record.checkOutDate}</p></div>}
                {record.preferredTreatmentDate && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Tx Date</p><p>{record.preferredTreatmentDate} {record.preferredTreatmentTime}</p></div>}
                {record.preferredTherapist && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Therapist</p><p>{record.preferredTherapist}</p></div>}
                {hasTreatments && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">Treatments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {record.selectedTreatments.map(t => (
                        <span key={t.id || t.name} className="text-xs bg-[rgb(240,235,228)] text-[rgb(107,85,64)] px-2 py-0.5 rounded-full">{t.name || t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {record.internalNotes && <div className="col-span-2 sm:col-span-3 bg-white rounded-xl p-3 border border-[rgb(220,210,200)]"><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">Notes</p><p className="whitespace-pre-wrap text-sm">{record.internalNotes}</p></div>}
                {record.ccLast4 && <div className="col-span-2 sm:col-span-3 border border-[rgb(220,210,200)] rounded-xl p-3 flex items-center gap-3"><CreditCard className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" /><span className="text-sm">{record.ccType && `${record.ccType} · `}•••• {record.ccLast4}{record.ccExpiry && ` · ${record.ccExpiry}`}{record.ccName && ` · ${record.ccName}`}</span></div>}
              </div>

              {actionMsg && (
                <div className={`text-xs rounded-xl border ${actionMsg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  <div className="px-3 py-2 font-medium">{actionMsg.text}</div>
                  {actionMsg.detail && <div className="border-t px-3 py-2"><pre className="whitespace-pre-wrap break-all font-mono text-[11px] max-h-40 overflow-y-auto">{actionMsg.detail}</pre></div>}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] text-[rgb(150,130,110)] font-semibold uppercase tracking-widest">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {hasHotel && <ActionBtn label="📧 Send Square Quote" actionKey="SendQuote" completed={completed} actioning={actioning} onClick={() => runAction("SendQuote")} variant="primary" />}
                  {hasHotel && <ActionBtn label="🏨 Book in Cloudbeds" actionKey="BookHotel" completed={completed} actioning={actioning} onClick={() => runAction("BookHotel")} />}
                  {hasTreatments && <ActionBtn label="✨ Book in SimplyBook" actionKey="BookTreatments" completed={completed} actioning={actioning} onClick={() => runAction("BookTreatments")} />}
                  <ActionBtn label="👤 Add to CRM" actionKey="AddToCRM" completed={completed} actioning={actioning} onClick={() => runAction("AddToCRM")} />
                  <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Edit</button>
                </div>
                <div className="pt-2 border-t border-[rgb(235,225,213)]">
                  <button onClick={handleArchive} disabled={!!actioning} className="px-4 py-2 rounded-xl text-xs font-medium bg-[rgb(235,225,213)] text-[rgb(107,85,64)] hover:bg-[rgb(220,210,198)] transition-colors disabled:opacity-50">
                    Archive
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminIntake() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    base44.functions.invoke("getIntakeFormData", {}).then(res => {
      if (res.data?.cloudbeds?.roomTypes) setRoomTypes(res.data.cloudbeds.roomTypes);
    }).catch(() => {}).finally(() => setLoadingRooms(false));
  }, [load]);

  async function createNew(form) {
    await base44.entities.HotelTreatmentIntake.create(form);
    setShowNew(false);
    load();
  }

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.guestName?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) ||
      r.email?.toLowerCase().includes(search.toLowerCase());
    let matchStatus;
    if (statusFilter === "all") matchStatus = true;
    else if (statusFilter === "active") matchStatus = r.bookingStatus !== "archived" && r.bookingStatus !== "declined";
    else matchStatus = r.bookingStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminDashboard")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]">
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Reservation Intake</h1>
              <p className="text-xs text-[rgb(150,150,150)]">{records.length} records</p>
            </div>
          </div>
          <button onClick={() => setShowNew(v => !v)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Intake
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {showNew && (
          <div className="bg-[rgb(252,250,247)] border border-[rgb(220,210,200)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-medium text-[rgb(107,85,64)] mb-6" style={{ fontFamily: "Georgia, serif" }}>New Guest Intake</h2>
            <IntakeForm roomTypes={roomTypes} loading={loadingRooms} onSave={createNew} onCancel={() => setShowNew(false)} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(150,150,150)]" />
            <input placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white focus:outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white">
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="new_inquiry">New Inquiry</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[rgb(150,150,150)]">{records.length === 0 ? "No intakes yet — tap New Intake." : "No matches."}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => <IntakeCard key={r.id} record={r} onUpdate={load} roomTypes={roomTypes} loadingRooms={loadingRooms} />)}
          </div>
        )}
      </div>
    </div>
  );
}
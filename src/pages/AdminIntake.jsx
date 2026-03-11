import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, ChevronDown, ChevronUp,
  Save, CheckCircle2, Clock, Phone, Mail, MessageSquare, CreditCard, Loader2, CalendarCheck,
  Send, AlertTriangle
} from "lucide-react";
import TreatmentSlotPicker from "@/components/intake/TreatmentSlotPicker";
import TherapistSection from "@/components/intake/TherapistSection";

// ─── Treatments that require call-to-book (loaded from DB) ───────────────────
// booking_mode: call_to_book | call_and_info

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
const THERAPIST_STATUS_LABELS = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up: "Follow Up",
  approved: "✅ Approved",
  declined: "❌ Declined",
};
const THERAPIST_STATUS_COLORS = {
  not_contacted: "bg-gray-100 text-gray-500",
  contacted: "bg-blue-100 text-blue-700",
  follow_up: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};

const BLANK = {
  guestName: "", phone: "", email: "", preferredContactMethod: "phone",
  checkInDate: "", checkOutDate: "", numberOfGuests: 1, numberOfChildren: 0,
  cloudbedsRoomTypeId: "", flexibleOnRoom: false, hotelNotes: "",
  additionalGuests: [],
  selectedTreatments: [], callToBookTreatments: [],
  treatmentsRequested: "",
  therapistAssigned: "", therapistStatus: "not_contacted",
  therapistFollowUpDate: "", therapistNotes: "",
  howDidYouHearAboutUs: "",
  bookingStatus: "new_inquiry", followUpDate: "", internalNotes: "",
  ccName: "", ccNumber: "", ccLast4: "", ccExpiry: "", ccCvc: "", ccType: "", ccNotes: "",
};

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

function NumSelect({ value, onChange, max = 20, start = 0 }) {
  return (
    <select value={value} onChange={e => onChange(parseInt(e.target.value))} className={selectCls}>
      {Array.from({ length: max }, (_, i) => i + start).map(n => (
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
        <span className="text-xs font-extrabold tracking-widest text-[rgb(107,85,64)] uppercase whitespace-nowrap">{title}</span>
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

// Parse stored JSON treatment entries safely
function parseTreatmentEntries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === "object") return item;
    try { return JSON.parse(item); } catch { return { name: item, price: 0 }; }
  });
}

// Manual room fallback list
const MANUAL_ROOMS = [
  { id: "Suite 1", name: "Suite 1" },
  { id: "Suite 2", name: "Suite 2" },
  { id: "Suite 3", name: "Suite 3" },
  { id: "Suite 5", name: "Suite 5" },
  { id: "Carriage House", name: "Carriage House — The Carriage House" },
];

// ── Long-scroll intake form ────────────────────────────────────────────────────
function IntakeForm({ initial = BLANK, callToBookTreatments = [], onSave, onSaveAndSend, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...BLANK,
    ...initial,
    selectedTreatments: [],
    callToBookTreatments: [],
  }));
  const [sbEntries, setSbEntries] = useState(() => parseTreatmentEntries(initial.selectedTreatments));
  const [ctbEntries, setCtbEntries] = useState(() => parseTreatmentEntries(initial.callToBookTreatments));
  const [saving, setSaving] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);

  // Live room availability from Cloudbeds
  const [liveRooms, setLiveRooms] = useState([]);
  const [loadingLiveRooms, setLoadingLiveRooms] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  const [showManualRooms, setShowManualRooms] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Fetch live rooms when both dates are set
  useEffect(() => {
    const { checkInDate, checkOutDate } = form;
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setLiveRooms([]);
      setRoomsError(false);
      return;
    }
    let cancelled = false;
    setLoadingLiveRooms(true);
    setRoomsError(false);
    base44.functions.invoke("cloudbedsGetAvailableRooms", { startDate: checkInDate, endDate: checkOutDate })
      .then(res => {
        if (cancelled) return;
        if (res.data?.success && res.data?.rooms?.length > 0) {
          setLiveRooms(res.data.rooms.map(r => ({ id: String(r.roomTypeID), name: r.name + (r.price ? ` — $${r.price}/night` : "") })));
          setRoomsError(false);
        } else {
          setLiveRooms([]);
          setRoomsError(true);
        }
      })
      .catch(() => { if (!cancelled) { setLiveRooms([]); setRoomsError(true); } })
      .finally(() => { if (!cancelled) setLoadingLiveRooms(false); });
    return () => { cancelled = true; };
  }, [form.checkInDate, form.checkOutDate]);

  function buildPayload() {
    return {
      ...form,
      selectedTreatments: sbEntries.filter(e => e.serviceName || e.name).map(e => JSON.stringify(e)),
      callToBookTreatments: ctbEntries.filter(e => e.name).map(e => JSON.stringify(e)),
    };
  }

  async function submit() {
    setSaving(true);
    await onSave(buildPayload());
    setSaving(false);
  }

  async function submitAndSend() {
    setSaving(true);
    setSendConfirm(false);
    await onSaveAndSend(buildPayload());
    setSaving(false);
  }

  // Google Calendar deep link for follow-up date
  function openGoogleCalendar() {
    const date = form.followUpDate;
    if (!date) return;
    const [y, m, d] = date.split("-");
    const start = `${y}${m}${d}`;
    const title = encodeURIComponent(`Follow up: ${form.guestName} - Hotel RITUAL`);
    const details = encodeURIComponent(`Guest: ${form.guestName}\nPhone: ${form.phone}\nEmail: ${form.email}`);
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${start}&details=${details}`,
      "_blank"
    );
  }

  return (
    <div className="font-['Georgia',serif]">
      {/* Guest Info */}
      <Section title="Guest Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Guest Full Name *">
            <input placeholder="First Last" value={form.guestName} onChange={e => set("guestName", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Email">
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
            <NumSelect value={form.numberOfGuests} onChange={v => set("numberOfGuests", v)} max={20} start={1} />
          </Field>
          <Field label="Children">
            <NumSelect value={form.numberOfChildren || 0} onChange={v => set("numberOfChildren", v)} max={20} start={0} />
          </Field>
          <Field label="Room Type">
            {loadingRooms ? (
              <p className={fieldCls + " text-[rgb(170,155,140)]"}>Loading rooms…</p>
            ) : roomTypes.length > 0 ? (
              <select value={form.cloudbedsRoomTypeId} onChange={e => set("cloudbedsRoomTypeId", e.target.value)} className={selectCls}>
                <option value="">Select a room type</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            ) : (
              <input
                placeholder="Type room name manually (e.g. Suite 3, Carriage House)…"
                value={form.cloudbedsRoomTypeId}
                onChange={e => set("cloudbedsRoomTypeId", e.target.value)}
                className={fieldCls}
              />
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

      {/* Treatments — SimplyBook + Call-to-book */}
      <Section title="Spa & Wellness · Treatments">
        <TreatmentSlotPicker
          sbEntries={sbEntries}
          ctbEntries={ctbEntries}
          callToBookTreatments={callToBookTreatments}
          onSbChange={setSbEntries}
          onCtbChange={setCtbEntries}
          primaryGuestName={form.guestName}
          guestName={form.guestName}
          guestEmail={form.email}
        />
        <div className="mt-5">
          <Field label="Additional Treatment Notes">
            <textarea placeholder="Injuries, sensitivities, preferences…" value={form.treatmentsRequested} onChange={e => set("treatmentsRequested", e.target.value)} className={fieldCls + " resize-none h-16"} />
          </Field>
        </div>
      </Section>

      {/* Therapist Pipeline */}
      <Section title="Therapist Outreach · Pipeline">
        <TherapistSection
          form={form}
          onChange={set}
          sbEntries={sbEntries}
          ctbEntries={ctbEntries}
        />
      </Section>

      {/* Internal Notes & Status */}
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
          <div>
            <Field label="Follow-Up Date">
              <input type="date" value={form.followUpDate} onChange={e => set("followUpDate", e.target.value)} className={fieldCls} />
            </Field>
            {form.followUpDate && (
              <button
                type="button"
                onClick={openGoogleCalendar}
                className="flex items-center gap-1.5 text-xs text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)] mt-1.5 transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Add to Google Calendar
              </button>
            )}
          </div>
          <div className="sm:col-span-2">
            <Field label="Internal Notes">
              <textarea placeholder="Internal notes for the team…" value={form.internalNotes} onChange={e => set("internalNotes", e.target.value)} className={fieldCls + " resize-none h-24"} />
            </Field>
          </div>
        </div>
      </Section>

      {/* Additional Guests (Multi-guest for Cloudbeds) */}
      <Section title="Additional Guests · For Multi-Guest Reservations">
        <p className="text-xs text-[rgb(170,140,110)] mb-4">Add info for 2nd, 3rd, 4th guests as Cloudbeds requires.</p>
        <div className="space-y-4">
          {form.additionalGuests.map((guest, idx) => (
            <div key={idx} className="bg-[rgb(250,248,245)] border border-[rgb(220,210,200)] rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <Field label="Guest Name">
                  <input placeholder="First Last" value={guest.name} onChange={e => {
                    const updated = [...form.additionalGuests];
                    updated[idx].name = e.target.value;
                    set("additionalGuests", updated);
                  }} className={fieldCls} />
                </Field>
                <Field label="Email">
                  <input placeholder="guest@email.com" value={guest.email} onChange={e => {
                    const updated = [...form.additionalGuests];
                    updated[idx].email = e.target.value;
                    set("additionalGuests", updated);
                  }} className={fieldCls} />
                </Field>
                <Field label="Phone">
                  <input placeholder="(555) 000-0000" value={guest.phone} onChange={e => {
                    const updated = [...form.additionalGuests];
                    updated[idx].phone = e.target.value;
                    set("additionalGuests", updated);
                  }} className={fieldCls} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => set("additionalGuests", form.additionalGuests.filter((_, i) => i !== idx))}
                className="mt-2 text-xs text-red-600 hover:text-red-700"
              >
                Remove Guest
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("additionalGuests", [...form.additionalGuests, { name: "", email: "", phone: "" }])}
            className="text-xs text-[rgb(107,85,64)] hover:underline"
          >
            + Add Another Guest
          </button>
        </div>
      </Section>

      {/* Marketing Source & Card on File */}
      <Section title="Marketing & Payment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div className="sm:col-span-2">
            <Field label="How Did You Hear About Us?">
              <textarea placeholder="Referral, online search, social media, wedding planner…" value={form.howDidYouHearAboutUs} onChange={e => set("howDidYouHearAboutUs", e.target.value)} className={fieldCls + " resize-none h-12"} />
            </Field>
          </div>
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
          <Field label="Full Card Number">
            <input type="password" placeholder="•••• •••• •••• ••••" value={form.ccNumber} onChange={e => set("ccNumber", e.target.value)} className={fieldCls} />
          </Field>
          <Field label="Expiry MM/YY">
            <input placeholder="MM/YY" value={form.ccExpiry} onChange={e => set("ccExpiry", e.target.value)} className={fieldCls} maxLength={5} />
          </Field>
          <Field label="CVC">
            <input type="password" placeholder="•••" value={form.ccCvc} onChange={e => set("ccCvc", e.target.value)} className={fieldCls} maxLength={4} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Payment Notes">
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

// Expand record treatments for display (parse JSON strings)
function renderTreatments(arr, color = "bg-[rgb(240,235,228)] text-[rgb(107,85,64)]") {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.map((item, i) => {
    let label = item;
    try {
      const obj = typeof item === "string" ? JSON.parse(item) : item;
      label = `${obj.serviceName || obj.name || "Treatment"}${obj.date ? ` · ${obj.date}` : ""}${obj.time ? ` @ ${obj.time}` : ""}${obj.price ? ` · $${obj.price}` : ""}`;
    } catch {}
    return (
      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>
    );
  });
}

// ── Intake record card ────────────────────────────────────────────────────────
function IntakeCard({ record, onUpdate, roomTypes, loadingRooms, callToBookTreatments }) {
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

  // Build intake data enriched with parsed treatment objects for backend
  function buildIntakeForAction() {
    const sbParsed = parseTreatmentEntries(record.selectedTreatments || []);
    const ctbParsed = parseTreatmentEntries(record.callToBookTreatments || []);
    return { ...record, _sbEntries: sbParsed, _ctbEntries: ctbParsed };
  }

  async function runAction(type) {
    setActioning(type);
    setActionMsg(null);
    try {
      const intakeData = buildIntakeForAction();

      if (type === "SendQuote") {
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required." }); setActioning(null); return; }
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeCreateInvoiceDraft", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { 
          setActionMsg({ 
            success: true, 
            text: res.data?.message, 
            invoiceId: res.data?.invoiceId,
            draftUrl: res.data?.draftUrl,
            isPending: true
          });
        }

      } else if (type === "BookHotel") {
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required for Cloudbeds." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookHotel", { intake: intakeData });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { markCompleted("BookHotel"); setActionMsg({ success: true, text: res.data?.message || "Hotel booked!" }); setTimeout(() => { setActionMsg(null); onUpdate(); }, 5000); }

      } else if (type === "BookTreatments") {
        const sbParsed = parseTreatmentEntries(record.selectedTreatments || []);
        if (!sbParsed.length) { setActionMsg({ success: false, text: "No SimplyBook treatments selected." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookTreatments", {
          intake: { ...intakeData, selectedTreatments: sbParsed }
        });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { markCompleted("BookTreatments"); setActionMsg({ success: true, text: res.data?.message || "Treatments booked!" }); setTimeout(() => setActionMsg(null), 5000); }

      } else if (type === "PublishQuote") {
        if (!actionMsg?.invoiceId) { setActionMsg({ success: false, text: "No invoice to publish." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakePublishInvoice", { invoiceId: actionMsg.invoiceId });
        if (res.data?.error) setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) });
        else { 
          markCompleted("SendQuote"); 
          setActionMsg({ 
            success: true, 
            text: res.data?.message, 
            isPending: false 
          }); 
          setTimeout(() => setActionMsg(null), 5000); 
        }

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
  const hasSbTreatments = Array.isArray(record.selectedTreatments) && record.selectedTreatments.length > 0;
  const hasCtbTreatments = Array.isArray(record.callToBookTreatments) && record.callToBookTreatments.length > 0;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
      <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-4" onClick={() => { setExpanded(e => !e); setEditing(false); }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[rgb(45,45,45)]">{record.guestName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.bookingStatus] || "bg-gray-100 text-gray-600"}`}>
              {STATUS_LABELS[record.bookingStatus] || record.bookingStatus}
            </span>
            {record.therapistStatus && record.therapistStatus !== "not_contacted" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${THERAPIST_STATUS_COLORS[record.therapistStatus]}`}>
                🧘 {THERAPIST_STATUS_LABELS[record.therapistStatus]}
              </span>
            )}
            {hasHotel && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🏨 Hotel</span>}
            {hasSbTreatments && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✨ {record.selectedTreatments.length} tx</span>}
            {hasCtbTreatments && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">📞 {record.callToBookTreatments.length} ctb</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[rgb(120,120,120)] flex-wrap">
            {record.phone && <a href={`sms:${record.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[rgb(107,85,64)] hover:underline">{contactIcon} {record.phone}</a>}
            {record.checkInDate && <span>{record.checkInDate} → {record.checkOutDate}</span>}
            {record.followUpDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {record.followUpDate}</span>}
            {record.therapistAssigned && <span className="text-[rgb(150,170,155)]">🧘 {record.therapistAssigned}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[rgb(235,225,213)] px-5 py-5 bg-[rgb(250,248,245)]">
          {editing ? (
            <IntakeForm initial={record} roomTypes={roomTypes} loadingRooms={loadingRooms} callToBookTreatments={callToBookTreatments} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {record.email && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Email</p><a href={`mailto:${record.email}`} className="text-[rgb(107,85,64)] hover:underline">{record.email}</a></div>}
                {record.phone && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Phone</p><a href={`sms:${record.phone}`} className="text-[rgb(107,85,64)] hover:underline">{record.phone}</a></div>}
                {record.numberOfGuests && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Adults</p><p>{record.numberOfGuests}</p></div>}
                {record.checkInDate && <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Dates</p><p>{record.checkInDate} → {record.checkOutDate}</p></div>}
                {record.therapistAssigned && (
                  <div><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold">Therapist</p>
                    <p>{record.therapistAssigned}</p>
                    <p className={`text-xs font-medium mt-0.5 ${THERAPIST_STATUS_COLORS[record.therapistStatus]?.replace("bg-","").replace("100","") || ""}`}>
                      {THERAPIST_STATUS_LABELS[record.therapistStatus || "not_contacted"]}
                    </p>
                  </div>
                )}

                {hasSbTreatments && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">SimplyBook Treatments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {renderTreatments(record.selectedTreatments)}
                    </div>
                  </div>
                )}
                {hasCtbTreatments && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">Call-to-Book Treatments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {renderTreatments(record.callToBookTreatments, "bg-purple-50 text-purple-700")}
                    </div>
                  </div>
                )}
                {record.internalNotes && <div className="col-span-2 sm:col-span-3 bg-white rounded-xl p-3 border border-[rgb(220,210,200)]"><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">Notes</p><p className="whitespace-pre-wrap text-sm">{record.internalNotes}</p></div>}
                {record.therapistNotes && <div className="col-span-2 sm:col-span-3 bg-[rgb(245,250,246)] rounded-xl p-3 border border-[rgb(210,230,215)]"><p className="text-[10px] text-[rgb(100,150,110)] uppercase tracking-widest font-semibold mb-1">Therapist Notes</p><p className="whitespace-pre-wrap text-sm">{record.therapistNotes}</p></div>}
                {record.additionalGuests && record.additionalGuests.length > 0 && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-2">Additional Guests</p>
                    <div className="space-y-1 text-sm text-[rgb(45,45,45)]">
                      {record.additionalGuests.map((g, i) => <div key={i}>{g.name} {g.email && `· ${g.email}`} {g.phone && `· ${g.phone}`}</div>)}
                    </div>
                  </div>
                )}
                {record.howDidYouHearAboutUs && <div className="col-span-2 sm:col-span-3"><p className="text-[10px] text-[rgb(150,130,110)] uppercase tracking-widest font-semibold mb-1">Referral Source</p><p className="text-sm">{record.howDidYouHearAboutUs}</p></div>}
                {record.ccNumber && <div className="col-span-2 sm:col-span-3 border border-[rgb(220,210,200)] rounded-xl p-3 flex items-center gap-3"><CreditCard className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" /><span className="text-sm">{record.ccType && `${record.ccType} · `}•••• •••• •••• {record.ccNumber?.slice(-4)}{record.ccExpiry && ` · ${record.ccExpiry}`}{record.ccName && ` · ${record.ccName}`}</span></div>}
              </div>

              {actionMsg && (
                <div className={`text-xs rounded-xl border ${actionMsg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  <div className="px-3 py-2 font-medium">{actionMsg.text}</div>
                  {actionMsg.detail && <div className="border-t px-3 py-2"><pre className="whitespace-pre-wrap break-all font-mono text-[11px] max-h-40 overflow-y-auto">{actionMsg.detail}</pre></div>}
                  {actionMsg.isPending && actionMsg.draftUrl && (
                    <div className="border-t px-3 py-2 flex items-center gap-2 flex-wrap">
                      <a href={actionMsg.draftUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                        📄 Preview Invoice
                      </a>
                      <button 
                        onClick={() => runAction("PublishQuote")}
                        disabled={!!actioning}
                        className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Send to Guest
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[10px] text-[rgb(150,130,110)] font-semibold uppercase tracking-widest">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {hasHotel && <ActionBtn label="📧 Send Square Quote" actionKey="SendQuote" completed={completed} actioning={actioning} onClick={() => runAction("SendQuote")} variant="primary" />}
                  {hasHotel && <ActionBtn label="🏨 Book in Cloudbeds" actionKey="BookHotel" completed={completed} actioning={actioning} onClick={() => runAction("BookHotel")} />}
                  <a href="https://ritualtexas.simplybook.me/v2/#login" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl border border-[rgb(150,170,155)] text-xs text-[rgb(80,120,90)] hover:bg-[rgb(245,250,246)] transition-colors">
                    🧘 Book in SimplyBook
                  </a>
                  <ActionBtn label="👤 Add to CRM" actionKey="AddToCRM" completed={completed} actioning={actioning} onClick={() => runAction("AddToCRM")} />
                  <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Edit</button>
                </div>
                {hasSbTreatments && (
                  <p className="text-xs text-[rgb(150,130,110)] mt-2 italic">
                    ℹ️ Guest will use SimplyBook Scheduler directly to finalize spa bookings. This intake form is for planning & quoting.
                  </p>
                )}
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
  const [callToBookTreatments, setCallToBookTreatments] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Load room types - try Cloudbeds first, fall back to Suite entity
    const loadRooms = async () => {
      try {
        const res = await base44.functions.invoke("getIntakeFormData", {});
        if (res.data?.cloudbeds?.roomTypes?.length > 0) {
          setRoomTypes(res.data.cloudbeds.roomTypes);
          return;
        }
      } catch {}
      // Fallback: load from Suite entity
      try {
        const suites = await base44.entities.Suite.list("sort_order", 50);
        setRoomTypes(suites.filter(s => s.is_available !== false).map(s => ({
          id: s.id,
          name: s.name,
          maxOccupancy: s.max_occupancy || 2,
        })));
      } catch {}
      setLoadingRooms(false);
    };
    loadRooms().finally(() => setLoadingRooms(false));
    // Load call-to-book treatments from Treatment entity
    base44.entities.Treatment.list("sort_order", 100).then(all => {
      const ctb = all.filter(t =>
        t.is_available !== false &&
        (t.booking_mode === "call_to_book" || t.booking_mode === "call_and_info")
      );
      setCallToBookTreatments(ctb);
    }).catch(() => {});
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
            <IntakeForm roomTypes={roomTypes} loadingRooms={loadingRooms} callToBookTreatments={callToBookTreatments} onSave={createNew} onCancel={() => setShowNew(false)} />
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
            {filtered.map(r => <IntakeCard key={r.id} record={r} onUpdate={load} roomTypes={roomTypes} loadingRooms={loadingRooms} callToBookTreatments={callToBookTreatments} />)}
          </div>
        )}
      </div>
    </div>
  );
}
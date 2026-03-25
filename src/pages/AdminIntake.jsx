import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, Save, Send, CheckCircle2, Clock, Phone, Mail,
  MessageSquare, CreditCard, Loader2, CalendarCheck, AlertTriangle, LayoutGrid, List,
  ExternalLink, Copy
} from "lucide-react";
import TreatmentSlotPicker from "@/components/intake/TreatmentSlotPicker";
import TherapistSection from "@/components/intake/TherapistSection";
import InvoicePreviewModal from "@/components/intake/InvoicePreviewModal";
import PageHelpBanner from "@/components/PageHelpBanner";
import IntakeStatsBar from "@/components/intake/IntakeStatsBar";
import FollowUpBanner from "@/components/intake/FollowUpBanner";
import IntakePipelineView from "@/components/intake/IntakePipelineView";
import IntakeListView from "@/components/intake/IntakeListView";
import IntakeSidePanel from "@/components/intake/IntakeSidePanel";
import { appendLogEntry } from "@/components/intake/ActivityLog";

const INTAKE_HELP = `Hotel + Treatment intake forms — your central booking pipeline.

STATUS FLOW: New Inquiry → Pending → Confirmed → Booked/Reserved → (Lost / Do Not Contact / Archived)

1. Pipeline Card View: Records display as cards grouped by status column. Drag cards between columns to update status. Use the List View toggle (top right) for a compact sortable table — auto-switches when there are many records.
2. Side Panel: Click any record to open the detail panel. Contains full guest info, treatments, therapist notes, and four action buttons:
   • Book Hotel: Creates the Cloudbeds reservation directly from this record.
   • Book SimplyBook: Opens SimplyBook admin to confirm spa appointments manually.
   • Send Quote: Generates and sends a Square invoice to the guest's email.
   • Add to CRM: Syncs guest to the Master CRM.
3. Create New Intake: Click "+ New Intake". Fill in guest info, check-in/out dates, treatments, therapist, and card on file.
4. Live Room Availability: Enter check-in/out dates and the form auto-checks Cloudbeds for available rooms.
5. Treatments: SimplyBook treatments show date/time/provider. Call-to-book treatments are tracked separately.
6. GuestBookNow Auto-Arrivals: Bookings from the public GuestBookNow page arrive pre-confirmed with hotel and spa fields already populated — no manual entry needed.
7. Therapist Pipeline: Track outreach status (Not Contacted → Contacted → Approved) per intake.
8. Activity Log: Every record has a chronological log. Add notes for the team with the text box.
9. Archive: Removes from active view but keeps the record.`;

const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  booked_reserved: "bg-emerald-100 text-emerald-800",
  not_now: "bg-purple-100 text-purple-700",
  lost_price: "bg-orange-100 text-orange-700",
  lost_competitor: "bg-orange-100 text-orange-700",
  lost_no_response: "bg-orange-100 text-orange-700",
  lost_dates_unavailable: "bg-orange-100 text-orange-700",
  do_not_contact: "bg-red-200 text-red-800",
  declined: "bg-red-100 text-red-600",
  archived: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS = {
  new_inquiry: "New Inquiry",
  pending: "Pending",
  confirmed: "Confirmed",
  booked_reserved: "Booked / Reserved ✓",
  not_now: "Not Now (Future)",
  lost_price: "Lost – Price",
  lost_competitor: "Lost – Competitor",
  lost_no_response: "Lost – No Response",
  lost_dates_unavailable: "Lost – Dates N/A",
  do_not_contact: "Do Not Contact",
  declined: "Declined",
  archived: "Archived",
};

const SALES_TAXES = [
  { key: 'sales_state', label: 'State of Texas', rate: 6.25 },
  { key: 'sales_city', label: 'City of Jacksonville', rate: 1.00 },
  { key: 'sales_jedc', label: 'Jacksonville Economic Development (JEDC)', rate: 0.50 },
  { key: 'sales_county', label: 'Cherokee County', rate: 0.50 },
];
const HOTEL_TAXES = [
  { key: 'hotel_state', label: 'State of Texas', rate: 6.00, note: 'Applies to stays $15+/day.' },
  { key: 'hotel_city', label: 'City of Jacksonville', rate: 7.00, note: 'General municipal hotel tax.' },
  { key: 'hotel_venue', label: 'Jacksonville Venue Tax', rate: 2.00, note: 'Voter-approved civic projects.' },
];

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
  ccName: "", ccNumber: "", ccLast4: "", ccExpiry: "", ccCvc: "", ccZip: "", ccType: "", ccNotes: "",
  taxes: {},
  discountType: "none", discountValue: 0, discountLabel: "",
};

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

const MANUAL_ROOMS = [
  { id: "Suite 1", name: "Suite 1" },
  { id: "Suite 2", name: "Suite 2" },
  { id: "Suite 3", name: "Suite 3" },
  { id: "Suite 5", name: "Suite 5" },
  { id: "Carriage House", name: "Carriage House — The Carriage House" },
];

function parseTreatmentEntries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === "object") return item;
    try { return JSON.parse(item); } catch { return { name: item, price: 0 }; }
  });
}

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

function Field({ label, required, children }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isNextSevenDays(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0,0,0,0);
  const end = new Date(now); end.setDate(end.getDate() + 7);
  return d >= now && d <= end;
}

// ── Intake Form ────────────────────────────────────────────────────────────────
function IntakeForm({ initial = BLANK, bookOnlineTreatments = [], callToBookTreatments = [], allRecords = [], onSave, onSaveAndSend, onCancel }) {
  const [form, setForm] = useState(() => ({ ...BLANK, ...initial, selectedTreatments: [], callToBookTreatments: [] }));
  const [sbEntries, setSbEntries] = useState(() => parseTreatmentEntries(initial.selectedTreatments));
  const [ctbEntries, setCtbEntries] = useState(() => parseTreatmentEntries(initial.callToBookTreatments));

  // Reset form when `initial` record changes (e.g. switching between editing different records)
  const initialId = initial?.id;
  useEffect(() => {
    setForm({ ...BLANK, ...initial, selectedTreatments: [], callToBookTreatments: [] });
    setSbEntries(parseTreatmentEntries(initial.selectedTreatments));
    setCtbEntries(parseTreatmentEntries(initial.callToBookTreatments));
    setHasChanges(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);
  const [saving, setSaving] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState(() =>
    initial?.squareInvoiceId ? { success: true, invoiceId: initial.squareInvoiceId, publicUrl: initial.squareInvoiceUrl } : null
  );
  // (hasChanges declared above, useEffect below uses it safely)

  const [liveRooms, setLiveRooms] = useState([]);
  const [loadingLiveRooms, setLoadingLiveRooms] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  const [showManualRooms, setShowManualRooms] = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setHasChanges(true); };

  // Duplicate detection
  const duplicate = form.guestName?.length > 2 || form.phone?.length > 5
    ? allRecords.find(r => r.id !== initial?.id && (
        (form.guestName?.length > 2 && r.guestName?.toLowerCase() === form.guestName?.toLowerCase()) ||
        (form.phone?.length > 5 && r.phone && r.phone.replace(/\D/g,"") === form.phone.replace(/\D/g,""))
      ))
    : null;

  // Room conflict detection
  const roomConflict = (
    form.cloudbedsRoomTypeId &&
    form.checkInDate &&
    form.checkOutDate &&
    form.checkOutDate > form.checkInDate
  )
    ? allRecords.find(r =>
        r.id !== initial?.id &&
        r.cloudbedsRoomTypeId === form.cloudbedsRoomTypeId &&
        !["archived", "declined"].includes(r.bookingStatus) &&
        r.checkInDate && r.checkOutDate &&
        r.checkInDate < form.checkOutDate &&
        r.checkOutDate > form.checkInDate
      )
    : null;

  useEffect(() => {
    const { checkInDate, checkOutDate } = form;
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      setLiveRooms([]); setRoomsError(false); return;
    }
    let cancelled = false;
    setLoadingLiveRooms(true); setRoomsError(false);
    base44.functions.invoke("cloudbedsGetAvailableRooms", { startDate: checkInDate, endDate: checkOutDate })
      .then(res => {
        if (cancelled) return;
        if (res.data?.success && res.data?.rooms?.length > 0) {
          setLiveRooms(res.data.rooms.map(r => ({ id: String(r.roomTypeID), name: r.name + (r.price ? ` — $${r.price}/night` : "") })));
          setRoomsError(false);
        } else { setLiveRooms([]); setRoomsError(true); }
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
    setHasChanges(false);
    setSaving(false);
  }

  async function submitAndSend() {
    setSaving(true); setSendConfirm(false);
    await onSaveAndSend(buildPayload());
    setHasChanges(false);
    setSaving(false);
  }

  async function handleCreateInvoice() {
    if (!form.email) return;
    setInvoiceLoading(true);
    setInvoiceResult(null);
    try {
      // Auto-save first
      const payload = buildPayload();
      await onSave(payload);
      setHasChanges(false);
      // Create draft — pass full intake so discount/taxes are applied
      const draftRes = await base44.functions.invoke("intakeCreateInvoiceDraft", { intake: { ...payload, id: initial.id } });
      if (draftRes?.data?.error) throw new Error(draftRes.data.error);
      // Publish
      const pubRes = await base44.functions.invoke("intakePublishInvoice", { invoiceId: draftRes.data.invoiceId });
      const publicUrl = pubRes?.data?.invoice?.public_url || pubRes?.data?.publicUrl;
      setInvoiceResult({ success: true, invoiceId: draftRes.data.invoiceId, publicUrl, message: `Invoice sent to ${form.email}` });
    } catch (err) {
      setInvoiceResult({ success: false, error: err.message || "Invoice creation failed" });
    } finally {
      setInvoiceLoading(false);
    }
  }

  function openGoogleCalendar() {
    const date = form.followUpDate;
    if (!date) return;
    const [y, m, d] = date.split("-");
    const start = `${y}${m}${d}`;
    const title = encodeURIComponent(`Follow up: ${form.guestName} - Hotel RITUAL`);
    const details = encodeURIComponent(`Guest: ${form.guestName}\nPhone: ${form.phone}\nEmail: ${form.email}`);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${start}&details=${details}`, "_blank");
  }

  // Auto-apply taxes based on booking content
  useEffect(() => {
    const hasRoom = !!(form.checkInDate && form.checkOutDate);

    if (!hasRoom) return;

    setForm(prev => {
      const currentTaxes = prev.taxes || {};
      const next = { ...currentTaxes };
      let changed = false;

      if (hasRoom) {
        ["hotel_state", "hotel_city", "hotel_venue"].forEach(key => {
          if (!next[key]) { next[key] = true; changed = true; }
        });
      }

      return changed ? { ...prev, taxes: next } : prev;
    });
  }, [form.checkInDate, form.checkOutDate]);

  const isValid = !!form.guestName && (!!form.phone || !!form.email) && !!form.checkInDate && !!form.checkOutDate;

  return (
    <div className="font-['Georgia',serif]">
      {/* Duplicate detection banner */}
      {duplicate && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Heads up: a record for <strong className="mx-1">{duplicate.guestName}</strong> already exists.
        </div>
      )}

      {/* Room conflict warning */}
      {roomConflict && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm text-red-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{roomConflict.roomRequested || roomConflict.cloudbedsRoomTypeId}</strong> is already assigned to <strong>{roomConflict.guestName}</strong> ({roomConflict.checkInDate} → {roomConflict.checkOutDate}). Check dates or choose a different room.
          </span>
        </div>
      )}

      <Section title="Guest Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Guest Full Name" required><input placeholder="First Last" value={form.guestName} onChange={e => set("guestName", e.target.value)} className={fieldCls} /></Field>
          <Field label="Email" required><input placeholder="guest@email.com" value={form.email} onChange={e => set("email", e.target.value)} className={fieldCls} /></Field>
          <Field label="Phone" required><input placeholder="(555) 000-0000" value={form.phone} onChange={e => set("phone", e.target.value)} className={fieldCls} /></Field>
          <Field label="Preferred Contact Method">
            <select value={form.preferredContactMethod} onChange={e => set("preferredContactMethod", e.target.value)} className={selectCls}>
              <option value="phone">Phone Call</option>
              <option value="text">Text Message</option>
              <option value="email">Email</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Hotel Reservation · Cloudbeds">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Check-In Date" required><input type="date" value={form.checkInDate} onChange={e => set("checkInDate", e.target.value)} className={fieldCls} /></Field>
          <Field label="Check-Out Date" required><input type="date" value={form.checkOutDate} onChange={e => set("checkOutDate", e.target.value)} className={fieldCls} /></Field>
          <Field label="Adults"><NumSelect value={form.numberOfGuests} onChange={v => set("numberOfGuests", v)} max={20} start={1} /></Field>
          <Field label="Children"><NumSelect value={form.numberOfChildren || 0} onChange={v => set("numberOfChildren", v)} max={20} start={0} /></Field>
          <Field label="Room Type">
            {!form.checkInDate || !form.checkOutDate ? (
              // Show existing value if we have one, even without dates
              form.cloudbedsRoomTypeId ? (
                <div className="space-y-1">
                  <p className={fieldCls + " text-[rgb(107,85,64)]"}>
                    {MANUAL_ROOMS.find(r => r.id === form.cloudbedsRoomTypeId)?.name || form.cloudbedsRoomTypeId}
                  </p>
                  <p className="text-xs text-[rgb(170,150,130)]">Enter dates to re-check availability</p>
                </div>
              ) : (
                <p className={fieldCls + " text-[rgb(190,170,150)] italic"}>Enter dates above to see available rooms</p>
              )
            ) : loadingLiveRooms ? (
              <p className={fieldCls + " text-[rgb(170,155,140)] flex items-center gap-2"}><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> Checking Cloudbeds availability…</p>
            ) : liveRooms.length > 0 ? (
              <select value={form.cloudbedsRoomTypeId} onChange={e => set("cloudbedsRoomTypeId", e.target.value)} className={selectCls}>
                <option value="">Select available room</option>
                {liveRooms.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            ) : (
              <div className="space-y-2">
                {roomsError && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Cloudbeds unavailable for these dates.
                    {!showManualRooms && <button type="button" onClick={() => setShowManualRooms(true)} className="ml-auto underline font-semibold whitespace-nowrap">Enter Manually</button>}
                  </div>
                )}
                {(showManualRooms || form.cloudbedsRoomTypeId) && (
                  <select value={form.cloudbedsRoomTypeId} onChange={e => set("cloudbedsRoomTypeId", e.target.value)} className={selectCls}>
                    <option value="">Select room manually</option>
                    {MANUAL_ROOMS.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                  </select>
                )}
              </div>
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

      <Section title="Additional Guests · For Multi-Guest Reservations">
        <p className="text-xs text-[rgb(170,140,110)] mb-4">Add info for 2nd, 3rd, 4th guests as Cloudbeds requires.</p>
        <div className="space-y-4">
          {form.additionalGuests.map((guest, idx) => (
            <div key={idx} className="bg-[rgb(250,248,245)] border border-[rgb(220,210,200)] rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <Field label="Guest Name"><input placeholder="First Last" value={guest.name} onChange={e => { const u = [...form.additionalGuests]; u[idx].name = e.target.value; set("additionalGuests", u); }} className={fieldCls} /></Field>
                <Field label="Email"><input placeholder="guest@email.com" value={guest.email} onChange={e => { const u = [...form.additionalGuests]; u[idx].email = e.target.value; set("additionalGuests", u); }} className={fieldCls} /></Field>
                <Field label="Phone"><input placeholder="(555) 000-0000" value={guest.phone} onChange={e => { const u = [...form.additionalGuests]; u[idx].phone = e.target.value; set("additionalGuests", u); }} className={fieldCls} /></Field>
              </div>
              <button type="button" onClick={() => set("additionalGuests", form.additionalGuests.filter((_, i) => i !== idx))} className="mt-2 text-xs text-red-600 hover:text-red-700">Remove Guest</button>
            </div>
          ))}
          <button type="button" onClick={() => set("additionalGuests", [...form.additionalGuests, { name: "", email: "", phone: "" }])} className="text-xs text-[rgb(107,85,64)] hover:underline">+ Add Another Guest</button>
        </div>
      </Section>

      <Section title="Spa & Wellness · Treatments">
        <TreatmentSlotPicker
          sbEntries={sbEntries}
          ctbEntries={ctbEntries}
          bookOnlineTreatments={bookOnlineTreatments}
          callToBookTreatments={callToBookTreatments}
          onSbChange={setSbEntries}
          onCtbChange={setCtbEntries}
          primaryGuestName={form.guestName}
          guestNames={[form.guestName, ...form.additionalGuests.map(g => g.name)].filter(Boolean)}
        />
        <div className="mt-5">
          <Field label="Additional Treatment Notes">
            <textarea placeholder="Injuries, sensitivities, preferences…" value={form.treatmentsRequested} onChange={e => set("treatmentsRequested", e.target.value)} className={fieldCls + " resize-none h-16"} />
          </Field>
        </div>
      </Section>

      <Section title="Therapist Outreach · Pipeline">
        <TherapistSection form={form} onChange={set} sbEntries={sbEntries} ctbEntries={ctbEntries} />
      </Section>

      <Section title="Internal Notes & Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Booking Status">
            <select value={form.bookingStatus} onChange={e => set("bookingStatus", e.target.value)} className={selectCls}>
              <optgroup label="Active">
                <option value="new_inquiry">New Inquiry</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="booked_reserved">Booked / Reserved ✓</option>
              </optgroup>
              <optgroup label="Closed / Lost">
                <option value="not_now">Not Now (Future Interest)</option>
                <option value="lost_price">Lost – Price Too High</option>
                <option value="lost_competitor">Lost – Went with Competitor</option>
                <option value="lost_no_response">Lost – No Response</option>
                <option value="lost_dates_unavailable">Lost – Dates Unavailable</option>
                <option value="do_not_contact">Do Not Contact</option>
                <option value="declined">Declined</option>
                <option value="archived">Archived</option>
              </optgroup>
            </select>
          </Field>
          {["not_now","lost_price","lost_competitor","lost_no_response","lost_dates_unavailable","declined"].includes(form.bookingStatus) && (
            <div className="sm:col-span-2">
              <Field label="Lost / Closed Reason (Optional)">
                <textarea placeholder="Any additional context on why this lead was lost…" value={form.lostReason || ""} onChange={e => set("lostReason", e.target.value)} className={fieldCls + " resize-none h-14"} />
              </Field>
            </div>
          )}
          <div>
            <Field label="Follow-Up Date">
              <input type="date" value={form.followUpDate} onChange={e => set("followUpDate", e.target.value)} className={fieldCls} />
            </Field>
            {form.followUpDate && (
              <button type="button" onClick={openGoogleCalendar} className="flex items-center gap-1.5 text-xs text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)] mt-1.5 transition-colors">
                <CalendarCheck className="w-3.5 h-3.5" /> Add to Google Calendar
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Marketing & Payment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div className="sm:col-span-2">
            <Field label="How Did You Hear About Us?">
              <textarea placeholder="Referral, online search, social media, wedding planner…" value={form.howDidYouHearAboutUs} onChange={e => set("howDidYouHearAboutUs", e.target.value)} className={fieldCls + " resize-none h-12"} />
            </Field>
          </div>
          <Field label="Cardholder Name"><input placeholder="Name on card" value={form.ccName} onChange={e => set("ccName", e.target.value)} className={fieldCls} /></Field>
          <Field label="Card Type">
            <select value={form.ccType} onChange={e => set("ccType", e.target.value)} className={selectCls}>
              <option value="">Select type</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Discover">Discover</option>
            </select>
          </Field>
          <Field label="Full Card Number"><input type="password" placeholder="•••• •••• •••• ••••" value={form.ccNumber} onChange={e => set("ccNumber", e.target.value)} className={fieldCls} /></Field>
          <Field label="Expiry MM/YY"><input placeholder="MM/YY" value={form.ccExpiry} onChange={e => set("ccExpiry", e.target.value)} className={fieldCls} maxLength={5} /></Field>
          <Field label="CVC"><input type="password" placeholder="•••" value={form.ccCvc} onChange={e => set("ccCvc", e.target.value)} className={fieldCls} maxLength={4} /></Field>
          <Field label="Billing ZIP"><input placeholder="00000" value={form.ccZip || ""} onChange={e => set("ccZip", e.target.value)} className={fieldCls} maxLength={10} /></Field>
          <div className="sm:col-span-2">
            <Field label="Payment Notes"><textarea placeholder="Deposit auth amount, date, any notes…" value={form.ccNotes} onChange={e => set("ccNotes", e.target.value)} className={fieldCls + " resize-none h-14"} /></Field>
          </div>
        </div>
      </Section>

      <Section title="Taxes · Quote Line Items">
        {/* Tax preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={() => set("taxes", { ...form.taxes, hotel_state: true, hotel_city: true, hotel_venue: true })} className="text-xs px-3 py-1.5 rounded-lg bg-[rgb(248,246,242)] border border-[rgb(220,210,200)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]">Apply All Hotel Taxes</button>
          <button type="button" onClick={() => set("taxes", { ...form.taxes, sales_state: true, sales_city: true, sales_jedc: true, sales_county: true })} className="text-xs px-3 py-1.5 rounded-lg bg-[rgb(248,246,242)] border border-[rgb(220,210,200)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]">Apply All Sales Taxes</button>
          <button type="button" onClick={() => set("taxes", {})} className="text-xs px-3 py-1.5 rounded-lg border border-[rgb(235,225,213)] text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)]">Clear All</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Sales Tax (Retail / Treatments)</p>
            <p className="text-xs text-[rgb(170,150,130)] mb-3">Combined rate: 8.25%</p>
            <div className="space-y-2">
              {SALES_TAXES.map(tax => (
                <label key={tax.key} className="flex items-center gap-2 cursor-pointer text-sm text-[rgb(45,45,45)]">
                  <input type="checkbox" checked={!!(form.taxes || {})[tax.key]} onChange={e => set("taxes", { ...(form.taxes || {}), [tax.key]: e.target.checked })} className="accent-[rgb(107,85,64)] w-4 h-4" />
                  <span className="flex-1">{tax.label}</span>
                  <span className="text-[rgb(107,85,64)] font-medium">{tax.rate}%</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-2">Hotel Occupancy Tax (Room Stay)</p>
            <p className="text-xs text-[rgb(170,150,130)] mb-3">Combined rate: 15.00%</p>
            <div className="space-y-2">
              {HOTEL_TAXES.map(tax => (
                <label key={tax.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!(form.taxes || {})[tax.key]} onChange={e => set("taxes", { ...(form.taxes || {}), [tax.key]: e.target.checked })} className="accent-[rgb(107,85,64)] w-4 h-4" />
                  <div className="flex-1">
                    <span className="text-sm text-[rgb(45,45,45)]">{tax.label}</span>
                    {tax.note && <p className="text-xs text-[rgb(170,150,130)]">{tax.note}</p>}
                  </div>
                  <span className="text-[rgb(107,85,64)] font-medium text-sm">{tax.rate}%</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Discount">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
          <Field label="Discount Type">
            <select value={form.discountType || "none"} onChange={e => set("discountType", e.target.value)} className={selectCls}>
              <option value="none">No Discount</option>
              <option value="percent">Percentage Off (%)</option>
              <option value="dollar">Fixed Dollar Amount ($)</option>
            </select>
          </Field>
          {(form.discountType === "percent" || form.discountType === "dollar") && (
            <Field label={form.discountType === "percent" ? "Discount %" : "Discount $"}>
              <input
                type="number"
                min="0"
                step={form.discountType === "percent" ? "0.5" : "1"}
                max={form.discountType === "percent" ? "100" : undefined}
                placeholder={form.discountType === "percent" ? "e.g. 10" : "e.g. 50"}
                value={form.discountValue || ""}
                onChange={e => set("discountValue", parseFloat(e.target.value) || 0)}
                className={fieldCls}
              />
            </Field>
          )}
          {(form.discountType === "percent" || form.discountType === "dollar") && (
            <Field label="Discount Label (optional)">
              <input
                type="text"
                placeholder="e.g. Loyalty Discount, Package Deal"
                value={form.discountLabel || ""}
                onChange={e => set("discountLabel", e.target.value)}
                className={fieldCls}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* Square Invoice Section — only for existing saved records */}
      {initial?.id && (
        <Section title="Square Invoice">
          <p className="text-xs text-[rgb(150,150,150)] mb-4">
            Create and send a Square invoice to the guest without leaving this form.
          </p>
          {!invoiceResult ? (
            <div className="flex flex-col gap-3">
              {!form.email && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Guest email required to send invoice
                </p>
              )}
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={invoiceLoading || !form.email}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {invoiceLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Invoice…</>
                  : <><CreditCard className="w-4 h-4" /> Create &amp; Send Invoice</>
                }
              </button>
            </div>
          ) : invoiceResult.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Invoice sent to {form.email}
              </div>
              {invoiceResult.publicUrl && (
                <div className="flex gap-2">
                  <a
                    href={invoiceResult.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Payment Page
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(invoiceResult.publicUrl)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium"
                  >
                    <Copy className="w-4 h-4" /> Copy Link
                  </button>
                </div>
              )}
              <button type="button" onClick={() => setInvoiceResult(null)} className="text-xs text-[rgb(150,150,150)] underline hover:text-[rgb(107,85,64)]">
                Create a new invoice
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                ⚠️ {invoiceResult.error}
              </div>
              <button type="button" onClick={() => setInvoiceResult(null)} className="text-xs text-[rgb(150,150,150)] underline hover:text-[rgb(107,85,64)]">
                Try again
              </button>
            </div>
          )}
        </Section>
      )}

      <div className="pt-4 border-t border-[rgb(220,210,200)] space-y-3">
        {sendConfirm && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">⚠️ Send Quote Now?</p>
            <p className="text-xs text-amber-700">This will create a Square invoice draft and send it to <strong>{form.email || "the guest"}</strong>.</p>
            <div className="flex gap-2">
              <button type="button" onClick={submitAndSend} disabled={saving} className="flex-1 py-2 bg-[rgb(107,85,64)] text-white text-sm font-medium rounded-lg hover:bg-[rgb(85,65,45)] disabled:opacity-50">{saving ? "Sending…" : "Yes, Send Quote"}</button>
              <button type="button" onClick={() => setSendConfirm(false)} className="flex-1 py-2 border border-amber-300 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-100">Return to Editing</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={saving || !form.guestName}
            title={!isValid ? "Please fill in required fields (name, contact, dates)" : ""}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Form"}
          </button>
          {onSaveAndSend && initial?.id && (
            <button type="button" onClick={() => setSendConfirm(true)} disabled={saving || !form.guestName || !form.email} title={!form.email ? "Guest email required to send quote" : ""}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[rgb(150,170,155)] text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" /> View Quote Before Sending
            </button>
          )}
          {onCancel && <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[rgb(220,210,200)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Cancel</button>}
          <span className={`text-xs ml-auto ${hasChanges ? "text-amber-600" : "text-[rgb(150,170,155)]"}`}>
            {hasChanges ? "Unsaved changes" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Revenue Bar ───────────────────────────────────────────────────────────────
const ROOM_RATE = 198;

function nightsBetween(ci, co) {
  if (!ci || !co) return 0;
  const a = new Date(ci + "T00:00:00");
  const b = new Date(co + "T00:00:00");
  return Math.max(0, Math.round((b - a) / 86400000));
}

function recordValue(r) {
  const nights = nightsBetween(r.checkInDate, r.checkOutDate);
  const roomAmt = nights * ROOM_RATE;
  const treatments = [
    ...parseTreatmentEntries(r.selectedTreatments || []),
    ...parseTreatmentEntries(r.callToBookTreatments || []),
  ];
  const txAmt = treatments.reduce((s, t) => s + Number(t.price || 0), 0);
  return roomAmt + txAmt;
}

function fmtRevenue(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function IntakeRevenueBar({ records }) {
  const activeStatuses = ["new_inquiry", "pending", "confirmed", "booked_reserved"];
  const active = records.filter(r => activeStatuses.includes(r.bookingStatus));
  const pipelineTotal = active.reduce((s, r) => s + recordValue(r), 0);

  const confirmedTotal = records
    .filter(r => r.bookingStatus === "confirmed" || r.bookingStatus === "booked_reserved")
    .reduce((s, r) => s + recordValue(r), 0);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;
  const thisMonthTotal = records
    .filter(r =>
      (r.bookingStatus === "confirmed" || r.bookingStatus === "booked_reserved") &&
      r.checkInDate >= monthStart && r.checkInDate <= monthEnd
    )
    .reduce((s, r) => s + recordValue(r), 0);

  if (pipelineTotal === 0) return null;

  const bars = [
    { label: "Pipeline (Active)", value: pipelineTotal, color: "text-[rgb(107,85,64)]" },
    { label: "Confirmed Value", value: confirmedTotal, color: "text-green-700" },
    { label: "This Month (Check-ins)", value: thisMonthTotal, color: "text-blue-700" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {bars.map(b => (
        <div key={b.label} className="bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3 text-center">
          <div className={`text-lg font-semibold ${b.color}`}>{fmtRevenue(b.value)}</div>
          <div className="text-[10px] text-[rgb(150,150,150)] tracking-wide mt-0.5">{b.label}</div>
        </div>
      ))}
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
  const [callToBookTreatments, setCallToBookTreatments] = useState([]);
  const [bookOnlineTreatments, setBookOnlineTreatments] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewMode, setViewMode] = useState("pipeline"); // "pipeline" | "list"
  const [sortKey, setSortKey] = useState("newest");
  const [user, setUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch {}
    };
    loadUser();
    const loadRooms = async () => {
      try {
        const res = await base44.functions.invoke("getIntakeFormData", {});
        if (res.data?.cloudbeds?.roomTypes?.length > 0) return;
      } catch {}
    };
    loadRooms();
    base44.entities.Treatment.list("sort_order", 100).then(all => {
      const active = all.filter(t => t.is_available !== false);
      setCallToBookTreatments(active.filter(t => t.booking_mode === "call_to_book" || t.booking_mode === "call_and_info"));
      setBookOnlineTreatments(active.filter(t => t.booking_mode === "book_online" || !t.booking_mode));
    }).catch(() => {});
  }, [load]);

  async function syncToCRM(form, recordId) {
    try {
      const nameParts = form.guestName?.trim().split(" ") || [];
      const res = await base44.functions.invoke("crmUpsertContact", {
        firstName: nameParts[0] || form.guestName, lastName: nameParts.slice(1).join(" ") || "",
        fullName: form.guestName, email: form.email || "", phone: form.phone || "", tags: ["intake"],
      });
      if (res.data?.ok) {
        await base44.entities.HotelTreatmentIntake.update(recordId, { crmSynced: true });
      }
    } catch {}
  }

  async function createNew(form) {
    const authorName = user?.full_name || "Staff";
    const newLog = appendLogEntry("", new Date().toISOString(), "Record created", authorName);
    const record = await base44.entities.HotelTreatmentIntake.create({ ...form, internalNotes: newLog });
    setShowNew(false);
    load();
    if (record?.id) syncToCRM(form, record.id);
  }

  async function createNewAndSend(form) {
    const authorName = user?.full_name || "Staff";
    const newLog = appendLogEntry("", new Date().toISOString(), "Record created", authorName);
    const record = await base44.entities.HotelTreatmentIntake.create({ ...form, internalNotes: newLog });
    setShowNew(false);
    load();
    if (record?.id) syncToCRM(form, record.id);
    if (form.email && form.checkInDate && form.checkOutDate) {
      try { await base44.functions.invoke("intakeCreateInvoiceDraft", { intake: { ...form, id: record?.id } }); } catch {}
    }
  }

  async function saveEdit(form) {
    await base44.entities.HotelTreatmentIntake.update(editingRecord.id, form);
    setEditingRecord(null);
    setSelectedRecord(null);
    load();
  }

  // Filter logic
  const today = todayStr();
  function applyFilter(r) {
    const matchSearch = !search ||
      r.guestName?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) ||
      r.email?.toLowerCase().includes(search.toLowerCase());

    const LOST_STATUSES = ["archived","declined","not_now","lost_price","lost_competitor","lost_no_response","lost_dates_unavailable","do_not_contact"];
    let matchStatus = true;
    if (statusFilter === "active") matchStatus = !LOST_STATUSES.includes(r.bookingStatus);
    else if (statusFilter === "new_inquiry") matchStatus = r.bookingStatus === "new_inquiry";
    else if (statusFilter === "pending") matchStatus = r.bookingStatus === "pending";
    else if (statusFilter === "confirmed") matchStatus = r.bookingStatus === "confirmed";
    else if (statusFilter === "confirmed_month") {
      const d = r.checkInDate;
      const now = new Date();
      matchStatus = r.bookingStatus === "confirmed" && d && new Date(d + "T00:00:00").getMonth() === now.getMonth() && new Date(d + "T00:00:00").getFullYear() === now.getFullYear();
    } else if (statusFilter === "arriving_week") {
      matchStatus = isNextSevenDays(r.checkInDate) && r.bookingStatus !== "archived" && r.bookingStatus !== "declined";
    } else if (statusFilter === "overdue_followup") {
      matchStatus = r.followUpDate && r.followUpDate <= today && !["confirmed", "archived", "declined"].includes(r.bookingStatus);
    } else if (statusFilter !== "all") matchStatus = r.bookingStatus === statusFilter;

    return matchSearch && matchStatus;
  }

  function applySort(arr) {
    const copy = [...arr];
    if (sortKey === "newest") return copy.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    if (sortKey === "oldest") return copy.sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""));
    if (sortKey === "checkin") return copy.sort((a, b) => (a.checkInDate || "").localeCompare(b.checkInDate || ""));
    if (sortKey === "followup") return copy.sort((a, b) => (a.followUpDate || "").localeCompare(b.followUpDate || ""));
    return copy;
  }

  const filtered = applySort(records.filter(applyFilter));

  // Auto-switch view based on result count when filters change
  useEffect(() => {
    setViewMode(filtered.length > 3 ? "list" : "pipeline");
  }, [search, statusFilter, records]);

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminDashboard")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]" onClick={e => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}>
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Reservation Intake</h1>
              <p className="text-xs text-[rgb(150,150,150)]">{records.length} records</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-[rgb(235,225,213)] rounded-xl overflow-hidden">
              <button onClick={() => setViewMode("pipeline")} className={`p-2 transition-colors ${viewMode === "pipeline" ? "bg-[rgb(107,85,64)] text-white" : "bg-white text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)]"}`} title="Pipeline view"><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-[rgb(107,85,64)] text-white" : "bg-white text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)]"}`} title="List view"><List className="w-4 h-4" /></button>
            </div>
            <button onClick={() => { setShowNew(v => !v); setEditingRecord(null); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> New Intake
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        {/* New Intake Form */}
        {showNew && (
          <div className="bg-[rgb(252,250,247)] border border-[rgb(220,210,200)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-medium text-[rgb(107,85,64)] mb-6" style={{ fontFamily: "Georgia, serif" }}>New Guest Intake</h2>
            <IntakeForm bookOnlineTreatments={bookOnlineTreatments} callToBookTreatments={callToBookTreatments} allRecords={records} onSave={createNew} onSaveAndSend={createNewAndSend} onCancel={() => setShowNew(false)} />
          </div>
        )}

        {/* Edit Form (full record) */}
        {editingRecord && (
          <div className="bg-[rgb(252,250,247)] border border-[rgb(220,210,200)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-medium text-[rgb(107,85,64)] mb-6" style={{ fontFamily: "Georgia, serif" }}>Editing: {editingRecord.guestName}</h2>
            <IntakeForm initial={editingRecord} bookOnlineTreatments={bookOnlineTreatments} callToBookTreatments={callToBookTreatments} allRecords={records} onSave={saveEdit} onCancel={() => setEditingRecord(null)} />
          </div>
        )}

        <PageHelpBanner title="Reservation Intake" content={INTAKE_HELP} accentColor="rgb(107,85,64)" />

        {/* Stats Bar */}
        <IntakeStatsBar records={records} activeFilter={statusFilter} onFilter={setStatusFilter} />
        <IntakeRevenueBar records={records} />

        {/* Follow-up Banner */}
        <FollowUpBanner records={records} onFilter={setStatusFilter} />

        {/* Search + Filter Bar */}
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
            <option value="booked_reserved">Booked / Reserved</option>
            <option value="overdue_followup">Overdue Follow-Up</option>
            <option value="arriving_week">Arriving This Week</option>
            <option value="declined">Declined</option>
            <option value="not_now">Not Now</option>
            <option value="lost_price">Lost – Price</option>
            <option value="lost_competitor">Lost – Competitor</option>
            <option value="lost_no_response">Lost – No Response</option>
            <option value="lost_dates_unavailable">Lost – Dates N/A</option>
            <option value="do_not_contact">Do Not Contact</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" /></div>
        ) : viewMode === "pipeline" ? (
          <IntakePipelineView
            records={filtered}
            onSelect={r => { setSelectedRecord(r); setEditingRecord(null); }}
            onUpdate={load}
          />
        ) : (
          <IntakeListView
            records={filtered}
            onSelect={r => { setSelectedRecord(r); setEditingRecord(null); }}
            sortKey={sortKey}
            onSortChange={setSortKey}
          />
        )}
      </div>

      {/* Side Panel */}
      {selectedRecord && !editingRecord && (
        <IntakeSidePanel
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={async () => {
            const fresh = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
            setRecords(fresh);
            setSelectedRecord(prev => fresh.find(r => r.id === prev?.id) || prev);
          }}
          onEdit={() => { setEditingRecord(selectedRecord); setSelectedRecord(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}
    </div>
  );
}
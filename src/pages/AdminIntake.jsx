import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Search, ChevronDown, ChevronUp, Save, CheckCircle2, Clock, XCircle, Phone, Mail, MessageSquare, CreditCard, Lock } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};
const STATUS_LABELS = {
  new_inquiry: "New Inquiry",
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
};
const VERIFY_COLORS = {
  pending: "bg-yellow-50 text-yellow-600",
  confirmed: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-600",
};

const BLANK = {
  guestName: "", phone: "", email: "", preferredContactMethod: "phone",
  numberOfGuests: 1, checkInDate: "", checkOutDate: "", roomRequested: "",
  flexibleOnRoom: false, selectedTreatments: [], treatmentsRequested: "", preferredTherapist: "",
  preferredTreatmentDate: "", preferredTreatmentTime: "", flexibleOnTime: false,
  therapistContacted: false, therapistConfirmed: false, therapistResponseNotes: "",
  verificationStatus: "pending", bookingStatus: "new_inquiry", followUpDate: "", internalNotes: "",
  ccName: "", ccLast4: "", ccExpiry: "", ccType: "", ccNotes: "",
};

function IntakeForm({ initial = BLANK, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [saving, setSaving] = useState(false);
  const [treatments, setTreatments] = useState([]);

  useEffect(() => {
    base44.entities.Treatment.list("sort_order", 50)
      .then(t => setTreatments(t.filter(x => x.is_available !== false)))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const chk = (e) => set(e.target.name, e.target.type === "checkbox" ? e.target.checked : e.target.value);

  function toggleTreatment(name) {
    const cur = form.selectedTreatments || [];
    set("selectedTreatments", cur.includes(name) ? cur.filter(n => n !== name) : [...cur, name]);
  }

  async function submit() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inputCls = "w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)]";
  const labelCls = "flex items-center gap-2 text-sm text-[rgb(45,45,45)] cursor-pointer select-none";
  const sectionTitle = "text-xs tracking-widest font-semibold text-[rgb(150,150,150)] uppercase mb-3";

  return (
    <div className="space-y-6">
      {/* Guest Info */}
      <div>
        <p className={sectionTitle}>Guest Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="guestName" placeholder="Guest Name *" value={form.guestName} onChange={chk} className={inputCls} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={chk} className={inputCls} />
          <input name="email" placeholder="Email" value={form.email} onChange={chk} className={inputCls} />
          <select name="preferredContactMethod" value={form.preferredContactMethod} onChange={chk} className={inputCls}>
            <option value="phone">Phone</option>
            <option value="text">Text</option>
            <option value="email">Email</option>
          </select>
          <input type="number" name="numberOfGuests" placeholder="# Guests" value={form.numberOfGuests} onChange={chk} className={inputCls} min={1} />
        </div>
      </div>

      {/* Stay Details */}
      <div>
        <p className={sectionTitle}>Stay Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="text-xs text-[rgb(150,150,150)] mb-1 block">Check-In</label><input type="date" name="checkInDate" value={form.checkInDate} onChange={chk} className={inputCls} /></div>
          <div><label className="text-xs text-[rgb(150,150,150)] mb-1 block">Check-Out</label><input type="date" name="checkOutDate" value={form.checkOutDate} onChange={chk} className={inputCls} /></div>
          <input name="roomRequested" placeholder="Room Requested" value={form.roomRequested} onChange={chk} className={inputCls} />
          <label className={labelCls + " border border-[rgb(235,225,213)] rounded-xl px-3 py-2"}>
            <input type="checkbox" name="flexibleOnRoom" checked={form.flexibleOnRoom} onChange={chk} className="accent-[rgb(150,170,155)]" />
            Flexible on Room
          </label>
        </div>
      </div>

      {/* Treatment Request */}
      <div>
        <p className={sectionTitle}>Treatment Request</p>
        <div className="space-y-3">
          {/* Treatment checkboxes */}
          {treatments.length > 0 && (
            <div className="border border-[rgb(235,225,213)] rounded-xl p-3">
              <p className="text-xs text-[rgb(150,150,150)] mb-2">Select treatments (check all that apply)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {treatments.map(t => {
                  const label = `${t.name}${t.duration_minutes ? ` (${t.duration_minutes}min)` : ""}${t.price ? ` — $${t.price}` : ""}`;
                  const checked = (form.selectedTreatments || []).includes(t.name + (t.duration_minutes ? ` ${t.duration_minutes}min` : ""));
                  const key = t.name + (t.duration_minutes ? ` ${t.duration_minutes}min` : "");
                  return (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-[rgb(45,45,45)] cursor-pointer select-none py-1">
                      <input type="checkbox" checked={checked} onChange={() => toggleTreatment(key)} className="accent-[rgb(150,170,155)] shrink-0" />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
              {(form.selectedTreatments?.length > 0) && (
                <p className="text-xs text-[rgb(150,170,155)] mt-2 font-medium">{form.selectedTreatments.length} selected</p>
              )}
            </div>
          )}
          <textarea name="treatmentsRequested" placeholder="Additional treatment notes or special requests…" value={form.treatmentsRequested} onChange={chk} className={inputCls + " h-20 resize-none"} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="preferredTherapist" placeholder="Preferred Therapist" value={form.preferredTherapist} onChange={chk} className={inputCls} />
            <input name="preferredTreatmentTime" placeholder="Preferred Time (e.g. 2pm)" value={form.preferredTreatmentTime} onChange={chk} className={inputCls} />
            <div><label className="text-xs text-[rgb(150,150,150)] mb-1 block">Preferred Treatment Date</label><input type="date" name="preferredTreatmentDate" value={form.preferredTreatmentDate} onChange={chk} className={inputCls} /></div>
            <label className={labelCls + " border border-[rgb(235,225,213)] rounded-xl px-3 py-2"}>
              <input type="checkbox" name="flexibleOnTime" checked={form.flexibleOnTime} onChange={chk} className="accent-[rgb(150,170,155)]" />
              Flexible on Time
            </label>
          </div>
        </div>
      </div>

      {/* Therapist Verification */}
      <div>
        <p className={sectionTitle}>Therapist Verification</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={labelCls + " border border-[rgb(235,225,213)] rounded-xl px-3 py-2"}>
            <input type="checkbox" name="therapistContacted" checked={form.therapistContacted} onChange={chk} className="accent-[rgb(150,170,155)]" />
            Therapist Contacted
          </label>
          <label className={labelCls + " border border-[rgb(235,225,213)] rounded-xl px-3 py-2"}>
            <input type="checkbox" name="therapistConfirmed" checked={form.therapistConfirmed} onChange={chk} className="accent-[rgb(150,170,155)]" />
            Therapist Confirmed
          </label>
          <div className="sm:col-span-2">
            <textarea name="therapistResponseNotes" placeholder="Therapist response notes…" value={form.therapistResponseNotes} onChange={chk} className={inputCls + " h-20 resize-none"} />
          </div>
          <select name="verificationStatus" value={form.verificationStatus} onChange={chk} className={inputCls}>
            <option value="pending">Verification: Pending</option>
            <option value="confirmed">Verification: Confirmed</option>
            <option value="declined">Verification: Declined</option>
          </select>
        </div>
      </div>

      {/* Internal Notes */}
      <div>
        <p className={sectionTitle}>Internal Notes & Status</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <textarea name="internalNotes" placeholder="Write all notes here — no more sticky notes…" value={form.internalNotes} onChange={chk} className={inputCls + " h-32 resize-none sm:col-span-2"} />
          <div><label className="text-xs text-[rgb(150,150,150)] mb-1 block">Follow-Up Date</label><input type="date" name="followUpDate" value={form.followUpDate} onChange={chk} className={inputCls} /></div>
          <select name="bookingStatus" value={form.bookingStatus} onChange={chk} className={inputCls}>
            <option value="new_inquiry">New Inquiry</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Credit Card */}
      <div>
        <p className={sectionTitle + " flex items-center gap-1.5"}><Lock className="w-3 h-3" /> Card on File (Internal — Do Not Share)</p>
        <div className="border border-[rgb(235,225,213)] rounded-xl p-4 bg-[rgb(250,248,245)] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input name="ccName" placeholder="Cardholder Name" value={form.ccName} onChange={chk} className={inputCls} />
            <select name="ccType" value={form.ccType} onChange={chk} className={inputCls}>
              <option value="">Card Type</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">Amex</option>
              <option value="Discover">Discover</option>
            </select>
            <input name="ccLast4" placeholder="Last 4 digits" value={form.ccLast4} onChange={chk} className={inputCls} maxLength={4} />
            <input name="ccExpiry" placeholder="Expiry MM/YY" value={form.ccExpiry} onChange={chk} className={inputCls} maxLength={5} />
          </div>
          <textarea name="ccNotes" placeholder="Notes (e.g. deposit auth, amount held, date…)" value={form.ccNotes} onChange={chk} className={inputCls + " h-16 resize-none"} />
          <p className="text-xs text-[rgb(180,160,140)]">⚠️ Store reference info only — full card numbers should never be entered here.</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={submit} disabled={saving || !form.guestName} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity">
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Intake"}
        </button>
        {onCancel && <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Cancel</button>}
      </div>
    </div>
  );
}

function ActionBtn({ label, actionKey, completed, actioning, onClick }) {
  const done = completed[actionKey];
  return (
    <button
      onClick={onClick}
      disabled={!!actioning}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs disabled:opacity-50 transition-colors ${done ? 'border-green-300 bg-green-50 text-green-700' : 'border-[rgb(235,225,213)] text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]'}`}
    >
      {done && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
      {label}
    </button>
  );
}

function IntakeCard({ record, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [actioning, setActioning] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [completed, setCompleted] = useState({}); // tracks which actions succeeded

  async function save(form) {
    await base44.entities.HotelTreatmentIntake.update(record.id, form);
    onUpdate();
    setEditing(false);
  }

  async function runAction(type) {
    setActioning(type);
    setActionMsg(null);
    try {
      const intakeData = { id: record.id, ...(record.data || {}), ...record };
      delete intakeData.data;

      if (type === 'SendQuote') {
        const res = await base44.functions.invoke('intakeSendQuote', { intake: intakeData }, { responseType: 'arraybuffer' });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const filename = `RITUAL-Quote-${intakeData.guestName?.replace(/\s+/g, '-') || 'Guest'}.pdf`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        const subject = encodeURIComponent('Your Hotel RITUAL Wellness Retreat Quote');
        const body = encodeURIComponent(`Hi ${intakeData.guestName},\n\nThank you for your interest in Hotel RITUAL! Please find your personalized wellness retreat quote attached.\n\nWe look forward to welcoming you.\n\nWarm regards,\nHotel RITUAL\n(903) 810-6695`);
        const to = encodeURIComponent(intakeData.email || intakeData.guestEmail || '');
        setTimeout(() => { window.location.href = `mailto:${to}?subject=${subject}&body=${body}`; }, 500);
        setCompleted(c => ({ ...c, SendQuote: true }));
        setActionMsg({ success: true, text: 'Quote PDF downloaded — attach it to the email that just opened.' });
        setTimeout(() => setActionMsg(null), 6000);

      } else if (type === 'AddToCRM') {
        const nameParts = intakeData.guestName?.trim().split(' ') || [];
        const res = await base44.functions.invoke('crmUpsertContact', {
          firstName: nameParts[0] || intakeData.guestName,
          lastName: nameParts.slice(1).join(' ') || '',
          fullName: intakeData.guestName,
          email: intakeData.email || intakeData.guestEmail || '',
          phone: intakeData.phone || '',
          tags: ['intake'],
        });
        if (res.data?.ok) {
          setCompleted(c => ({ ...c, AddToCRM: true }));
          setActionMsg({ success: true, text: 'Guest added / updated in CRM.' });
          setTimeout(() => setActionMsg(null), 4000);
        } else {
          setActionMsg({ success: false, text: res.data?.error || 'CRM error' });
        }

      } else {
        const res = await base44.functions.invoke(`intake${type}`, { intake: intakeData });
        const data = res.data;
        if (data?.error) {
          setActionMsg({ success: false, text: data.error, detail: JSON.stringify(data, null, 2) });
        } else {
          setCompleted(c => ({ ...c, [type]: true }));
          setActionMsg({ success: true, text: data?.message || `${type} completed` });
          setTimeout(() => { setActionMsg(null); onUpdate(); }, 3000);
        }
      }
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : null;
      setActionMsg({ success: false, text: `${status ? `HTTP ${status}: ` : ''}${err.message}`, detail });
    }
    setActioning(null);
  }

  async function handleArchive() {
    if (!completed.AddToCRM) {
      setActionMsg({ success: false, text: 'Please add this guest to the CRM before archiving.' });
      return;
    }
    await base44.entities.HotelTreatmentIntake.update(record.id, { bookingStatus: 'declined' });
    onUpdate();
  }

  const contactIcon = record.preferredContactMethod === "email" ? <Mail className="w-3 h-3" /> : record.preferredContactMethod === "text" ? <MessageSquare className="w-3 h-3" /> : <Phone className="w-3 h-3" />;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
      <button className="w-full text-left px-5 py-4 flex items-start justify-between gap-4" onClick={() => { setExpanded(e => !e); setEditing(false); }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[rgb(45,45,45)]">{record.guestName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.bookingStatus] || "bg-gray-100 text-gray-600"}`}>{STATUS_LABELS[record.bookingStatus] || record.bookingStatus}</span>
            {record.verificationStatus && record.verificationStatus !== "pending" && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${VERIFY_COLORS[record.verificationStatus]}`}>
                {record.therapistConfirmed ? <CheckCircle2 className="inline w-3 h-3 mr-1" /> : <XCircle className="inline w-3 h-3 mr-1" />}
                Therapist {record.verificationStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[rgb(120,120,120)] flex-wrap">
            {record.phone && (
              <a href={`sms:${record.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[rgb(107,85,64)] hover:underline">
                {contactIcon} {record.phone}
              </a>
            )}
            {record.checkInDate && <span>Check-in: {record.checkInDate}</span>}
            {record.roomRequested && <span>Room: {record.roomRequested}</span>}
            {record.followUpDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Follow-up: {record.followUpDate}</span>}
          </div>
          {record.internalNotes && !expanded && (
            <p className="text-xs text-[rgb(150,150,150)] mt-1 truncate">{record.internalNotes}</p>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[rgb(235,225,213)] px-5 py-4">
          {editing ? (
            <IntakeForm initial={record} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {record.email && <div><span className="text-xs text-[rgb(150,150,150)]">Email</span><p><a href={`mailto:${record.email}`} className="text-[rgb(107,85,64)] hover:underline">{record.email}</a></p></div>}
                {record.phone && <div><span className="text-xs text-[rgb(150,150,150)]">Phone / Text</span><p><a href={`sms:${record.phone}`} className="text-[rgb(107,85,64)] hover:underline">{record.phone}</a></p></div>}
                {record.numberOfGuests && <div><span className="text-xs text-[rgb(150,150,150)]">Guests</span><p>{record.numberOfGuests}</p></div>}
                {record.checkOutDate && <div><span className="text-xs text-[rgb(150,150,150)]">Check-Out</span><p>{record.checkOutDate}</p></div>}
                {record.treatmentsRequested && <div className="col-span-2 sm:col-span-3"><span className="text-xs text-[rgb(150,150,150)]">Treatments</span><p className="whitespace-pre-wrap">{record.treatmentsRequested}</p></div>}
                {record.preferredTherapist && <div><span className="text-xs text-[rgb(150,150,150)]">Therapist</span><p>{record.preferredTherapist}</p></div>}
                {record.preferredTreatmentTime && <div><span className="text-xs text-[rgb(150,150,150)]">Pref. Time</span><p>{record.preferredTreatmentTime}</p></div>}
                {record.therapistResponseNotes && <div className="col-span-2 sm:col-span-3"><span className="text-xs text-[rgb(150,150,150)]">Therapist Notes</span><p className="whitespace-pre-wrap">{record.therapistResponseNotes}</p></div>}
                {record.internalNotes && <div className="col-span-2 sm:col-span-3 bg-[rgb(248,246,242)] rounded-xl p-3"><span className="text-xs text-[rgb(150,150,150)]">Internal Notes</span><p className="whitespace-pre-wrap mt-1">{record.internalNotes}</p></div>}
                {record.selectedTreatments?.length > 0 && <div className="col-span-2 sm:col-span-3"><span className="text-xs text-[rgb(150,150,150)]">Selected Treatments</span><div className="flex flex-wrap gap-1.5 mt-1">{record.selectedTreatments.map(t => <span key={t} className="text-xs bg-[rgb(240,235,228)] text-[rgb(107,85,64)] px-2 py-0.5 rounded-full">{t}</span>)}</div></div>}
                {record.ccLast4 && <div className="col-span-2 sm:col-span-3 border border-[rgb(235,225,213)] rounded-xl p-3 flex items-center gap-3"><CreditCard className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" /><span className="text-sm text-[rgb(45,45,45)]">{record.ccType && `${record.ccType} · `}•••• {record.ccLast4}{record.ccExpiry && ` · Exp ${record.ccExpiry}`}{record.ccName && ` · ${record.ccName}`}</span>{record.ccNotes && <span className="text-xs text-[rgb(150,150,150)] ml-2">{record.ccNotes}</span>}</div>}
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                {actionMsg && (
                  <div className={`text-xs rounded-xl border ${actionMsg.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    <div className="px-3 py-2 font-medium">{actionMsg.text}</div>
                    {actionMsg.detail && (
                      <div className="border-t border-red-200 px-3 py-2">
                        <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1">Error Detail</p>
                        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-red-600 max-h-40 overflow-y-auto">{actionMsg.detail}</pre>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <ActionBtn label="📧 Send Quote" actionKey="SendQuote" completed={completed} actioning={actioning} onClick={() => runAction('SendQuote')} />
                  {record.checkInDate && record.checkOutDate && (
                    <ActionBtn label="🏨 Book Hotel" actionKey="BookHotel" completed={completed} actioning={actioning} onClick={() => runAction('BookHotel')} />
                  )}
                  {record.selectedTreatments?.length > 0 && (
                    <ActionBtn label="✨ Book Treatments" actionKey="BookTreatments" completed={completed} actioning={actioning} onClick={() => runAction('BookTreatments')} />
                  )}
                  {(record.checkInDate || record.selectedTreatments?.length > 0) && (
                    <ActionBtn label="💳 Create Invoice" actionKey="CreateInvoice" completed={completed} actioning={actioning} onClick={() => runAction('CreateInvoice')} />
                  )}
                  <ActionBtn label="👤 Add to CRM" actionKey="AddToCRM" completed={completed} actioning={actioning} onClick={() => runAction('AddToCRM')} />
                  <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Edit</button>
                </div>
                <div className="pt-2 border-t border-[rgb(235,225,213)] flex items-center gap-3">
                  <button
                    onClick={handleArchive}
                    disabled={!!actioning}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${completed.AddToCRM ? 'bg-[rgb(107,85,64)] text-white hover:opacity-90' : 'bg-[rgb(235,225,213)] text-[rgb(150,150,150)] cursor-not-allowed'}`}
                  >
                    ✅ Finished & Archive
                  </button>
                  {!completed.AddToCRM && (
                    <span className="text-xs text-[rgb(180,150,130)]">Add to CRM first to enable archiving</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminIntake() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    const data = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createNew(form) {
    await base44.entities.HotelTreatmentIntake.create(form);
    setShowNew(false);
    load();
  }

  const filtered = records.filter(r => {
    const matchSearch = !search || r.guestName?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search) || r.email?.toLowerCase().includes(search.toLowerCase());
    let matchStatus;
    if (statusFilter === "all") matchStatus = true;
    else if (statusFilter === "active") matchStatus = r.bookingStatus !== "archived" && r.bookingStatus !== "declined";
    else matchStatus = r.bookingStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingTherapist = records.filter(r => r.therapistContacted && !r.therapistConfirmed && r.bookingStatus !== "declined").length;

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminDashboard")} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)] transition-colors">
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Hotel + Treatment Intake</h1>
              <p className="text-xs text-[rgb(150,150,150)]">{records.length} total{pendingTherapist > 0 ? ` · ${pendingTherapist} awaiting therapist` : ""}</p>
            </div>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Intake
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {/* New intake form */}
        {showNew && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-[rgb(45,45,45)] mb-4">New Intake</h2>
            <IntakeForm onSave={createNew} onCancel={() => setShowNew(false)} />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(150,150,150)]" />
            <input placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white focus:outline-none focus:border-[rgb(198,182,165)]" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="new_inquiry">New Inquiry</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined / Archived</option>
          </select>
        </div>

        {/* Alert: pending therapist confirmations */}
        {pendingTherapist > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            {pendingTherapist} intake{pendingTherapist > 1 ? "s" : ""} waiting on therapist confirmation
          </div>
        )}

        {/* Records */}
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-[rgb(150,150,150)]">{records.length === 0 ? "No intakes yet — tap New Intake." : "No matches."}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => <IntakeCard key={r.id} record={r} onUpdate={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
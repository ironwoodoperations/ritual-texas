import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, ChevronDown, ChevronUp,
  Save, CheckCircle2, Clock, XCircle, Phone, Mail, MessageSquare, CreditCard, Loader2
} from "lucide-react";
import GuestSection from "@/components/intake/GuestSection";
import CloudbedsSection from "@/components/intake/CloudbedsSection";
import SimplyBookSection from "@/components/intake/SimplyBookSection";
import InternalSection from "@/components/intake/InternalSection";

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
  // Cloudbeds fields
  checkInDate: "", checkOutDate: "", numberOfGuests: 1, numberOfChildren: 0,
  cloudbedsRoomTypeId: "", flexibleOnRoom: false, hotelNotes: "",
  // SimplyBook fields
  selectedTreatments: [], preferredTreatmentDate: "", preferredTreatmentTime: "",
  preferredTherapist: "", flexibleOnTime: false, treatmentsRequested: "",
  // Internal
  bookingStatus: "new_inquiry", followUpDate: "", internalNotes: "",
  ccName: "", ccLast4: "", ccExpiry: "", ccType: "", ccNotes: "",
};

// Section tab component
function SectionTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-[rgb(107,85,64)] text-[rgb(107,85,64)]"
          : "border-transparent text-[rgb(150,150,150)] hover:text-[rgb(45,45,45)]"
      }`}
    >
      {label}
    </button>
  );
}

function IntakeForm({ initial = BLANK, formData, onSave, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, ...initial });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("guest");
  const [roomTypes, setRoomTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingFormData, setLoadingFormData] = useState(true);

  useEffect(() => {
    if (formData) {
      setRoomTypes(formData.cloudbeds?.roomTypes || []);
      setServices(formData.simplybook?.services || []);
      setStaff(formData.simplybook?.staff || []);
      setLoadingFormData(false);
    }
  }, [formData]);

  const onChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const hasHotel = form.checkInDate && form.checkOutDate;
  const hasTreatments = form.selectedTreatments?.length > 0;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-[rgb(235,225,213)] overflow-x-auto">
        <SectionTab label="👤 Guest Info" active={activeTab === "guest"} onClick={() => setActiveTab("guest")} />
        <SectionTab label="🏨 Hotel (Cloudbeds)" active={activeTab === "hotel"} onClick={() => setActiveTab("hotel")} />
        <SectionTab label="✨ Treatments (SimplyBook)" active={activeTab === "treatments"} onClick={() => setActiveTab("treatments")} />
        <SectionTab label="🔒 Internal" active={activeTab === "internal"} onClick={() => setActiveTab("internal")} />
      </div>

      <div className="pt-2">
        {activeTab === "guest" && <GuestSection form={form} onChange={onChange} />}
        {activeTab === "hotel" && <CloudbedsSection form={form} onChange={onChange} roomTypes={roomTypes} loading={loadingFormData} />}
        {activeTab === "treatments" && <SimplyBookSection form={form} onChange={onChange} services={services} staff={staff} loading={loadingFormData} />}
        {activeTab === "internal" && <InternalSection form={form} onChange={onChange} />}
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 pt-1">
        {hasHotel && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">🏨 {form.checkInDate} → {form.checkOutDate}</span>}
        {form.cloudbedsRoomTypeId && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">Room ID: {form.cloudbedsRoomTypeId}</span>}
        {hasTreatments && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">✨ {form.selectedTreatments.length} treatment{form.selectedTreatments.length > 1 ? "s" : ""}</span>}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={submit}
          disabled={saving || !form.guestName}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Record"}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

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

function IntakeCard({ record, onUpdate, formData }) {
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
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required to send quote." }); setActioning(null); return; }
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeCreateSquareQuote", { intake: intakeData });
        if (res.data?.error) { setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) }); }
        else { markCompleted("SendQuote"); setActionMsg({ success: true, text: res.data?.message + (res.data?.publicUrl ? ` — ${res.data.publicUrl}` : "") }); setTimeout(() => setActionMsg(null), 10000); }

      } else if (type === "BookHotel") {
        if (!intakeData.checkInDate || !intakeData.checkOutDate) { setActionMsg({ success: false, text: "Check-in and check-out dates required." }); setActioning(null); return; }
        if (!intakeData.email) { setActionMsg({ success: false, text: "Guest email required for Cloudbeds booking." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookHotel", { intake: intakeData });
        if (res.data?.error) { setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) }); }
        else { markCompleted("BookHotel"); setActionMsg({ success: true, text: res.data?.message || "Hotel booked in Cloudbeds!" }); setTimeout(() => { setActionMsg(null); onUpdate(); }, 5000); }

      } else if (type === "BookTreatments") {
        if (!intakeData.selectedTreatments?.length) { setActionMsg({ success: false, text: "No treatments selected." }); setActioning(null); return; }
        if (!intakeData.preferredTreatmentDate) { setActionMsg({ success: false, text: "Preferred treatment date required." }); setActioning(null); return; }
        const res = await base44.functions.invoke("intakeBookTreatments", { intake: intakeData });
        if (res.data?.error) { setActionMsg({ success: false, text: res.data.error, detail: JSON.stringify(res.data, null, 2) }); }
        else { markCompleted("BookTreatments"); setActionMsg({ success: true, text: res.data?.message || "Treatments booked in SimplyBook!" }); setTimeout(() => setActionMsg(null), 5000); }

      } else if (type === "AddToCRM") {
        const nameParts = intakeData.guestName?.trim().split(" ") || [];
        const res = await base44.functions.invoke("crmUpsertContact", {
          firstName: nameParts[0] || intakeData.guestName, lastName: nameParts.slice(1).join(" ") || "",
          fullName: intakeData.guestName, email: intakeData.email || "", phone: intakeData.phone || "", tags: ["intake"],
        });
        if (res.data?.ok) { markCompleted("AddToCRM"); setActionMsg({ success: true, text: "Guest added/updated in CRM." }); setTimeout(() => setActionMsg(null), 4000); }
        else { setActionMsg({ success: false, text: res.data?.error || "CRM error" }); }
      }
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : null;
      setActionMsg({ success: false, text: `${status ? `HTTP ${status}: ` : ""}${err.message}`, detail });
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
          {record.internalNotes && !expanded && <p className="text-xs text-[rgb(150,150,150)] mt-1 truncate">{record.internalNotes}</p>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-[rgb(150,150,150)] shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[rgb(235,225,213)] px-5 py-4">
          {editing ? (
            <IntakeForm initial={record} formData={formData} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              {/* Quick detail view */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {record.email && <div><span className="text-xs text-[rgb(150,150,150)]">Email</span><p><a href={`mailto:${record.email}`} className="text-[rgb(107,85,64)] hover:underline">{record.email}</a></p></div>}
                {record.phone && <div><span className="text-xs text-[rgb(150,150,150)]">Phone</span><p><a href={`sms:${record.phone}`} className="text-[rgb(107,85,64)] hover:underline">{record.phone}</a></p></div>}
                {record.numberOfGuests && <div><span className="text-xs text-[rgb(150,150,150)]">Adults</span><p>{record.numberOfGuests}</p></div>}
                {record.cloudbedsRoomTypeId && <div><span className="text-xs text-[rgb(150,150,150)]">Room Type ID</span><p className="font-mono text-xs">{record.cloudbedsRoomTypeId}</p></div>}
                {record.preferredTreatmentDate && <div><span className="text-xs text-[rgb(150,150,150)]">Tx Date</span><p>{record.preferredTreatmentDate} {record.preferredTreatmentTime}</p></div>}
                {record.preferredTherapist && <div><span className="text-xs text-[rgb(150,150,150)]">Therapist</span><p>{record.preferredTherapist}</p></div>}
                {record.selectedTreatments?.length > 0 && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-xs text-[rgb(150,150,150)]">Treatments</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {record.selectedTreatments.map(t => (
                        <span key={t.id || t.name || t} className="text-xs bg-[rgb(240,235,228)] text-[rgb(107,85,64)] px-2 py-0.5 rounded-full">{t.name || t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {record.internalNotes && <div className="col-span-2 sm:col-span-3 bg-[rgb(248,246,242)] rounded-xl p-3"><span className="text-xs text-[rgb(150,150,150)]">Notes</span><p className="whitespace-pre-wrap mt-1 text-sm">{record.internalNotes}</p></div>}
                {record.ccLast4 && <div className="col-span-2 sm:col-span-3 border border-[rgb(235,225,213)] rounded-xl p-3 flex items-center gap-3"><CreditCard className="w-4 h-4 text-[rgb(150,150,150)] shrink-0" /><span className="text-sm">{record.ccType && `${record.ccType} · `}•••• {record.ccLast4}{record.ccExpiry && ` · ${record.ccExpiry}`}{record.ccName && ` · ${record.ccName}`}</span></div>}
              </div>

              {/* Action messages */}
              {actionMsg && (
                <div className={`text-xs rounded-xl border ${actionMsg.success ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  <div className="px-3 py-2 font-medium">{actionMsg.text}</div>
                  {actionMsg.detail && (
                    <div className="border-t border-red-200 px-3 py-2">
                      <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1">Error Detail</p>
                      <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-red-600 max-h-40 overflow-y-auto">{actionMsg.detail}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <p className="text-xs text-[rgb(150,150,150)] font-semibold uppercase tracking-widest">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {/* Quote always available if has hotel dates */}
                  {hasHotel && <ActionBtn label="📧 Send Square Quote" actionKey="SendQuote" completed={completed} actioning={actioning} onClick={() => runAction("SendQuote")} variant="primary" />}
                  {/* Book hotel separately */}
                  {hasHotel && <ActionBtn label="🏨 Book Hotel in Cloudbeds" actionKey="BookHotel" completed={completed} actioning={actioning} onClick={() => runAction("BookHotel")} />}
                  {/* Book treatments separately */}
                  {hasTreatments && <ActionBtn label="✨ Book Treatments in SimplyBook" actionKey="BookTreatments" completed={completed} actioning={actioning} onClick={() => runAction("BookTreatments")} />}
                  {/* CRM */}
                  <ActionBtn label="👤 Add to CRM" actionKey="AddToCRM" completed={completed} actioning={actioning} onClick={() => runAction("AddToCRM")} />
                  <button onClick={() => setEditing(true)} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Edit</button>
                </div>
                <div className="pt-2 border-t border-[rgb(235,225,213)]">
                  <button onClick={handleArchive} disabled={!!actioning} className="px-4 py-2 rounded-xl text-xs font-medium bg-[rgb(235,225,213)] text-[rgb(107,85,64)] hover:bg-[rgb(220,210,198)] transition-colors disabled:opacity-50">
                    Archive Record
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

export default function AdminIntake() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [formData, setFormData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.HotelTreatmentIntake.list("-created_date", 100);
    setRecords(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Load Cloudbeds rooms + SimplyBook services
    base44.functions.invoke("getIntakeFormData", {}).then(res => {
      if (res.data && !res.data.error) setFormData(res.data);
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
              <p className="text-xs text-[rgb(150,150,150)]">{records.length} records{!formData ? " · Loading integrations…" : ""}</p>
            </div>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> New Intake
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {showNew && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-[rgb(45,45,45)] mb-4">New Intake</h2>
            <IntakeForm formData={formData} onSave={createNew} onCancel={() => setShowNew(false)} />
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
            {filtered.map(r => <IntakeCard key={r.id} record={r} onUpdate={load} formData={formData} />)}
          </div>
        )}
      </div>
    </div>
  );
}
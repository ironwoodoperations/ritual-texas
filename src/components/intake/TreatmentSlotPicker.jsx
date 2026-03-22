import React, { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

const THERAPISTS = ["Whitney", "Bishop", "Tanita"];

// A single "book online" treatment row — date-first, all dropdowns live from SimplyBook
function BookOnlineRow({ index, entry, treatments, onUpdate, onRemove, guestName }) {
  const [sbServices, setSbServices] = useState([]);
  const [sbLoading, setSbLoading]   = useState(false);
  const [sbError, setSbError]       = useState(null);

  // Derived from selection
  const selectedService    = sbServices.find(s => s.id === entry.simplybookServiceId) || null;
  const availableProviders = selectedService?.providers || [];
  const selectedProvider   = availableProviders.find(p => p.id === entry.staffId) || null;
  const availableSlots     = selectedProvider?.slots || [];

  // Fetch availability whenever the date changes
  useEffect(() => {
    const date = entry.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSbServices([]);
      setSbError(null);
      return;
    }
    let cancelled = false;
    setSbLoading(true);
    setSbError(null);

    base44.functions.invoke("simplybookGetAvailability", { date })
      .then(res => {
        if (cancelled) return;
        const services = res.data?.services || [];
        setSbServices(services);
        if (!services.length) setSbError("No services available on this date");
      })
      .catch(() => {
        if (!cancelled) setSbError("Could not load SimplyBook availability");
      })
      .finally(() => { if (!cancelled) setSbLoading(false); });

    return () => { cancelled = true; };
  }, [entry.date]);

  function handleDateChange(date) {
    // Clear all downstream fields when date changes
    onUpdate(index, { ...entry, date, simplybookServiceId: "", serviceName: "", price: 0, duration: 0, staffId: "", staffName: "", time: "" });
  }

  function handleServiceChange(sbServiceId) {
    const svc = sbServices.find(s => s.id === sbServiceId);
    if (svc) {
      onUpdate(index, { ...entry, simplybookServiceId: svc.id, serviceName: svc.name, price: svc.price, duration: svc.duration, staffId: "", staffName: "", time: "" });
    } else {
      onUpdate(index, { ...entry, simplybookServiceId: "", serviceName: "", price: 0, duration: 0, staffId: "", staffName: "", time: "" });
    }
  }

  function handleProviderChange(providerId) {
    const provider = availableProviders.find(p => p.id === providerId);
    onUpdate(index, { ...entry, staffId: providerId, staffName: provider?.name || "", time: "" });
  }

  function fmtSlot(slot) {
    const [h, m] = slot.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const dh = h % 12 || 12;
    return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,250,248)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Treatment {index + 1}{guestName ? ` · ${guestName}` : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">

        {/* Step 1: Date — always first so we can fetch availability */}
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Date
            {sbLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1.5 text-[rgb(150,170,155)]" />}
          </label>
          <input
            type="date"
            value={entry.date || ""}
            onChange={e => handleDateChange(e.target.value)}
            className={fieldCls}
          />
          {sbError && !sbLoading && entry.date && (
            <p className="text-[10px] text-amber-600 mt-0.5">{sbError}</p>
          )}
        </div>

        {/* Step 2: Treatment — live from SimplyBook, gated on date */}
        <div className="sm:col-span-2">
          <label className={labelCls}>
            Treatment
            {sbServices.length > 0 && !sbLoading && (
              <span className="ml-1.5 text-[10px] text-[rgb(150,170,155)] font-normal normal-case tracking-normal">
                {sbServices.length} available this day
              </span>
            )}
          </label>
          {!entry.date ? (
            <p className="text-xs text-[rgb(190,175,160)] py-2 italic">Select a date first to see available treatments</p>
          ) : sbLoading ? (
            <p className="text-xs text-[rgb(150,170,155)] py-2 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading treatments from SimplyBook…
            </p>
          ) : sbServices.length > 0 ? (
            <select value={entry.simplybookServiceId || ""} onChange={e => handleServiceChange(e.target.value)} className={selectCls}>
              <option value="">Select treatment…</option>
              {sbServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.duration}min — ${s.price}</option>
              ))}
            </select>
          ) : (
            // Fallback to local DB treatments if SimplyBook unavailable
            <>
              {treatments.length > 0 ? (
                <select
                  value={entry.serviceId || ""}
                  onChange={e => {
                    const t = treatments.find(t => t.id === e.target.value);
                    if (t) onUpdate(index, { ...entry, serviceId: t.id, serviceName: t.name, price: t.price, duration: t.duration_minutes });
                  }}
                  className={selectCls}
                >
                  <option value="">Select treatment (offline)…</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.duration_minutes}min — ${t.price}</option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="Treatment name…"
                  value={entry.serviceName || ""}
                  onChange={e => onUpdate(index, { ...entry, serviceName: e.target.value })}
                  className={fieldCls}
                />
              )}
              {entry.date && <p className="text-[10px] text-amber-600 mt-0.5">SimplyBook unavailable — using local catalog</p>}
            </>
          )}
        </div>

        {/* Step 3: Provider — live from SimplyBook, gated on service selection */}
        <div>
          <label className={labelCls}>
            Therapist / Provider
            {selectedService && availableProviders.length > 0 && (
              <span className="ml-1.5 text-[10px] text-[rgb(150,170,155)] font-normal normal-case tracking-normal">
                {availableProviders.length} available
              </span>
            )}
          </label>
          {!entry.simplybookServiceId ? (
            <p className="text-xs text-[rgb(190,175,160)] py-2 italic">Select a treatment first</p>
          ) : availableProviders.length > 0 ? (
            <select value={entry.staffId || ""} onChange={e => handleProviderChange(e.target.value)} className={selectCls}>
              <option value="">Select provider…</option>
              {availableProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.slots.length} slot{p.slots.length !== 1 ? "s" : ""} available</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-amber-600 py-2">No providers available for this service on this date</p>
          )}
        </div>

        {/* Step 4: Time — live slots for selected provider */}
        <div>
          <label className={labelCls}>
            Time
            {selectedProvider && availableSlots.length > 0 && (
              <span className="ml-1.5 text-[10px] text-[rgb(150,170,155)] font-normal normal-case tracking-normal">
                {availableSlots.length} open
              </span>
            )}
          </label>
          {!entry.staffId ? (
            <p className="text-xs text-[rgb(190,175,160)] py-2 italic">Select a provider first</p>
          ) : availableSlots.length > 0 ? (
            <select value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={selectCls}>
              <option value="">Select time…</option>
              {availableSlots.map(slot => (
                <option key={slot} value={slot}>{fmtSlot(slot)}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-amber-600 py-2">No time slots available</p>
          )}
        </div>

        {/* Price (editable override) */}
        <div>
          <label className={labelCls}>Price ($)</label>
          <input
            type="number"
            min={0}
            value={entry.price || ""}
            onChange={e => onUpdate(index, { ...entry, price: parseFloat(e.target.value) || 0 })}
            className={fieldCls}
            placeholder="0"
          />
        </div>

      </div>

      {/* Confirmation summary */}
      {entry.serviceName && entry.staffName && entry.time && (
        <div className="mt-3 text-xs text-[rgb(107,85,64)] font-medium bg-[rgb(248,244,240)] rounded-lg px-3 py-1.5">
          ✓ {entry.serviceName} · {entry.staffName} · {entry.date} at {fmtSlot(entry.time)}
          {entry.price ? ` · $${entry.price}` : ""}
          <span className="ml-1.5 text-[rgb(150,170,155)]">· SimplyBook live ✓</span>
        </div>
      )}
    </div>
  );
}

// A single "call to book" treatment row — needs verification/confirmation
function CtbRow({ index, entry, treatments, onUpdate, onRemove, guestName }) {
  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,248,252)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Confirmation Needed — Treatment {index + 1} {guestName && `· ${guestName}`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Treatment</label>
          {treatments.length > 0 ? (
            <select value={entry.id || ""} onChange={e => {
              const t = treatments.find(t => t.id === e.target.value);
              if (t) onUpdate(index, { ...entry, id: t.id, name: t.name, price: t.price, duration: t.duration_minutes });
            }} className={selectCls}>
              <option value="">Select treatment…</option>
              {treatments.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.duration_minutes}min — ${t.price}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Treatment name…"
              value={entry.name || ""}
              onChange={e => onUpdate(index, { ...entry, name: e.target.value, id: "manual" })}
              className={fieldCls}
            />
          )}
        </div>
        <div>
          <label className={labelCls}>Requested Date</label>
          <input type="date" value={entry.date || ""} onChange={e => onUpdate(index, { ...entry, date: e.target.value })} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Requested Time</label>
          <input type="time" value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Therapist</label>
          <select value={entry.staffName || ""} onChange={e => onUpdate(index, { ...entry, staffName: e.target.value })} className={selectCls}>
            <option value="">Select therapist…</option>
            {THERAPISTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Price ($)</label>
          <input type="number" min={0} value={entry.price || ""} onChange={e => onUpdate(index, { ...entry, price: parseFloat(e.target.value) || 0 })} className={fieldCls} placeholder="0" />
        </div>
      </div>
      {entry.name && (
        <div className="mt-3 text-xs text-purple-700 font-medium bg-purple-50 rounded-lg px-3 py-1.5">
          📞 {entry.name}{entry.date ? ` · ${entry.date}` : ""}{entry.time ? ` at ${entry.time}` : ""}{entry.price ? ` · $${entry.price}` : ""}
        </div>
      )}
    </div>
  );
}

export default function TreatmentSlotPicker({ sbEntries, ctbEntries, bookOnlineTreatments = [], callToBookTreatments = [], onSbChange, onCtbChange, primaryGuestName }) {
  function addSb() {
    if (sbEntries.length >= 10) return;
    onSbChange([...sbEntries, { serviceId: "", serviceName: "", price: 0, duration: 0, date: "", time: "", staffName: "", guestName: primaryGuestName }]);
  }

  function removeSb(index) { onSbChange(sbEntries.filter((_, i) => i !== index)); }
  function updateSb(index, entry) { const next = [...sbEntries]; next[index] = entry; onSbChange(next); }

  function addCtb() {
    if (ctbEntries.length >= 10) return;
    onCtbChange([...ctbEntries, { id: "", name: "", price: 0, duration: 0, date: "", time: "", staffName: "", guestName: primaryGuestName }]);
  }

  function removeCtb(index) { onCtbChange(ctbEntries.filter((_, i) => i !== index)); }
  function updateCtb(index, entry) { const next = [...ctbEntries]; next[index] = entry; onCtbChange(next); }

  const totalSb = sbEntries.reduce((s, e) => s + (e.price || 0), 0);
  const totalCtb = ctbEntries.reduce((s, e) => s + (e.price || 0), 0);
  const grandTotal = totalSb + totalCtb;

  return (
    <div className="space-y-6">
      {/* Book-Online treatments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className={labelCls}>Spa Treatments — Book Online</label>
            <p className="text-xs text-[rgb(150,150,150)]">Select treatments to include in the Square invoice.</p>
          </div>
          <button
            type="button"
            onClick={addSb}
            disabled={sbEntries.length >= 10}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(107,85,64)] text-xs text-[rgb(107,85,64)] hover:bg-[rgb(252,248,244)] disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-3">
          {sbEntries.map((entry, i) => (
            <BookOnlineRow key={i} index={i} entry={entry} treatments={bookOnlineTreatments} onUpdate={updateSb} onRemove={removeSb} guestName={entry.guestName || primaryGuestName} />
          ))}
          {sbEntries.length === 0 && (
            <p className="text-xs text-[rgb(180,165,150)] italic">No treatments added yet.</p>
          )}
        </div>
      </div>

      {/* Call-to-book / needs confirmation treatments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className={labelCls}>Treatments — Needs Verification / Call to Book</label>
            <p className="text-xs text-[rgb(150,150,150)]">Treatments requiring manual scheduling or confirmation.</p>
          </div>
          <button
            type="button"
            onClick={addCtb}
            disabled={ctbEntries.length >= 10}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-400 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-3">
          {ctbEntries.map((entry, i) => (
            <CtbRow key={i} index={i} entry={entry} treatments={callToBookTreatments} onUpdate={updateCtb} onRemove={removeCtb} guestName={entry.guestName || primaryGuestName} />
          ))}
          {ctbEntries.length === 0 && (
            <p className="text-xs text-[rgb(180,165,150)] italic">No call-to-book treatments added yet.</p>
          )}
        </div>
      </div>

      {/* Grand total */}
      {grandTotal > 0 && (
        <div className="flex items-center justify-between border-t border-[rgb(220,210,200)] pt-4">
          <div className="text-sm font-semibold text-[rgb(107,85,64)]">
            Treatment Total: ${grandTotal.toFixed(2)}
            {totalSb > 0 && totalCtb > 0 && (
              <span className="text-xs font-normal text-[rgb(150,130,110)] ml-2">
                (Book Online ${totalSb} + Call-to-Book ${totalCtb})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
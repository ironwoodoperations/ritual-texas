import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, X, ExternalLink, PenLine } from "lucide-react";

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

// A single SimplyBook treatment booking slot
function SbSlotRow({ index, entry, onUpdate, onRemove, guestName }) {
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [slotsError, setSlotsError] = useState(null);
  const [fetchedDate, setFetchedDate] = useState(null);
  const [manualMode, setManualMode] = useState(false);

  async function fetchAvailability(date) {
    if (!date || date === fetchedDate) return;
    setLoadingSlots(true);
    setSlotsError(null);
    setAvailableServices([]);
    try {
      const res = await base44.functions.invoke("simplybookGetAvailability", { date });
      if (res.data?.error) {
        setSlotsError(res.data.error);
      } else {
        setAvailableServices(res.data?.services || []);
        setFetchedDate(date);
        onUpdate(index, { ...entry, date, serviceId: "", serviceName: "", time: "", staffId: "", staffName: "", price: 0, duration: 0, slots: [], guestName: entry.guestName || guestName });
      }
    } catch (e) {
      setSlotsError(e.message);
    }
    setLoadingSlots(false);
  }

  function handleDateChange(date) {
    onUpdate(index, { ...entry, date, serviceId: "", serviceName: "", time: "", staffId: "", staffName: "", price: 0, duration: 0, slots: [], guestName: entry.guestName || guestName });
    fetchAvailability(date);
  }

  function handleServiceChange(svcId) {
    const svc = availableServices.find(s => s.id === svcId);
    if (!svc) {
      onUpdate(index, { ...entry, serviceId: "", serviceName: "", time: "", staffId: "", staffName: "", price: 0, duration: 0, slots: [], guestName: entry.guestName || guestName });
      return;
    }
    onUpdate(index, {
      ...entry,
      serviceId: svc.id,
      serviceName: svc.name,
      staffId: svc.staffId,
      staffName: svc.staffName,
      price: svc.price,
      duration: svc.duration,
      slots: svc.slots,
      time: svc.slots?.[0] || "",
      guestName: entry.guestName || guestName,
    });
  }

  const selectedSvc = availableServices.find(s => s.id === entry.serviceId);
  const slots = selectedSvc?.slots || entry.slots || [];

  // ── Manual Entry Mode ─────────────────────────────────────────────────────
  if (manualMode) {
    return (
      <div className="relative border border-[rgb(150,170,155)] rounded-xl p-4 bg-[rgb(248,252,249)]">
        <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold tracking-widest text-[rgb(100,140,110)] uppercase">
            Treatment {index + 1} · Manual Entry {guestName && `· ${guestName}`}
          </p>
          <button type="button" onClick={() => setManualMode(false)} className="text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)] hover:underline transition-colors">
            Try SimplyBook
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {guestName !== undefined && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Guest Name (Optional)</label>
              <input placeholder={guestName || "Guest name"} value={entry.guestName || guestName} onChange={e => onUpdate(index, { ...entry, guestName: e.target.value })} className={fieldCls} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelCls}>Treatment Name *</label>
            <input
              placeholder="e.g. Swedish Massage, Hot Stone, Facial…"
              value={entry.serviceName || ""}
              onChange={e => onUpdate(index, { ...entry, serviceName: e.target.value, serviceId: "manual" })}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Price ($)</label>
            <input type="number" min={0} value={entry.price || ""} onChange={e => onUpdate(index, { ...entry, price: parseFloat(e.target.value) || 0 })} className={fieldCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>Duration (min)</label>
            <input type="number" min={0} value={entry.duration || ""} onChange={e => onUpdate(index, { ...entry, duration: parseInt(e.target.value) || 0 })} className={fieldCls} placeholder="60" />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={entry.date || ""} onChange={e => onUpdate(index, { ...entry, date: e.target.value })} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Preferred Time</label>
            <input type="time" value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Therapist (Optional)</label>
            <input placeholder="Assign therapist…" value={entry.staffName || ""} onChange={e => onUpdate(index, { ...entry, staffName: e.target.value })} className={fieldCls} />
          </div>
        </div>
        {entry.serviceName && (
          <div className="mt-3 text-xs text-[rgb(80,130,90)] font-medium bg-[rgb(240,250,243)] rounded-lg px-3 py-1.5">
            ✓ {entry.serviceName}{entry.date ? ` · ${entry.date}` : ""}{entry.time ? ` at ${entry.time}` : ""}{entry.price ? ` · $${entry.price}` : ""}
          </div>
        )}
      </div>
    );
  }

  // ── SimplyBook Live Mode ───────────────────────────────────────────────────
  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,250,248)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>

      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Treatment {index + 1} {guestName && `· ${guestName}`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {guestName !== undefined && (
          <div>
            <label className={labelCls}>Guest Name (Optional)</label>
            <input placeholder={guestName || "Guest name"} value={entry.guestName || guestName} onChange={e => onUpdate(index, { ...entry, guestName: e.target.value })} className={fieldCls} />
          </div>
        )}

        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={entry.date || ""} onChange={e => handleDateChange(e.target.value)} className={fieldCls} />
        </div>

        <div>
          <label className={labelCls}>Treatment</label>
          {loadingSlots ? (
            <div className="flex items-center gap-2 py-2 text-xs text-[rgb(150,150,150)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability…
            </div>
          ) : !entry.date ? (
            <p className="text-xs text-[rgb(190,175,160)] py-2">Select a date first</p>
          ) : slotsError ? (
            <div className="py-2">
              <p className="text-xs text-red-500 mb-2">SimplyBook unavailable</p>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(150,170,155)] text-white text-xs hover:opacity-90 transition-opacity"
              >
                <PenLine className="w-3 h-3" /> Enter Manually
              </button>
            </div>
          ) : availableServices.length === 0 && fetchedDate === entry.date ? (
            <div className="py-2">
              <p className="text-xs text-[rgb(190,160,140)] mb-2">No services available this date</p>
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(150,170,155)] text-xs text-[rgb(80,120,90)] hover:bg-[rgb(245,250,246)] transition-colors"
              >
                <PenLine className="w-3 h-3" /> Enter Manually
              </button>
            </div>
          ) : (
            <select value={entry.serviceId || ""} onChange={e => handleServiceChange(e.target.value)} className={selectCls}>
              <option value="">Select treatment…</option>
              {availableServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} · {s.duration}min · ${s.price}</option>
              ))}
            </select>
          )}
        </div>

        {entry.serviceId && !slotsError && (
          <div>
            <label className={labelCls}>Available Time</label>
            <select value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={selectCls}>
              <option value="">Select time…</option>
              {slots.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {entry.staffName && (
          <div>
            <label className={labelCls}>Therapist (auto-assigned)</label>
            <p className="text-sm text-[rgb(107,85,64)] py-2">{entry.staffName}</p>
          </div>
        )}
      </div>

      {entry.serviceName && entry.time && (
        <div className="mt-3 text-xs text-[rgb(107,85,64)] font-medium bg-[rgb(248,244,240)] rounded-lg px-3 py-1.5">
          ✓ {entry.serviceName} · {entry.date} at {entry.time}{entry.price ? ` · $${entry.price}` : ""}
        </div>
      )}

      {/* Manual fallback button always visible at bottom */}
      {!slotsError && (
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="mt-3 flex items-center gap-1 text-xs text-[rgb(180,160,140)] hover:text-[rgb(107,85,64)] transition-colors"
        >
          <PenLine className="w-3 h-3" /> Enter manually instead
        </button>
      )}
    </div>
  );
}

// A single "call to book" treatment row
function CtbRow({ index, entry, treatments, onUpdate, onRemove, guestName }) {
  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,248,252)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Call-to-Book Treatment {index + 1} {guestName && `· ${guestName}`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {guestName !== undefined && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Guest Name (Optional)</label>
            <input placeholder={guestName || "Guest name"} value={entry.guestName || guestName} onChange={e => onUpdate(index, { ...entry, guestName: e.target.value })} className={fieldCls} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelCls}>Treatment</label>
          {treatments.length > 0 ? (
            <select value={entry.id || ""} onChange={e => {
              const t = treatments.find(t => t.id === e.target.value);
              if (t) onUpdate(index, { ...entry, id: t.id, name: t.name, price: t.price, duration: t.duration_minutes });
            }} className={selectCls}>
              <option value="">Select treatment…</option>
              {treatments.map(t => (
                <option key={t.id} value={t.id}>{t.name} · {t.duration_minutes}min · ${t.price}</option>
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

export default function TreatmentSlotPicker({ sbEntries, ctbEntries, callToBookTreatments, onSbChange, onCtbChange, primaryGuestName, guestEmail = "", guestName = "" }) {
  const [sbUrlOpened, setSbUrlOpened] = useState(false);

  function addSb() {
    if (sbEntries.length >= 10) return;
    onSbChange([...sbEntries, { date: "", serviceId: "", serviceName: "", time: "", staffId: "", staffName: "", price: 0, duration: 0, slots: [], guestName: primaryGuestName }]);
  }

  function removeSb(index) { onSbChange(sbEntries.filter((_, i) => i !== index)); }
  function updateSb(index, entry) { const next = [...sbEntries]; next[index] = entry; onSbChange(next); }

  function addCtb() {
    if (ctbEntries.length >= 10) return;
    onCtbChange([...ctbEntries, { id: "", name: "", price: 0, duration: 0, date: "", time: "", guestName: primaryGuestName }]);
  }

  function removeCtb(index) { onCtbChange(ctbEntries.filter((_, i) => i !== index)); }
  function updateCtb(index, entry) { const next = [...ctbEntries]; next[index] = entry; onCtbChange(next); }

  function openSimplyBookScheduler() {
    window.open("https://secure.simplybook.me/login", "_blank", "noopener,noreferrer");
    setSbUrlOpened(true);
  }

  const totalSb = sbEntries.reduce((s, e) => s + (e.price || 0), 0);
  const totalCtb = ctbEntries.reduce((s, e) => s + (e.price || 0), 0);
  const grandTotal = totalSb + totalCtb;
  const hasSbEntries = sbEntries.length > 0;

  return (
    <div className="space-y-6">
      {/* SimplyBook treatments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className={labelCls}>SimplyBook Treatments (Planning)</label>
            <p className="text-xs text-[rgb(150,150,150)]">Pick dates and treatments to include in your quote. Final booking in SimplyBook.</p>
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
            <SbSlotRow key={i} index={i} entry={entry} onUpdate={updateSb} onRemove={removeSb} guestName={entry.guestName || primaryGuestName} />
          ))}
          {sbEntries.length === 0 && (
            <p className="text-xs text-[rgb(180,165,150)] italic">No SimplyBook treatments added yet.</p>
          )}
        </div>
      </div>

      {/* Call-to-book treatments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className={labelCls}>Call-to-Book Treatments</label>
            <p className="text-xs text-[rgb(150,150,150)]">Treatments requiring manual scheduling. Add for planning purposes.</p>
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

      {/* Total & Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[rgb(220,210,200)] pt-4">
        {grandTotal > 0 && (
          <div className="text-sm font-semibold text-[rgb(107,85,64)]">
            Quote Total: ${grandTotal.toFixed(2)}
            {totalSb > 0 && totalCtb > 0 && (
              <span className="text-xs font-normal text-[rgb(150,130,110)] ml-2">
                (SimplyBook ${totalSb} + Call-to-Book ${totalCtb})
              </span>
            )}
          </div>
        )}
        {hasSbEntries && (
          <button
            type="button"
            onClick={openSimplyBookScheduler}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="w-4 h-4" /> Open SimplyBook Scheduler
          </button>
        )}
      </div>
    </div>
  );
}
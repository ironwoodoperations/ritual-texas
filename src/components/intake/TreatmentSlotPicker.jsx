import React from "react";
import { Plus, X } from "lucide-react";

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

const THERAPISTS = ["Whitney", "Bishop", "Tanita"];

// A single "book online" treatment row — uses DB dropdown
function BookOnlineRow({ index, entry, treatments, onUpdate, onRemove, guestName }) {
  function handleTreatmentChange(id) {
    const t = treatments.find(t => t.id === id);
    if (t) {
      onUpdate(index, { ...entry, serviceId: t.id, serviceName: t.name, price: t.price, duration: t.duration_minutes });
    } else {
      onUpdate(index, { ...entry, serviceId: "", serviceName: "", price: 0, duration: 0 });
    }
  }

  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,250,248)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Treatment {index + 1} {guestName && `· ${guestName}`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Treatment</label>
          {treatments.length > 0 ? (
            <select value={entry.serviceId || ""} onChange={e => handleTreatmentChange(e.target.value)} className={selectCls}>
              <option value="">Select treatment…</option>
              {treatments.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.duration_minutes}min — ${t.price}</option>
              ))}
            </select>
          ) : (
            <input
              placeholder="Treatment name…"
              value={entry.serviceName || ""}
              onChange={e => onUpdate(index, { ...entry, serviceName: e.target.value, serviceId: "manual" })}
              className={fieldCls}
            />
          )}
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={entry.date || ""} onChange={e => onUpdate(index, { ...entry, date: e.target.value })} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Preferred Time</label>
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
      {entry.serviceName && (
        <div className="mt-3 text-xs text-[rgb(107,85,64)] font-medium bg-[rgb(248,244,240)] rounded-lg px-3 py-1.5">
          ✓ {entry.serviceName}{entry.date ? ` · ${entry.date}` : ""}{entry.time ? ` at ${entry.time}` : ""}{entry.price ? ` · $${entry.price}` : ""}{entry.staffName ? ` · ${entry.staffName}` : ""}
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
import React from "react";
import { Loader2 } from "lucide-react";

const inputCls = "w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)]";

export default function SimplyBookSection({ form, onChange, services, staff, loading }) {
  const selected = form.selectedTreatments || [];

  function toggleService(svc) {
    const exists = selected.find(s => s.id === svc.id);
    if (exists) {
      onChange("selectedTreatments", selected.filter(s => s.id !== svc.id));
    } else {
      onChange("selectedTreatments", [...selected, { id: svc.id, name: svc.name, price: svc.price, duration: svc.duration }]);
    }
  }

  return (
    <div className="space-y-4">
      {/* Service picker */}
      <div>
        <label className="text-xs text-[rgb(150,150,150)] mb-2 block">Select Treatments</label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[rgb(150,150,150)]">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading services…
          </div>
        ) : services.length === 0 ? (
          <p className="text-xs text-[rgb(180,150,130)]">No SimplyBook services found — add manually below.</p>
        ) : (
          <div className="border border-[rgb(235,225,213)] rounded-xl divide-y divide-[rgb(235,225,213)] max-h-64 overflow-y-auto">
            {services.map(svc => {
              const isSelected = selected.some(s => s.id === svc.id);
              return (
                <label key={svc.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-[rgb(240,248,242)]' : 'hover:bg-[rgb(248,246,242)]'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleService(svc)}
                    className="accent-[rgb(150,170,155)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[rgb(45,45,45)]">{svc.name}</p>
                    <p className="text-xs text-[rgb(150,150,150)]">
                      {svc.duration ? `${svc.duration} min` : ""}
                      {svc.duration && svc.price ? " · " : ""}
                      {svc.price ? `$${svc.price}` : ""}
                    </p>
                  </div>
                  {isSelected && <span className="text-xs text-[rgb(150,170,155)] font-medium">✓</span>}
                </label>
              );
            })}
          </div>
        )}
        {selected.length > 0 && (
          <p className="text-xs text-[rgb(150,170,155)] mt-1.5 font-medium">{selected.length} treatment{selected.length > 1 ? "s" : ""} selected</p>
        )}
      </div>

      {/* Scheduling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Preferred Date</label>
          <input
            type="date"
            value={form.preferredTreatmentDate}
            onChange={e => onChange("preferredTreatmentDate", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Preferred Time (HH:MM)</label>
          <input
            type="time"
            value={form.preferredTreatmentTime}
            onChange={e => onChange("preferredTreatmentTime", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Preferred Therapist</label>
          {staff.length > 0 ? (
            <select
              value={form.preferredTherapist}
              onChange={e => onChange("preferredTherapist", e.target.value)}
              className={inputCls}
            >
              <option value="">No preference</option>
              {staff.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          ) : (
            <input
              placeholder="Therapist name"
              value={form.preferredTherapist}
              onChange={e => onChange("preferredTherapist", e.target.value)}
              className={inputCls}
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-[rgb(45,45,45)] cursor-pointer border border-[rgb(235,225,213)] rounded-xl px-3 py-2 self-end">
          <input
            type="checkbox"
            checked={form.flexibleOnTime}
            onChange={e => onChange("flexibleOnTime", e.target.checked)}
            className="accent-[rgb(150,170,155)]"
          />
          Flexible on time
        </label>
      </div>
      <textarea
        placeholder="Special notes for treatments (e.g. injuries, preferences)…"
        value={form.treatmentsRequested}
        onChange={e => onChange("treatmentsRequested", e.target.value)}
        className={inputCls + " h-16 resize-none"}
      />
    </div>
  );
}
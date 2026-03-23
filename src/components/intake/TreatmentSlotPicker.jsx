import React, { useState, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const fieldCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] placeholder-[rgb(190,180,170)] transition-colors";
const selectCls = "w-full border-0 border-b border-[rgb(220,210,200)] bg-transparent py-2 text-sm text-[rgb(45,45,45)] focus:outline-none focus:border-[rgb(107,85,64)] transition-colors cursor-pointer";
const labelCls = "block text-[10px] font-semibold tracking-widest text-[rgb(150,130,110)] uppercase mb-0.5";

const THERAPISTS = ["Whitney", "Bishop", "Tanita"];

function fmtSlot(slot) {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 || 12;
  return `${dh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// A single "book online" treatment row — local state, date-first, fully chained from SimplyBook
function BookOnlineRow({ index, entry, treatments, onUpdate, onRemove, guestName, allGuestNames = [] }) {
  const [date, setDate] = useState(entry.date || "");
  const [availabilityData, setAvailabilityData] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState(entry.simplybookServiceId || "");
  const [selectedProviderId, setSelectedProviderId] = useState(entry.staffId || "");
  const [selectedTime, setSelectedTime] = useState(entry.time || "");

  // Fallback mode
  const [fallbackTreatmentId, setFallbackTreatmentId] = useState("");
  const [fallbackManualTime, setFallbackManualTime] = useState("");

  // Derived
  const selectedService  = availabilityData?.services?.find(s => s.id === selectedServiceId) || null;
  const selectedProvider = selectedService?.providers?.find(p => p.id === selectedProviderId) || null;

  async function fetchAvailability(selectedDate) {
    setLoadingAvailability(true);
    setAvailabilityError(false);
    setAvailabilityData(null);
    try {
      const res = await base44.functions.invoke("simplybookGetAvailability", { date: selectedDate });
      if (res?.data?.error || !res?.data?.services) {
        setAvailabilityError(true);
      } else {
        setAvailabilityData(res.data);
      }
    } catch {
      setAvailabilityError(true);
    } finally {
      setLoadingAvailability(false);
    }
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    setSelectedServiceId("");
    setSelectedProviderId("");
    setSelectedTime("");
    setAvailabilityData(null);
    setAvailabilityError(false);
    setFallbackTreatmentId("");
    setFallbackManualTime("");
    // Sync to parent so the entry date is preserved on save
    onUpdate(index, { ...entry, date: newDate, simplybookServiceId: "", serviceName: "", price: 0, duration: 0, staffId: "", staffName: "", time: "", source: "" });
    if (newDate) fetchAvailability(newDate);
  }

  function handleServiceChange(svcId) {
    setSelectedServiceId(svcId);
    setSelectedProviderId("");
    setSelectedTime("");
  }

  function handleProviderChange(providerId) {
    setSelectedProviderId(providerId);
    setSelectedTime("");
  }

  function handleAdd() {
    if (!date || !selectedServiceId || !selectedProviderId || !selectedTime) return;
    onUpdate(index, {
      ...entry,
      simplybookServiceId: selectedServiceId,
      serviceName: selectedService.name,
      staffId: selectedProviderId,
      staffName: selectedProvider.name,
      date,
      time: selectedTime,
      price: selectedService.price,
      duration: selectedService.duration,
      source: "simplybook",
    });
    // Reset local state
    setDate(""); setSelectedServiceId(""); setSelectedProviderId(""); setSelectedTime("");
    setAvailabilityData(null); setAvailabilityError(false);
  }

  function handleFallbackAdd() {
    if (!date || !fallbackTreatmentId || !fallbackManualTime) return;
    const t = treatments.find(t => t.id === fallbackTreatmentId);
    if (!t) return;
    onUpdate(index, {
      ...entry,
      simplybookServiceId: null,
      serviceName: t.name,
      staffId: null,
      staffName: null,
      date,
      time: fallbackManualTime,
      price: t.price,
      duration: t.duration_minutes,
      source: "manual",
    });
    setDate(""); setFallbackTreatmentId(""); setFallbackManualTime("");
    setAvailabilityData(null); setAvailabilityError(false);
  }

  const canAdd = date && selectedServiceId && selectedProviderId && selectedTime;
  const canFallbackAdd = date && fallbackTreatmentId && fallbackManualTime;

  // Show saved state when entry already has data
  const isSaved = entry.serviceName && entry.date && entry.time;

  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,250,248)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Treatment {index + 1}
      </p>

      {allGuestNames.length > 0 && (
        <div className="mb-3">
          <label className={labelCls}>Guest</label>
          <select value={guestName || ""} onChange={e => onUpdate(index, { ...entry, guestName: e.target.value })} className={selectCls}>
            <option value="">Select guest…</option>
            {allGuestNames.map((name, i) => <option key={i} value={name}>{name}</option>)}
          </select>
        </div>
      )}

      {/* If already saved, show summary with option to clear */}
      {isSaved && !date ? (
        <div className="flex items-center justify-between bg-[rgb(248,244,240)] rounded-lg px-3 py-2">
          <div className="text-xs text-[rgb(107,85,64)] font-medium">
            ✓ {entry.serviceName} · {entry.staffName || "—"} · {entry.date} at {entry.time?.slice(0,5)}
            {entry.price ? ` · $${entry.price}` : ""}
            {entry.source === "simplybook" && <span className="ml-1.5 text-[rgb(150,170,155)]">· SimplyBook ✓</span>}
          </div>
          <button type="button" onClick={() => onUpdate(index, { ...entry, serviceName: "", date: "", time: "", simplybookServiceId: "", staffId: "", staffName: "", source: "" })} className="text-[10px] text-[rgb(150,130,110)] underline ml-3">Edit</button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Step 1: Date */}
          <div>
            <label className={labelCls}>
              Date
              {loadingAvailability && <Loader2 className="inline w-3 h-3 animate-spin ml-1.5 text-[rgb(150,170,155)]" />}
              {!loadingAvailability && date && availabilityData && (
                <span className="ml-1.5 text-[10px] text-[rgb(150,170,155)] font-normal normal-case tracking-normal">
                  {availabilityData.services.length} service{availabilityData.services.length !== 1 ? "s" : ""} available
                </span>
              )}
            </label>
            <input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className={fieldCls} />
          </div>

          {/* Loading state */}
          {loadingAvailability && (
            <p className="text-xs text-[rgb(150,170,155)] flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking SimplyBook availability…
            </p>
          )}

          {/* SimplyBook mode */}
          {!loadingAvailability && availabilityData && !availabilityError && (
            <>
              {/* Step 2: Treatment */}
              <div>
                <label className={labelCls}>Treatment</label>
                <select value={selectedServiceId} onChange={e => handleServiceChange(e.target.value)} className={selectCls}>
                  <option value="">Select treatment…</option>
                  {availabilityData.services.map(svc => (
                    <option key={svc.id} value={svc.id}>{svc.name} — {svc.duration}min — ${svc.price}</option>
                  ))}
                </select>
              </div>

              {/* Step 3: Provider */}
              {selectedServiceId && (
                <div>
                  <label className={labelCls}>Therapist / Provider</label>
                  <select value={selectedProviderId} onChange={e => handleProviderChange(e.target.value)} className={selectCls}>
                    <option value="">Select therapist…</option>
                    {selectedService?.providers?.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.slots.length} slot{p.slots.length !== 1 ? "s" : ""} available</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Step 4: Time */}
              {selectedProviderId && (
                <div>
                  <label className={labelCls}>Time</label>
                  <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className={selectCls}>
                    <option value="">Select time…</option>
                    {selectedProvider?.slots?.map(slot => (
                      <option key={slot} value={slot}>{fmtSlot(slot)}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleAdd}
                disabled={!canAdd}
                className="w-full py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                + Add Treatment
              </button>
            </>
          )}

          {/* Fallback mode */}
          {!loadingAvailability && availabilityError && date && (
            <>
              <div className="text-yellow-600 text-sm">
                ⚠️ SimplyBook unavailable — selecting from local treatment list
              </div>
              <div>
                <label className={labelCls}>Treatment</label>
                <select value={fallbackTreatmentId} onChange={e => setFallbackTreatmentId(e.target.value)} className={selectCls}>
                  <option value="">Select treatment…</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.duration_minutes}min — ${t.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Time</label>
                <input type="time" value={fallbackManualTime} onChange={e => setFallbackManualTime(e.target.value)} className={fieldCls} />
              </div>
              <button
                type="button"
                onClick={handleFallbackAdd}
                disabled={!canFallbackAdd}
                className="w-full py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-xs font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                + Add Treatment (Manual)
              </button>
            </>
          )}

          {/* Prompt when no date yet */}
          {!date && !loadingAvailability && (
            <p className="text-xs text-[rgb(190,175,160)] italic">Select a date above to see available treatments</p>
          )}
        </div>
      )}
    </div>
  );
}

// A single "call to book" treatment row — needs verification/confirmation
function CtbRow({ index, entry, treatments, onUpdate, onRemove, guestName, allGuestNames = [] }) {
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsFailed, setSlotsFailed] = useState(false);

  // Fetch available time slots when treatment + therapist + date are all selected
  useEffect(() => {
    const treatmentName = entry.name || "";
    const staffName = entry.staffName || "";
    const date = entry.date || "";
    if (!treatmentName || !staffName || !date) {
      setSlots([]);
      setSlotsFailed(false);
      return;
    }

    let cancelled = false;
    async function fetchSlots() {
      setSlotsLoading(true);
      setSlots([]);
      setSlotsFailed(false);
      try {
        const res = await base44.functions.invoke("simplybookGetAvailability", { date });
        if (cancelled) return;
        const services = res?.data?.services || [];
        // Match service by name (case-insensitive partial match)
        const matchedSvc = services.find(s =>
          s.name?.toLowerCase() === treatmentName.toLowerCase()
        ) || services.find(s =>
          s.name?.toLowerCase().includes(treatmentName.toLowerCase()) ||
          treatmentName.toLowerCase().includes(s.name?.toLowerCase())
        );
        if (!matchedSvc) { setSlotsFailed(true); setSlotsLoading(false); return; }
        // Match provider by name
        const matchedProvider = matchedSvc.providers?.find(p =>
          p.name?.toLowerCase() === staffName.toLowerCase()
        ) || matchedSvc.providers?.find(p =>
          p.name?.toLowerCase().includes(staffName.toLowerCase()) ||
          staffName.toLowerCase().includes(p.name?.toLowerCase())
        );
        const foundSlots = matchedProvider?.slots || [];
        if (foundSlots.length > 0) {
          setSlots(foundSlots);
          setSlotsFailed(false);
        } else {
          setSlots([]);
          setSlotsFailed(true);
        }
      } catch {
        if (!cancelled) { setSlots([]); setSlotsFailed(true); }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    fetchSlots();
    return () => { cancelled = true; };
  }, [entry.name, entry.staffName, entry.date]);

  return (
    <div className="relative border border-[rgb(220,210,200)] rounded-xl p-4 bg-[rgb(252,248,252)]">
      <button type="button" onClick={() => onRemove(index)} className="absolute top-3 right-3 text-[rgb(190,170,150)] hover:text-red-400 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <p className="text-[10px] font-bold tracking-widest text-[rgb(150,130,110)] uppercase mb-3">
        Confirmation Needed — Treatment {index + 1}
      </p>

      {allGuestNames.length > 0 && (
        <div className="mb-3">
          <label className={labelCls}>Guest</label>
          <select value={guestName || ""} onChange={e => onUpdate(index, { ...entry, guestName: e.target.value })} className={selectCls}>
            <option value="">Select guest…</option>
            {allGuestNames.map((name, i) => <option key={i} value={name}>{name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Treatment</label>
          {treatments.length > 0 ? (
            <select value={entry.id || ""} onChange={e => {
              const t = treatments.find(t => t.id === e.target.value);
              if (t) onUpdate(index, { ...entry, id: t.id, name: t.name, price: t.price, duration: t.duration_minutes, time: "" });
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
              onChange={e => onUpdate(index, { ...entry, name: e.target.value, id: "manual", time: "" })}
              className={fieldCls}
            />
          )}
        </div>
        <div>
          <label className={labelCls}>Requested Date</label>
          <input type="date" value={entry.date || ""} onChange={e => onUpdate(index, { ...entry, date: e.target.value, time: "" })} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>
            Requested Time
            {slotsLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1.5 text-[rgb(150,170,155)]" />}
          </label>
          {slotsLoading ? (
            <p className="text-xs text-[rgb(150,170,155)] flex items-center gap-1.5 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading times…
            </p>
          ) : slots.length > 0 ? (
            <select value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={selectCls}>
              <option value="">Select time…</option>
              {slots.map(slot => (
                <option key={slot} value={slot}>{fmtSlot(slot)}</option>
              ))}
            </select>
          ) : (
            <>
              <input type="time" value={entry.time || ""} onChange={e => onUpdate(index, { ...entry, time: e.target.value })} className={fieldCls} />
              {slotsFailed && entry.name && entry.staffName && entry.date && (
                <p className="text-[10px] text-yellow-600 mt-1">No slots found — enter time manually</p>
              )}
            </>
          )}
        </div>
        <div>
          <label className={labelCls}>Therapist</label>
          <select value={entry.staffName || ""} onChange={e => onUpdate(index, { ...entry, staffName: e.target.value, time: "" })} className={selectCls}>
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

export default function TreatmentSlotPicker({ sbEntries, ctbEntries, bookOnlineTreatments = [], callToBookTreatments = [], onSbChange, onCtbChange, primaryGuestName, guestNames = [] }) {
  const allGuestNames = guestNames.length > 0 ? guestNames : (primaryGuestName ? [primaryGuestName] : []);
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
            <BookOnlineRow key={i} index={i} entry={entry} treatments={bookOnlineTreatments} onUpdate={updateSb} onRemove={removeSb} guestName={entry.guestName || primaryGuestName} allGuestNames={allGuestNames} />
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
            <CtbRow key={i} index={i} entry={entry} treatments={callToBookTreatments} onUpdate={updateCtb} onRemove={removeCtb} guestName={entry.guestName || primaryGuestName} allGuestNames={allGuestNames} />
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
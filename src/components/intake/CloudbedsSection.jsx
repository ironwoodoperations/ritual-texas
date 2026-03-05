import React from "react";
import { Loader2 } from "lucide-react";

const inputCls = "w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)]";

export default function CloudbedsSection({ form, onChange, roomTypes, loading }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Check-In Date *</label>
          <input
            type="date"
            value={form.checkInDate}
            onChange={e => onChange("checkInDate", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Check-Out Date *</label>
          <input
            type="date"
            value={form.checkOutDate}
            onChange={e => onChange("checkOutDate", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Number of Adults *</label>
          <input
            type="number"
            min={1}
            max={4}
            value={form.numberOfGuests}
            onChange={e => onChange("numberOfGuests", parseInt(e.target.value) || 1)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Room Type *</label>
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(150,150,150)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading rooms…
            </div>
          ) : (
            <select
              value={form.cloudbedsRoomTypeId}
              onChange={e => onChange("cloudbedsRoomTypeId", e.target.value)}
              className={inputCls}
            >
              <option value="">-- Select Room Type --</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Children</label>
          <input
            type="number"
            min={0}
            max={4}
            value={form.numberOfChildren || 0}
            onChange={e => onChange("numberOfChildren", parseInt(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[rgb(45,45,45)] cursor-pointer border border-[rgb(235,225,213)] rounded-xl px-3 py-2">
          <input
            type="checkbox"
            checked={form.flexibleOnRoom}
            onChange={e => onChange("flexibleOnRoom", e.target.checked)}
            className="accent-[rgb(150,170,155)]"
          />
          Flexible on room type
        </label>
      </div>
      <textarea
        placeholder="Special requests for hotel stay (e.g. ground floor, early check-in)…"
        value={form.hotelNotes}
        onChange={e => onChange("hotelNotes", e.target.value)}
        className={inputCls + " h-20 resize-none"}
      />
    </div>
  );
}
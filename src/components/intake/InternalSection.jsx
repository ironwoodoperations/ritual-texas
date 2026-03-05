import React from "react";
import { Lock } from "lucide-react";

const inputCls = "w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)]";

export default function InternalSection({ form, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <textarea
          placeholder="Internal notes…"
          value={form.internalNotes}
          onChange={e => onChange("internalNotes", e.target.value)}
          className={inputCls + " h-24 resize-none sm:col-span-2"}
        />
        <div>
          <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Follow-Up Date</label>
          <input
            type="date"
            value={form.followUpDate}
            onChange={e => onChange("followUpDate", e.target.value)}
            className={inputCls}
          />
        </div>
        <select
          value={form.bookingStatus}
          onChange={e => onChange("bookingStatus", e.target.value)}
          className={inputCls}
        >
          <option value="new_inquiry">New Inquiry</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Card on file */}
      <div className="border border-[rgb(235,225,213)] rounded-xl p-4 bg-[rgb(250,248,245)] space-y-3">
        <p className="text-xs tracking-widest font-semibold text-[rgb(150,150,150)] uppercase flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Card on File (Internal Only)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Cardholder Name" value={form.ccName} onChange={e => onChange("ccName", e.target.value)} className={inputCls} />
          <select value={form.ccType} onChange={e => onChange("ccType", e.target.value)} className={inputCls}>
            <option value="">Card Type</option>
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="Amex">Amex</option>
            <option value="Discover">Discover</option>
          </select>
          <input placeholder="Last 4 digits" value={form.ccLast4} onChange={e => onChange("ccLast4", e.target.value)} className={inputCls} maxLength={4} />
          <input placeholder="Expiry MM/YY" value={form.ccExpiry} onChange={e => onChange("ccExpiry", e.target.value)} className={inputCls} maxLength={5} />
        </div>
        <textarea placeholder="Card notes (deposit auth, amount, date…)" value={form.ccNotes} onChange={e => onChange("ccNotes", e.target.value)} className={inputCls + " h-14 resize-none"} />
        <p className="text-xs text-[rgb(180,160,140)]">⚠️ Reference info only — never enter full card numbers.</p>
      </div>
    </div>
  );
}
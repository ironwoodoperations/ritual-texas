import React from "react";

const inputCls = "w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)]";

export default function GuestSection({ form, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Guest Full Name *"
          value={form.guestName}
          onChange={e => onChange("guestName", e.target.value)}
          className={inputCls}
        />
        <input
          placeholder="Email *"
          value={form.email}
          onChange={e => onChange("email", e.target.value)}
          className={inputCls}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={e => onChange("phone", e.target.value)}
          className={inputCls}
        />
        <select
          value={form.preferredContactMethod}
          onChange={e => onChange("preferredContactMethod", e.target.value)}
          className={inputCls}
        >
          <option value="phone">Preferred: Phone Call</option>
          <option value="text">Preferred: Text</option>
          <option value="email">Preferred: Email</option>
        </select>
      </div>
    </div>
  );
}
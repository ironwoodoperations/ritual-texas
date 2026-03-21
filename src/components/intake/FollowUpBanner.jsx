import React from "react";
import { AlertTriangle } from "lucide-react";

export default function FollowUpBanner({ records, onFilter }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = records.filter(r => {
    if (!r.followUpDate) return false;
    if (["confirmed", "archived", "declined"].includes(r.bookingStatus)) return false;
    const d = new Date(r.followUpDate + "T00:00:00");
    return d <= today;
  });

  if (overdue.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-4">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-sm text-amber-800 flex-1">
        <strong>{overdue.length} follow-up{overdue.length > 1 ? "s" : ""}</strong> need attention today.
      </span>
      <button
        onClick={() => onFilter("overdue_followup")}
        className="text-xs text-amber-700 underline hover:text-amber-900 whitespace-nowrap"
      >
        View them
      </button>
    </div>
  );
}
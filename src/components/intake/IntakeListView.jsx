import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
  archived: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS = {
  new_inquiry: "New Inquiry", pending: "Pending", confirmed: "Confirmed",
  declined: "Declined", archived: "Archived",
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function IntakeListView({ records, onSelect, sortKey, onSortChange }) {
  const today = todayStr();

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
      {/* Sort bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgb(235,225,213)] bg-[rgb(248,246,242)]">
        <span className="text-xs text-[rgb(150,130,110)] font-semibold uppercase tracking-widest">Sort:</span>
        {[
          { key: "newest", label: "Newest" },
          { key: "oldest", label: "Oldest" },
          { key: "checkin", label: "Check-In" },
          { key: "followup", label: "Follow-Up" },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => onSortChange(s.key)}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${sortKey === s.key ? "bg-[rgb(107,85,64)] text-white" : "text-[rgb(120,120,120)] hover:text-[rgb(45,45,45)]"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-10 text-sm text-[rgb(150,150,150)]">No records match.</div>
      )}

      <div className="divide-y divide-[rgb(235,225,213)]">
        {records.map(r => {
          const sbCount = Array.isArray(r.selectedTreatments) ? r.selectedTreatments.length : 0;
          const ctbCount = Array.isArray(r.callToBookTreatments) ? r.callToBookTreatments.length : 0;
          const txCount = sbCount + ctbCount;
          const followOverdue = r.followUpDate && r.followUpDate < today;
          const followToday = r.followUpDate === today;

          return (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full text-left px-4 py-3 hover:bg-[rgb(250,248,245)] transition-colors flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-[rgb(45,45,45)] truncate">{r.guestName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[r.bookingStatus] || ""}`}>
                    {STATUS_LABELS[r.bookingStatus] || r.bookingStatus}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[rgb(120,120,120)] flex-wrap">
                  {r.phone && <span>{r.phone}</span>}
                  {r.checkInDate && <span>{r.checkInDate} → {r.checkOutDate}</span>}
                  {txCount > 0 && <span className="text-[rgb(150,170,155)]">✨ {txCount} tx</span>}
                </div>
              </div>
              {r.followUpDate && (
                <div className={`text-xs shrink-0 flex items-center gap-1 ${followOverdue ? "text-red-600 font-medium" : followToday ? "text-amber-600 font-medium" : "text-[rgb(150,150,150)]"}`}>
                  {followOverdue && <AlertTriangle className="w-3 h-3" />}
                  {!followOverdue && <Clock className="w-3 h-3" />}
                  {r.followUpDate}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
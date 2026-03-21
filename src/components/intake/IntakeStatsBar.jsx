import React from "react";

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isNextSevenDays(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setDate(end.getDate() + 7);
  return d >= now && d <= end;
}

export default function IntakeStatsBar({ records, activeFilter, onFilter }) {
  const newCount = records.filter(r => r.bookingStatus === "new_inquiry").length;
  const pendingCount = records.filter(r => r.bookingStatus === "pending").length;
  const confirmedMonth = records.filter(r => r.bookingStatus === "confirmed" && isThisMonth(r.checkInDate)).length;
  const arrivingWeek = records.filter(r =>
    isNextSevenDays(r.checkInDate) &&
    r.bookingStatus !== "archived" &&
    r.bookingStatus !== "declined"
  ).length;

  const cards = [
    { key: "new_inquiry", label: "New Inquiries", count: newCount, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    { key: "pending", label: "Awaiting Response", count: pendingCount, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { key: "confirmed_month", label: "Confirmed This Month", count: confirmedMonth, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    { key: "arriving_week", label: "Arriving This Week", count: arrivingWeek, color: "text-[rgb(107,85,64)]", bg: "bg-[rgb(250,247,244)]", border: "border-[rgb(198,182,165)]" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {cards.map(c => (
        <button
          key={c.key}
          onClick={() => onFilter(activeFilter === c.key ? "active" : c.key)}
          className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
            activeFilter === c.key
              ? `${c.bg} ${c.border} shadow-sm`
              : "bg-white border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]"
          }`}
        >
          <div className={`text-2xl font-light mb-1 ${activeFilter === c.key ? c.color : "text-[rgb(45,45,45)]"}`}>{c.count}</div>
          <div className="text-xs text-[rgb(120,120,120)] leading-tight">{c.label}</div>
        </button>
      ))}
    </div>
  );
}
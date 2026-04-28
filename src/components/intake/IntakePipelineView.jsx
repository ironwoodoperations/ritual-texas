import React, { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const STATUS_COLORS = {
  new_inquiry: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  booked_reserved: "bg-emerald-100 text-emerald-800",
  not_now: "bg-purple-100 text-purple-700",
  lost_price: "bg-orange-100 text-orange-700",
  lost_competitor: "bg-orange-100 text-orange-700",
  lost_no_response: "bg-orange-100 text-orange-700",
  lost_dates_unavailable: "bg-orange-100 text-orange-700",
  do_not_contact: "bg-red-200 text-red-800",
  declined: "bg-red-100 text-red-600",
  archived: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS = {
  new_inquiry: "New Inquiry", pending: "Pending", confirmed: "Confirmed",
  booked_reserved: "Booked / Reserved ✓",
  not_now: "Not Now", lost_price: "Lost – Price", lost_competitor: "Lost – Competitor",
  lost_no_response: "Lost – No Response", lost_dates_unavailable: "Lost – Dates N/A",
  do_not_contact: "Do Not Contact", declined: "Declined", archived: "Archived",
};

function sortByCheckIn(records) {
  return [...records].sort((a, b) => {
    if (!a.checkInDate && !b.checkInDate) return 0;
    if (!a.checkInDate) return 1;
    if (!b.checkInDate) return -1;
    return a.checkInDate.localeCompare(b.checkInDate);
  });
}

const COLUMNS = [
  { key: "new_inquiry", label: "New Inquiry", color: "rgb(59,130,246)" },
  { key: "pending", label: "Pending", color: "rgb(217,119,6)" },
  { key: "confirmed", label: "Confirmed", color: "rgb(22,163,74)" },
  { key: "booked_reserved", label: "Booked / Reserved ✓", color: "rgb(5,150,105)" },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function FollowUpChip({ date }) {
  if (!date) return null;
  const today = todayStr();
  const overdue = date < today;
  const isToday = date === today;
  if (overdue) return (
    <span className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
      <AlertTriangle className="w-3 h-3" /> {date}
    </span>
  );
  if (isToday) return (
    <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
      <Clock className="w-3 h-3" /> Today
    </span>
  );
  return <span className="flex items-center gap-1 text-[11px] text-[rgb(150,150,150)]"><Clock className="w-3 h-3" /> {date}</span>;
}

function PipelineCard({ record, onSelect, onArchive, onDragStart }) {
  const [confirmArchive, setConfirmArchive] = useState(false);
  const sbCount = Array.isArray(record.selectedTreatments) ? record.selectedTreatments.length : 0;
  const ctbCount = Array.isArray(record.callToBookTreatments) ? record.callToBookTreatments.length : 0;
  const txCount = sbCount + ctbCount;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, record.id)}
      onClick={() => onSelect(record)}
      className="bg-white border border-[rgb(235,225,213)] rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[rgb(198,182,165)] transition-all cursor-pointer select-none"
    >
      <div className="font-semibold text-[rgb(45,45,45)] text-sm mb-1 truncate">{record.guestName}</div>
      {record.checkInDate && (
        <div className="text-xs text-[rgb(120,120,120)] mb-1">
          {record.checkInDate} → {record.checkOutDate || "?"}
        </div>
      )}
      {record.roomName && (
        <div className="text-xs text-[rgb(150,130,110)] truncate mb-1">{record.roomName}</div>
      )}
      {txCount > 0 && (
        <div className="text-xs text-[rgb(150,170,155)]">✨ {txCount} treatment{txCount > 1 ? "s" : ""}</div>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <FollowUpChip date={record.followUpDate} />
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.bookingStatus] || ""}`}>
          {STATUS_LABELS[record.bookingStatus] || record.bookingStatus}
        </span>
      </div>
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-[rgb(235,225,213)]">
        {confirmArchive ? (
          <>
            <span className="flex-1 text-[10px] text-[rgb(107,85,64)] py-1">Archive this record?</span>
            <button
              onClick={e => { e.stopPropagation(); onArchive(record); setConfirmArchive(false); }}
              className="px-2 py-1 text-[10px] rounded-lg bg-[rgb(107,85,64)] text-white hover:opacity-90 transition-colors"
            >Yes</button>
            <button
              onClick={e => { e.stopPropagation(); setConfirmArchive(false); }}
              className="px-2 py-1 text-[10px] rounded-lg border border-[rgb(235,225,213)] text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)] transition-colors"
            >No</button>
          </>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setConfirmArchive(true); }}
            className="px-2 py-1 text-[10px] rounded-lg border border-[rgb(235,225,213)] text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)] transition-colors ml-auto"
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

export default function IntakePipelineView({ records, onSelect, onUpdate }) {
  const [draggingId, setDraggingId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);

  const archived = records.filter(r => r.bookingStatus === "archived" || r.bookingStatus === "declined");

  async function handleDrop(e, colKey) {
    e.preventDefault();
    setOverCol(null);
    if (!draggingId) return;
    const record = records.find(r => r.id === draggingId);
    if (!record || record.bookingStatus === colKey) return;
    await base44.entities.HotelTreatmentIntake.update(draggingId, { bookingStatus: colKey });
    onUpdate();
    setDraggingId(null);
  }

  async function handleArchive(record) {
    await base44.entities.HotelTreatmentIntake.update(record.id, { bookingStatus: "archived" });
    onUpdate();
  }

  return (
    <>
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[640px]">
        {COLUMNS.map(col => {
          const colRecords = sortByCheckIn(records.filter(r => r.bookingStatus === col.key));
          return (
            <div
              key={col.key}
              className={`flex-1 min-w-[200px] rounded-2xl p-3 transition-colors ${overCol === col.key ? "bg-[rgb(240,235,228)]" : "bg-[rgb(248,246,242)]"}`}
              onDragOver={e => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={e => handleDrop(e, col.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wide" style={{ color: col.color }}>{col.label}</span>
                <span className="text-xs bg-white border border-[rgb(235,225,213)] rounded-full px-2 py-0.5 text-[rgb(120,120,120)]">{colRecords.length}</span>
              </div>
              <div className="space-y-2">
                {colRecords.map(r => (
                  <PipelineCard
                    key={r.id}
                    record={r}
                    onSelect={onSelect}
                    onArchive={handleArchive}
                    onDragStart={(e, id) => setDraggingId(id)}
                  />
                ))}
                {colRecords.length === 0 && (
                  <div className="text-xs text-center text-[rgb(190,175,160)] py-4 italic">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Archived / Declined collapsible */}
      <div className="mt-4">
        <button
          onClick={() => setArchivedExpanded(v => !v)}
          className="text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)] flex items-center gap-2 mb-2"
        >
          {archivedExpanded ? "▾" : "▸"} Archived / Declined ({archived.length})
        </button>
        {archivedExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {archived.map(r => (
              <PipelineCard key={r.id} record={r} onSelect={onSelect} onArchive={() => {}} onDragStart={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
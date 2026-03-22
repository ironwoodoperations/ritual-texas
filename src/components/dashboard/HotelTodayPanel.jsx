import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { BedSingle, ChevronDown, ChevronUp, Phone, Mail, Users, LogIn, LogOut, CheckCircle, ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

function ReservationCard({ booking, actionLabel, actionStatus, onAction }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isAlreadyDone =
    (actionLabel === "Check In" && booking.booking_status === "checked_in") ||
    (actionLabel === "Check Out" && booking.booking_status === "checked_out");

  const handleAction = async () => {
    setLoading(true);
    try {
      const newStatus = actionLabel === "Check In" ? "checked_in" : "checked_out";
      await base44.entities.Booking.update(booking.id, { booking_status: newStatus });
      setDone(true);
      if (onAction) onAction(booking.id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    confirmed: "bg-[rgb(150,170,155)]/10 text-[rgb(107,140,110)]",
    checked_in: "bg-blue-50 text-blue-700",
    checked_out: "bg-gray-100 text-gray-500",
    pending: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div className="rounded-xl border border-[rgb(235,225,213)] bg-white p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-[rgb(45,45,45)] text-sm truncate">{booking.guest_name}</div>
          <div className="text-xs text-[rgb(120,120,120)]">{booking.room_name || booking.room_id}</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[booking.booking_status] || "bg-gray-100 text-gray-600"}`}>
          {booking.booking_status?.replace(/_/g, " ")}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[rgb(120,120,120)]">
        {booking.num_guests && (
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}</span>
        )}
        {booking.guest_phone && (
          <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-1 hover:text-[rgb(107,85,64)]">
            <Phone className="w-3 h-3" />{booking.guest_phone}
          </a>
        )}
        {booking.guest_email && (
          <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-1 hover:text-[rgb(107,85,64)] truncate max-w-[160px]">
            <Mail className="w-3 h-3" />{booking.guest_email}
          </a>
        )}
      </div>

      {booking.special_requests && (
        <div className="text-xs text-[rgb(107,85,64)] bg-[rgb(248,246,242)] rounded-lg px-2 py-1.5 italic">
          "{booking.special_requests}"
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-xs text-[rgb(150,150,150)]">
          {booking.check_in_date} → {booking.check_out_date}
        </div>
        {isAlreadyDone || done ? (
          <span className="flex items-center gap-1 text-xs text-[rgb(107,140,110)] font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            {actionLabel === "Check In" ? "Checked In" : "Checked Out"}
          </span>
        ) : (
          <button
            onClick={handleAction}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)] disabled:opacity-50 transition-colors"
          >
            {actionLabel === "Check In" ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
            {loading ? "..." : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function HotelTodayPanel({ arrivalsToday, departuresToday, inHouseTonight, cloudbedsStatus }) {
  const [activeTab, setActiveTab] = useState(null); // null | "arrivals" | "departures"
  const [localStatuses, setLocalStatuses] = useState({});
  const queryClient = useQueryClient();

  const handleStatusUpdate = (id, newStatus) => {
    setLocalStatuses(prev => ({ ...prev, [id]: newStatus }));
    queryClient.invalidateQueries({ queryKey: ["hotel-bookings-dash"] });
  };

  const applyLocal = (bookings) =>
    bookings.map(b => localStatuses[b.id] ? { ...b, booking_status: localStatuses[b.id] } : b);

  const arrivals = applyLocal(arrivalsToday);
  const departures = applyLocal(departuresToday);

  const toggleTab = (tab) => setActiveTab(prev => prev === tab ? null : tab);

  return (
    <div className="rounded-xl border border-[rgb(235,225,213)] overflow-hidden">
      {cloudbedsStatus === 'disconnected' && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-700">Cloudbeds disconnected — hotel data may be stale</span>
          </div>
          <Link to={createPageUrl("AdminCloudbeds")} className="text-xs text-amber-700 font-semibold underline shrink-0">Reconnect</Link>
        </div>
      )}
      {/* Summary row */}
      <div className="flex items-center justify-between px-3 py-2 bg-white">
        <div className="flex items-center gap-2">
          <BedSingle className="w-4 h-4 text-[rgb(107,85,64)]" />
          <span className="text-sm font-medium text-[rgb(45,45,45)]">Hotel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgb(120,120,120)]">{arrivalsToday.length} arrive · {departuresToday.length} depart</span>
          <Link to={createPageUrl("AdminBookings")} className="flex items-center gap-1 text-xs text-[rgb(107,85,64)] font-medium hover:underline">
            All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Tab row */}
      <div className="flex border-t border-[rgb(235,225,213)]">
        <button
          onClick={() => toggleTab("arrivals")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "arrivals"
              ? "bg-[rgb(107,85,64)] text-white"
              : "bg-[rgb(248,246,242)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]"
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Arrivals ({arrivals.length})
          {activeTab === "arrivals" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="w-px bg-[rgb(235,225,213)]" />
        <button
          onClick={() => toggleTab("departures")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === "departures"
              ? "bg-[rgb(107,85,64)] text-white"
              : "bg-[rgb(248,246,242)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]"
          }`}
        >
          <LogOut className="w-3.5 h-3.5" />
          Departures ({departures.length})
          {activeTab === "departures" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="w-px bg-[rgb(235,225,213)]" />

      </div>

      {/* Expanded content */}
      {activeTab === "arrivals" && (
        <div className="p-3 bg-[rgb(248,246,242)] flex flex-col gap-2">
          {arrivals.length === 0 ? (
            <p className="text-xs text-[rgb(150,150,150)] text-center py-2">No arrivals today.</p>
          ) : (
            arrivals.map(b => (
              <ReservationCard key={b.id} booking={b} actionLabel="Check In" onAction={handleStatusUpdate} />
            ))
          )}
        </div>
      )}

      {activeTab === "departures" && (
        <div className="p-3 bg-[rgb(248,246,242)] flex flex-col gap-2">
          {departures.length === 0 ? (
            <p className="text-xs text-[rgb(150,150,150)] text-center py-2">No departures today.</p>
          ) : (
            departures.map(b => (
              <ReservationCard key={b.id} booking={b} actionLabel="Check Out" onAction={handleStatusUpdate} />
            ))
          )}
        </div>
      )}

    </div>
  );
}
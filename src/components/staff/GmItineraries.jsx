import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function GmItineraries() {
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, "yyyy-MM-dd");

  const { data: intakes = [], isLoading } = useQuery({
    queryKey: ["gm-itineraries", dateStr],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ checkInDate: dateStr }),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["gm-bookings-itinerary", dateStr],
    queryFn: () => base44.entities.Booking.filter({ check_in_date: dateStr }),
  });

  const handlePrev = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate()-1); return n; });
  const handleNext = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate()+1); return n; });

  function parseTreatments(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      try { return typeof item === "string" ? JSON.parse(item) : item; } catch { return { name: item }; }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-light text-[rgb(107,85,64)]">Today's Itineraries</h2>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3">
        <button onClick={handlePrev} className="p-1 hover:bg-[rgb(235,225,213)] rounded"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-lg font-light text-[rgb(107,85,64)]">{format(date, "EEEE, MMMM d")}</p>
          <p className="text-xs text-[rgb(150,150,150)]">{intakes.length + bookings.length} arrival(s)</p>
        </div>
        <button onClick={handleNext} className="p-1 hover:bg-[rgb(235,225,213)] rounded"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {isLoading && <div className="text-center py-8 text-[rgb(150,150,150)] text-sm">Loading…</div>}

      {/* Intake-based itineraries */}
      {intakes.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-2">Hotel + Spa Guests</p>
          <div className="space-y-3">
            {intakes.map(g => {
              const sb = parseTreatments(g.selectedTreatments);
              const ctb = parseTreatments(g.callToBookTreatments);
              return (
                <div key={g.id} className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[rgb(107,85,64)]">{g.guestName}</p>
                      <p className="text-xs text-[rgb(150,150,150)]">{g.checkInDate} → {g.checkOutDate} · {g.cloudbedsRoomTypeId || "Room TBD"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      g.bookingStatus === "confirmed" ? "bg-green-100 text-green-700" :
                      g.bookingStatus === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{g.bookingStatus?.replace("_"," ")}</span>
                  </div>
                  {g.phone && <p className="text-sm text-[rgb(45,45,45)]">📞 {g.phone}</p>}
                  {g.numberOfGuests > 0 && <p className="text-xs text-[rgb(150,150,150)]">{g.numberOfGuests} adult(s){g.numberOfChildren > 0 ? ` · ${g.numberOfChildren} child(ren)` : ""}</p>}
                  {sb.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[rgb(107,85,64)] mb-1">Treatments</p>
                      <div className="flex flex-wrap gap-1">
                        {sb.map((t,i) => (
                          <span key={i} className="text-xs bg-[rgb(240,248,242)] text-[rgb(80,130,90)] px-2 py-0.5 rounded-full border border-[rgb(200,230,210)]">
                            {t.serviceName || t.name}{t.date ? ` · ${t.date}` : ""}{t.time ? ` @ ${t.time}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ctb.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[rgb(107,85,64)] mb-1">Call-to-Book</p>
                      <div className="flex flex-wrap gap-1">
                        {ctb.map((t,i) => (
                          <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.internalNotes && <p className="text-xs text-[rgb(150,150,150)] italic border-t border-[rgb(235,225,213)] pt-2">{g.internalNotes}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking-based arrivals */}
      {bookings.filter(b => b.booking_status !== "cancelled").length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-2">Cloudbeds Arrivals</p>
          <div className="space-y-2">
            {bookings.filter(b => b.booking_status !== "cancelled").map(b => (
              <div key={b.id} className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{b.guest_name}</p>
                    <p className="text-xs text-[rgb(150,150,150)]">{b.room_name} · {b.num_guests} guest(s)</p>
                  </div>
                  <span className="text-xs bg-[rgb(235,225,213)] px-2 py-0.5 rounded">{b.confirmation_code}</span>
                </div>
                {b.special_requests && <p className="text-xs text-[rgb(196,155,145)] mt-1 italic">Note: {b.special_requests}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && intakes.length === 0 && bookings.length === 0 && (
        <div className="text-center py-12 text-[rgb(150,150,150)] text-sm">No arrivals on this date.</div>
      )}
    </div>
  );
}
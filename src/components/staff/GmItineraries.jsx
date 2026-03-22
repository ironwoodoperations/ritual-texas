// GM Today's Itineraries — embeds the full AdminTodayItineraries content without admin auth gate
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Printer, Sparkles, Mail, MessageCircle, Check, ChevronDown, X, Leaf } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) { if (!d) return "—"; return format(new Date(d + "T12:00:00"), "MMMM d, yyyy"); }
function fmtTime(iso) { if (!iso) return "—"; return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

function buildSmsText(reservation, spaBookings) {
  const checkIn = fmtDate(reservation.checkIn);
  const checkOut = fmtDate(reservation.checkOut);
  let msg = `🌿 RITUAL – Your Stay Itinerary\n\nHi ${reservation.guestName}! We're excited to welcome you.\n\n📅 Check-In: ${checkIn} at 3:00 PM\n📅 Check-Out: ${checkOut} at 11:00 AM\n🏠 Room: ${reservation.roomName || "See front desk"}\n\n✨ During Your Stay:\n• Breakfast: 8–10 AM daily\n• Sauna & rainshower anytime`;
  if (spaBookings.length > 0) {
    msg += `\n\n💆 Spa Appointments:`;
    spaBookings.forEach(b => {
      msg += `\n• ${b.serviceName || "Spa Treatment"}`;
      if (b.startAt) msg += ` – ${format(new Date(b.startAt), "MMM d")} at ${fmtTime(b.startAt)}`;
      if (b.durationMinutes) msg += ` (${b.durationMinutes} min)`;
      if (b.staffName) msg += ` w/ ${b.staffName}`;
    });
  }
  msg += `\n\nQuestions? Text us: (903) 810-6695\n\nRest. Restore. Return. 🌿`;
  return msg;
}

function GuestCard({ reservation, spaBookings }) {
  const [emailAddr, setEmailAddr] = useState(reservation.guestEmail || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleEmail = () => {
    if (!emailAddr) { setEmailError("Enter an email address"); return; }
    setEmailError("");
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(emailAddr)}&subject=${encodeURIComponent(`Your Hotel RITUAL Itinerary – ${reservation.guestName}`)}`;
    window.open(gmailUrl, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const smsBody = encodeURIComponent(buildSmsText(reservation, spaBookings));
  const smsHref = `sms:?&body=${smsBody}`;

  return (
    <div className="itinerary-card bg-white border border-[rgb(235,225,213)] rounded-2xl mb-6 overflow-hidden" style={{ padding: expanded ? "2rem" : 0 }}>
      {!expanded && (
        <button onClick={() => setExpanded(true)} className="w-full flex items-center justify-between p-4 hover:bg-[rgb(248,246,242)] transition-colors">
          <div className="flex items-center gap-3">
            <Leaf className="w-4 h-4 text-[rgb(150,170,155)] shrink-0" />
            <div className="text-left">
              <p className="font-medium text-[rgb(107,85,64)]">{reservation.guestName}</p>
              <p className="text-xs text-[rgb(150,150,150)]">{emailAddr || (reservation.spaOnly ? "Spa-only guest" : "No email on file")}</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[rgb(150,170,155)]" />
        </button>
      )}
      {expanded && (
        <>
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-[rgb(235,225,213)]">
            <div>
              <div className="flex items-center gap-2 mb-1"><Leaf className="w-5 h-5 text-[rgb(150,170,155)]" /><span className="text-lg tracking-widest font-light text-[rgb(107,85,64)]">RITUAL</span></div>
              <h2 className="text-2xl font-light text-[rgb(107,85,64)] mt-2">{reservation.guestName}</h2>
              {reservation.reservationID && <p className="text-sm text-[rgb(150,150,150)] font-mono mt-0.5">#{reservation.reservationID}</p>}
            </div>
            <button onClick={() => setExpanded(false)} className="p-1.5 hover:bg-[rgb(235,225,213)] rounded-lg">
              <X className="w-5 h-5 text-[rgb(150,150,150)]" />
            </button>
          </div>

          {!reservation.spaOnly ? (
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div><p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Check-In</p><p className="text-[rgb(107,85,64)] font-medium">{fmtDate(reservation.checkIn)}</p><p className="text-xs text-[rgb(150,150,150)] mt-0.5">3:00 PM</p></div>
              <div><p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Check-Out</p><p className="text-[rgb(107,85,64)] font-medium">{fmtDate(reservation.checkOut)}</p><p className="text-xs text-[rgb(150,150,150)] mt-0.5">11:00 AM</p></div>
              <div><p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-1">Room</p><p className="text-[rgb(107,85,64)] font-medium">{reservation.roomName || "—"}</p></div>
            </div>
          ) : (
            <div className="mb-6 bg-[rgb(248,246,242)] rounded-xl px-4 py-3 text-sm text-[rgb(107,85,64)]">Spa-only guest · No hotel stay on file</div>
          )}

          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">During Your Stay</h3>
            <div className="bg-[rgb(248,246,242)] rounded-xl p-4 text-sm text-[rgb(45,45,45)] space-y-1">
              <p>• Breakfast: 8:00–10:00 AM daily</p><p>• Sauna & rainshower available anytime</p><p>• Concierge: (903) 810-6695</p>
            </div>
          </div>

          {spaBookings.length > 0 ? (
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Spa Appointments</h3>
              <div className="space-y-2">
                {spaBookings.map((b, i) => (
                  <div key={i} className="flex items-start justify-between bg-[rgb(248,246,242)] rounded-xl p-4">
                    <div><p className="font-medium text-[rgb(107,85,64)] text-sm">{b.serviceName || "Spa Treatment"}</p>{b.staffName && <p className="text-xs text-[rgb(150,150,150)] mt-0.5">Provider: {b.staffName}</p>}</div>
                    <div className="text-right text-sm"><p className="text-[rgb(45,45,45)]">{b.startAt ? format(new Date(b.startAt), "MMM d") : "—"} · {b.startAt ? fmtTime(b.startAt) : "—"}</p>{b.durationMinutes && <p className="text-xs text-[rgb(150,150,150)] mt-0.5">{b.durationMinutes} min</p>}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Spa & Wellness</h3>
              <div className="bg-[rgb(248,246,242)] rounded-xl p-4 text-sm text-[rgb(150,150,150)]">No spa appointments booked</div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[rgb(235,225,213)] space-y-3">
            <div className="flex items-center gap-2">
              <input type="email" value={emailAddr} onChange={e => { setEmailAddr(e.target.value); setEmailError(""); }} placeholder="Guest email"
                className="flex-1 border border-[rgb(235,225,213)] rounded-lg px-3 py-2 text-sm bg-[rgb(248,246,242)] focus:outline-none focus:border-[rgb(150,170,155)]" />
              <button onClick={handleEmail} disabled={sending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)] disabled:opacity-60">
                {sent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />} {sent ? "Sent!" : "Email"}
              </button>
            </div>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            <a href={smsHref} className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm rounded-lg border border-[rgb(107,85,64)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]">
              <MessageCircle className="w-4 h-4" /> Open Text Message
            </a>
          </div>

          <div className="pt-4 mt-4 border-t border-[rgb(235,225,213)] text-center text-xs text-[rgb(150,150,150)]">
            540 El Paso Street · Jacksonville, Texas 75766 · (903) 810-6695 · Rest. Restore. Return.
          </div>
        </>
      )}
    </div>
  );
}

export default function GmItineraries() {
  const today = todayStr();
  const qc = useQueryClient();

  const { data: cloudbedsData, isLoading: cbLoading, refetch } = useQuery({
    queryKey: ["gm-cloudbeds-itineraries"],
    queryFn: async () => (await base44.functions.invoke("cloudbedsUpcomingReservations", {})).data,
  });

  const { data: allSpaBookings = [], isLoading: spaLoading } = useQuery({
    queryKey: ["gm-spa-itineraries"],
    queryFn: () => base44.entities.SpaBooking.list("-startAt", 500),
  });

  const { data: todayIntakes = [] } = useQuery({
    queryKey: ["gm-intake-itineraries", today],
    queryFn: async () => {
      const all = await base44.entities.HotelTreatmentIntake.list("-created_date", 200);
      return all.filter(intake => {
        if (intake.checkInDate === today) return true;
        if (Array.isArray(intake.selectedTreatments)) {
          return intake.selectedTreatments.some(t => {
            try { const parsed = typeof t === "string" ? JSON.parse(t) : t; return parsed.date === today; } catch { return false; }
          });
        }
        return false;
      });
    },
  });

  const getIntakeTreatmentsForGuest = (guestEmail, guestName) => {
    const email = (guestEmail || "").toLowerCase().trim();
    const name = (guestName || "").toLowerCase().trim();
    const matchingIntakes = todayIntakes.filter(intake => {
      const intakeEmail = (intake.email || "").toLowerCase().trim();
      const intakeName = (intake.guestName || "").toLowerCase().trim();
      return (email && intakeEmail === email) || (name && intakeName === name);
    });
    const treatments = [];
    matchingIntakes.forEach(intake => {
      (intake.selectedTreatments || []).forEach(raw => {
        try {
          const t = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (t.date === today && t.source !== "simplybook") {
            treatments.push({
              id: `intake-${intake.id}-${t.simplybookServiceId || t.serviceName}`,
              serviceName: t.serviceName || "Treatment",
              staffName: t.staffName || "",
              startAt: t.date && t.time ? `${t.date}T${t.time}` : null,
              durationMinutes: t.duration || null,
              status: "confirmed",
              fromIntake: true,
            });
          }
        } catch {}
      });
    });
    return treatments;
  };

  const todayArrivals = (cloudbedsData?.reservations || []).filter(r => r.checkIn === today);
  const arrivalsWithSpa = todayArrivals.map(r => {
    const guestEmail = (r.guestEmail || "").toLowerCase().trim();
    const simplybookSpa = allSpaBookings.filter(b =>
      b.status !== "booking.cancelled" &&
      (b.email || "").toLowerCase().trim() === guestEmail &&
      b.startAt >= r.checkIn && b.startAt <= (r.checkOut + "T23:59:59")
    );
    const intakeTreatments = getIntakeTreatmentsForGuest(r.guestEmail, r.guestName);
    return { reservation: r, spaBookings: [...simplybookSpa, ...intakeTreatments] };
  });

  const hotelGuestEmails = new Set(todayArrivals.map(r => (r.guestEmail || "").toLowerCase().trim()));
  const todaySpaBookings = allSpaBookings.filter(b => b.status !== "booking.cancelled" && b.startAt?.slice(0, 10) === today);
  const spaOnlyGuests = [];
  const seen = new Set();
  todaySpaBookings.forEach(b => {
    const email = (b.email || "").toLowerCase().trim();
    if (!hotelGuestEmails.has(email) && !seen.has(email || b.clientName)) {
      seen.add(email || b.clientName);
      const guestSpa = todaySpaBookings.filter(x => (x.email || "").toLowerCase().trim() === email || (!email && x.clientName === b.clientName));
      spaOnlyGuests.push({ reservation: { guestName: b.clientName || "Guest", guestEmail: b.email || "", reservationID: null, checkIn: null, checkOut: null, roomName: null, spaOnly: true }, spaBookings: guestSpa });
    }
  });

  const allCards = [...arrivalsWithSpa, ...spaOnlyGuests];
  const isLoading = cbLoading || spaLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[rgb(107,85,64)]">Today's Itineraries</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-2 text-sm border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(235,225,213)] text-[rgb(107,85,64)]">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm bg-[rgb(107,85,64)] text-white rounded-lg hover:bg-[rgb(85,65,45)]">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      <p className="text-sm text-[rgb(150,150,150)]">{format(new Date(), "EEEE, MMMM d, yyyy")} · {todayArrivals.length} hotel · {spaOnlyGuests.length} spa-only</p>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" /></div>
      ) : !cloudbedsData?.success ? (
        <div className="text-center py-12 text-[rgb(107,85,64)] text-sm">{cloudbedsData?.error || "Could not load Cloudbeds reservations."}</div>
      ) : allCards.length === 0 ? (
        <div className="text-center py-16 text-[rgb(150,150,150)]"><p className="text-lg font-light">No arrivals or spa appointments today.</p></div>
      ) : (
        <>
          {arrivalsWithSpa.length > 0 && (
            <div><p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Hotel Arrivals</p>{arrivalsWithSpa.map(({ reservation, spaBookings }) => <GuestCard key={reservation.reservationID} reservation={reservation} spaBookings={spaBookings} />)}</div>
          )}
          {spaOnlyGuests.length > 0 && (
            <div><p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Spa Guests Today</p>{spaOnlyGuests.map(({ reservation, spaBookings }, i) => <GuestCard key={i} reservation={reservation} spaBookings={spaBookings} />)}</div>
          )}
        </>
      )}
    </div>
  );
}
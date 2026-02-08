import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const SPA_BOOKING_ROUTE = "/SpaBooking"; // change if your embedded square page route is different

function formatDateTime(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(dt);
  }
}

function formatTimeOnly(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function getSpaDisplayName(spaBooking) {
  // Best → worst fallbacks. Goal: NEVER show the long Square booking ID as the title.
  return (
    spaBooking?.serviceName ||
    spaBooking?.service || // some versions already store a human name here
    spaBooking?.raw?.serviceName ||
    spaBooking?.raw?.service ||
    spaBooking?.raw?.booking?.service_name ||
    spaBooking?.raw?.booking?.appointment_segments?.[0]?.service_variation_name ||
    spaBooking?.raw?.booking?.appointmentSegments?.[0]?.serviceVariationName ||
    "Spa Treatment"
  );
}

function getSpaStaffName(spaBooking) {
  return (
    spaBooking?.staffName ||
    spaBooking?.staff ||
    spaBooking?.raw?.staffName ||
    spaBooking?.raw?.booking?.appointment_segments?.[0]?.team_member_name ||
    spaBooking?.raw?.booking?.appointmentSegments?.[0]?.teamMemberName ||
    ""
  );
}

function getSpaStart(spaBooking) {
  return spaBooking?.startAt || spaBooking?.raw?.startAt || spaBooking?.raw?.booking?.start_at || spaBooking?.raw?.booking?.startAt;
}

function getSpaDuration(spaBooking) {
  return spaBooking?.durationMinutes ?? spaBooking?.raw?.durationMinutes ?? spaBooking?.raw?.booking?.duration_minutes ?? spaBooking?.raw?.booking?.durationMinutes;
}

function getSpaStatus(spaBooking) {
  return spaBooking?.status || spaBooking?.raw?.status || spaBooking?.raw?.booking?.status || "created";
}

function money(n) {
  const x = safeNum(n);
  if (x === null) return "";
  return `$${x.toFixed(2)}`;
}

export default function ItineraryPage() {
  // Selection
  const [hotelChecked, setHotelChecked] = useState(true);
  const [spaChecked, setSpaChecked] = useState(true);

  // Inputs
  const [confirmation, setConfirmation] = useState("");
  const [contact, setContact] = useState(""); // email or last name depending on Cloudbeds logic
  const [spaEmail, setSpaEmail] = useState("");

  // Results
  const [reservation, setReservation] = useState(null); // hotel reservation result
  const [spaBookings, setSpaBookings] = useState([]); // SpaBooking[] from entity lookup

  // UX
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Print CSS injected once
  useEffect(() => {
    const id = "itinerary-print-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @media print {
        /* Hide site chrome */
        header, nav, .no-print, .floating-edit, .hamburger, .site-footer { display: none !important; }
        body { background: white !important; }
        .print-wrap { padding: 0 !important; margin: 0 !important; }
        .card { box-shadow: none !important; border: 1px solid #ddd !important; }
        .page-break { page-break-before: always; }
        a[href]:after { content: "" !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const debug = useMemo(() => {
    return {
      hotelChecked,
      spaChecked,
      reservation: reservation ? "exists" : "null",
      spaBookingsLength: spaBookings?.length || 0,
      loading,
      error: error || "none",
    };
  }, [hotelChecked, spaChecked, reservation, spaBookings, loading, error]);

  async function fetchHotel() {
    // Only fetch if hotel checked + has inputs
    if (!hotelChecked) return null;

    if (!confirmation?.trim() || !contact?.trim()) {
      throw new Error("Hotel stay selected: please enter confirmation + contact.");
    }

    const res = await fetch("/functions/cloudbedsReservationsLookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: confirmation.trim(), contact: contact.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to look up hotel itinerary.");
    return data;
  }

  async function fetchSpa() {
    if (!spaChecked) return [];

    if (!spaEmail?.trim()) {
      throw new Error("Spa bookings selected: please enter the email used to book spa.");
    }

    const spaRes = await base44.functions.invoke("spaBookingsLookup", {
      email: spaEmail.trim().toLowerCase(),
    });

    const data = spaRes?.data || spaRes || {};
    return Array.isArray(data) ? data : (data?.spaBookings || []);
  }

  async function onView() {
    setError("");
    setLoading(true);
    try {
      const [hotel, spa] = await Promise.all([
        fetchHotel().catch((e) => {
          // If hotel not selected, ignore
          if (!hotelChecked) return null;
          throw e;
        }),
        fetchSpa().catch((e) => {
          if (!spaChecked) return [];
          throw e;
        }),
      ]);

      setReservation(hotel);
      setSpaBookings(spa || []);
    } catch (e) {
      setReservation(null);
      setSpaBookings([]);
      setError(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onPrint() {
    window.print();
  }

  // Build a single unified "timeline" list, but ALWAYS render the hotel summary first.
  const spaTimelineItems = useMemo(() => {
    const items = (spaBookings || []).map((b) => {
      const startAt = getSpaStart(b);
      const duration = getSpaDuration(b);
      const serviceName = getSpaDisplayName(b);
      const staffName = getSpaStaffName(b);
      const status = getSpaStatus(b);
      const price = b?.price ?? b?.raw?.price;

      return {
        type: "spa",
        sortKey: startAt ? new Date(startAt).getTime() : Number.MAX_SAFE_INTEGER,
        title: serviceName,
        startAt,
        timeLabel: startAt ? formatTimeOnly(startAt) : "",
        subtitle: [
          duration ? `${duration} minutes` : null,
          staffName ? `with ${staffName}` : null,
          price != null ? money(price) : null,
        ].filter(Boolean).join(" • "),
        status,
        raw: b,
      };
    });

    items.sort((a, b) => a.sortKey - b.sortKey);
    return items;
  }, [spaBookings]);

  const hotelTimelineItems = useMemo(() => {
    // This depends on whatever cloudbedsReservationsLookup returns.
    // We support a few common shapes but won't crash if different.
    if (!reservation) return [];

    const checkIn = reservation?.checkIn || reservation?.check_in || reservation?.arrivalDate || reservation?.arrival_date;
    const checkOut = reservation?.checkOut || reservation?.check_out || reservation?.departureDate || reservation?.departure_date;

    const items = [];
    if (checkIn) {
      items.push({
        type: "hotel",
        sortKey: new Date(checkIn).getTime(),
        title: "Check-In",
        startAt: checkIn,
        timeLabel: formatDateTime(checkIn),
        subtitle: "Your stay begins",
      });
    }
    if (checkOut) {
      items.push({
        type: "hotel",
        sortKey: new Date(checkOut).getTime(),
        title: "Check-Out",
        startAt: checkOut,
        timeLabel: formatDateTime(checkOut),
        subtitle: "Thank you for restoring with us",
      });
    }
    items.sort((a, b) => a.sortKey - b.sortKey);
    return items;
  }, [reservation]);

  const combinedTimeline = useMemo(() => {
    // "Correct order" for printing/experience:
    // - Hotel anchors (check-in/out) + any other hotel items first in the overall list
    // - Spa items interleaved by time, BUT NEVER shown above the hotel summary section.
    // For the timeline section, we combine and sort.
    const all = [...hotelTimelineItems, ...spaTimelineItems];
    all.sort((a, b) => a.sortKey - b.sortKey);
    return all;
  }, [hotelTimelineItems, spaTimelineItems]);

  const guestName =
    reservation?.guest?.name ||
    reservation?.guestName ||
    reservation?.guest_name ||
    reservation?.primaryGuestName ||
    reservation?.name ||
    "";

  const hotelConfirmation =
    reservation?.confirmation ||
    reservation?.confirmationNumber ||
    reservation?.confirmation_number ||
    confirmation ||
    "";

  const totalAmount =
    reservation?.totalAmount ||
    reservation?.total_amount ||
    reservation?.balance ||
    reservation?.amount ||
    null;

  return (
    <div className="print-wrap" style={{ padding: "24px 16px" }}>
      {/* ====== Top heading ====== */}
      <div className="card" style={styles.heroCard}>
        <h1 style={styles.heroTitle}>Your Stay Itinerary</h1>
        <p style={styles.heroSub}>Everything in one place — rooms, spa, and check-in instructions.</p>

        {/* ====== Selection + inputs ====== */}
        <div className="no-print" style={{ marginTop: 18 }}>
          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={hotelChecked}
                onChange={(e) => setHotelChecked(e.target.checked)}
                style={{ transform: "scale(1.1)" }}
              />
              <span style={{ marginLeft: 10 }}>Hotel Stay</span>
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={spaChecked}
                onChange={(e) => setSpaChecked(e.target.checked)}
                style={{ transform: "scale(1.1)" }}
              />
              <span style={{ marginLeft: 10 }}>Spa Bookings</span>
            </label>
          </div>

          {/* Hotel inputs */}
          {hotelChecked && (
            <div className="card" style={styles.sectionCard}>
              <div style={styles.sectionTitle}>Hotel Stay</div>
              <div style={styles.grid2}>
                <div>
                  <div style={styles.label}>Confirmation #</div>
                  <input
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder="e.g. 9771730958512"
                    style={styles.input}
                  />
                </div>
                <div>
                  <div style={styles.label}>Contact (email or last name)</div>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. guest@email.com"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Spa inputs */}
          {spaChecked && (
            <div className="card" style={styles.sectionCard}>
              <div style={styles.sectionTitle}>Spa Appointments</div>
              <div>
                <div style={styles.label}>Email used when booking spa</div>
                <input
                  value={spaEmail}
                  onChange={(e) => setSpaEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={onView} style={styles.primaryBtn} disabled={loading}>
              {loading ? "Loading..." : "View My Itinerary"}
            </button>

            <button onClick={onPrint} style={styles.secondaryBtn} disabled={loading}>
              Print Itinerary
            </button>

            {!!error && <div style={styles.error}>{error}</div>}
          </div>
        </div>

        {/* ====== Debug (can be removed later) ====== */}
        <div className="no-print" style={styles.debugBlock}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Itinerary Debug</div>
          <div>hotelChecked: {String(debug.hotelChecked)}</div>
          <div>spaChecked: {String(debug.spaChecked)}</div>
          <div>reservation: {debug.reservation}</div>
          <div>spaBookings.length: {debug.spaBookingsLength}</div>
          <div>loading: {String(debug.loading)}</div>
          <div>error: {debug.error}</div>
        </div>
      </div>

      {/* ====== HOTEL SUMMARY ALWAYS FIRST (never let spa appear above this) ====== */}
      {reservation && (
        <div className="card" style={styles.summaryCard}>
          <div style={styles.summaryTop}>
            <div>
              <div style={styles.guestName}>{guestName || "Your Reservation"}</div>
              <div style={styles.confirmation}>Confirmation: {hotelConfirmation}</div>
            </div>

            <div style={styles.badge}>Checked In</div>
          </div>

          <div style={styles.summaryGrid}>
            <div>
              <div style={styles.label}>Check-In</div>
              <div style={styles.bigText}>
                {reservation?.checkInDatePretty ||
                  reservation?.checkInPretty ||
                  reservation?.checkInDate ||
                  reservation?.checkIn ||
                  reservation?.check_in ||
                  ""}
              </div>
            </div>

            <div>
              <div style={styles.label}>Check-Out</div>
              <div style={styles.bigText}>
                {reservation?.checkOutDatePretty ||
                  reservation?.checkOutPretty ||
                  reservation?.checkOutDate ||
                  reservation?.checkOut ||
                  reservation?.check_out ||
                  ""}
              </div>
            </div>

            <div>
              <div style={styles.label}>Total Amount</div>
              <div style={styles.totalAmount}>{totalAmount != null ? money(totalAmount) : ""}</div>
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <a href={SPA_BOOKING_ROUTE} style={{ ...styles.primaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              Book Another Treatment
            </a>

            <a href="/text" style={{ ...styles.secondaryBtn, textDecoration: "none" }}>
              Text Concierge
            </a>

            <a href="/call" style={{ ...styles.secondaryBtn, textDecoration: "none" }}>
              Call Hotel
            </a>
          </div>
        </div>
      )}

      {/* ====== SPA APPOINTMENTS SECTION (cleaner, names not IDs) ====== */}
      {spaChecked && spaBookings?.length > 0 && (
        <div className="card" style={styles.sectionCardPrint}>
          <div style={styles.sectionTitleLarge}>Your Spa Appointments</div>

          <div style={{ display: "grid", gap: 12 }}>
            {spaBookings.map((b) => {
              const title = getSpaDisplayName(b);
              const startAt = getSpaStart(b);
              const duration = getSpaDuration(b);
              const staffName = getSpaStaffName(b);
              const status = getSpaStatus(b);

              return (
                <div key={b?.squareBookingId || b?.id || `${title}-${startAt}`} style={styles.spaRow}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={styles.spaTitle}>{title}</div>
                      <div style={styles.spaMeta}>
                        {startAt ? formatDateTime(startAt) : ""}
                        {duration ? ` • ${duration} minutes` : ""}
                        {staffName ? ` • with ${staffName}` : ""}
                      </div>
                    </div>
                    <div style={styles.statusPill}>{status}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="no-print" style={{ marginTop: 14 }}>
            <a href={SPA_BOOKING_ROUTE} style={{ ...styles.primaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              Book Another Treatment
            </a>
          </div>
        </div>
      )}

      {/* ====== TIMELINE (hotel + spa interleaved chronologically) ====== */}
      {(reservation || (spaChecked && spaBookings?.length > 0)) && (
        <div className="card" style={styles.sectionCardPrint}>
          <div style={styles.sectionTitleLarge}>Your Stay Timeline</div>

          <div style={{ display: "grid", gap: 12 }}>
            {combinedTimeline.map((item, idx) => (
              <div key={`${item.type}-${idx}`} style={styles.timelineRow}>
                <div style={styles.timelineIcon}>{item.type === "spa" ? "✨" : "🏨"}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.timelineTitle}>
                    {item.title}
                    {item.type === "spa" && item.timeLabel ? <span style={styles.timelineTime}> — {item.timeLabel}</span> : null}
                  </div>
                  <div style={styles.timelineSub}>
                    {item.type === "hotel" ? item.timeLabel : item.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="no-print" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onPrint} style={styles.secondaryBtn}>Print Itinerary</button>
            <button onClick={() => alert("Email Itinerary hooked up in your existing flow")} style={styles.secondaryBtn}>
              Email Me This Itinerary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  heroCard: {
    background: "#f7f2eb",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(0,0,0,0.06)",
  },
  heroTitle: { fontSize: 34, margin: 0, fontWeight: 700, letterSpacing: 0.2 },
  heroSub: { marginTop: 8, marginBottom: 0, opacity: 0.85 },

  checkboxRow: { display: "flex", gap: 18, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  checkboxLabel: { display: "flex", alignItems: "center", cursor: "pointer", fontWeight: 600 },

  sectionCard: {
    background: "white",
    borderRadius: 16,
    padding: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    marginTop: 12,
  },
  sectionCardPrint: {
    background: "white",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(0,0,0,0.06)",
    marginTop: 16,
  },
  sectionTitle: { fontWeight: 800, marginBottom: 10 },
  sectionTitleLarge: { fontWeight: 800, fontSize: 22, marginBottom: 12 },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { fontSize: 13, fontWeight: 700, marginBottom: 6, opacity: 0.85 },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
    fontSize: 15,
  },

  primaryBtn: {
    background: "#b37b5b",
    color: "white",
    border: "none",
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 800,
    cursor: "pointer",
    minWidth: 180,
  },
  secondaryBtn: {
    background: "white",
    color: "#222",
    border: "1px solid rgba(0,0,0,0.18)",
    padding: "12px 16px",
    borderRadius: 14,
    fontWeight: 800,
    cursor: "pointer",
    minWidth: 160,
  },
  error: { color: "#b00020", fontWeight: 800, alignSelf: "center" },

  debugBlock: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.65)",
    border: "1px dashed rgba(0,0,0,0.20)",
    fontSize: 13,
    lineHeight: 1.4,
  },

  summaryCard: {
    background: "white",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(0,0,0,0.06)",
    marginTop: 16,
  },
  summaryTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  guestName: { fontSize: 24, fontWeight: 900 },
  confirmation: { opacity: 0.85, fontWeight: 700, marginTop: 4 },
  badge: {
    background: "#b37b5b",
    color: "white",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
  },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 },
  bigText: { fontSize: 18, fontWeight: 900 },
  totalAmount: { fontSize: 28, fontWeight: 900 },

  spaRow: { border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 14 },
  spaTitle: { fontSize: 18, fontWeight: 900 },
  spaMeta: { marginTop: 6, opacity: 0.85, fontWeight: 700 },
  statusPill: {
    border: "1px solid rgba(0,0,0,0.12)",
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.9,
    whiteSpace: "nowrap",
  },

  timelineRow: { display: "flex", gap: 12, alignItems: "flex-start", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 14 },
  timelineIcon: { width: 36, height: 36, borderRadius: 12, background: "#f7f2eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 },
  timelineTitle: { fontWeight: 900, fontSize: 16 },
  timelineTime: { opacity: 0.75, fontWeight: 900 },
  timelineSub: { marginTop: 6, opacity: 0.85, fontWeight: 700 },
};
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Users, Sparkles, ArrowRight, Bell, UtensilsCrossed, ChefHat,
  BedDouble, ClipboardList, FileText, Image, LogOut, Leaf,
  CalendarDays, BookOpen, Brush, AlertTriangle, BedSingle,
  MessageSquare, Activity, BadgeDollarSign, Timer,
} from "lucide-react";
import { motion } from "framer-motion";

const HK_OPEN_STATUSES = ["pending", "in_progress"];

function todayStrLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoMaybe(iso) {
  if (!iso) return null;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

function minutesBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toFixed(0)}`;
}

// ─── Toast Ops Panel ────────────────────────────────────────────────────────
function ToastOpsPanel({ todayStr, refetchSummary }) {
  const [status, setStatus] = React.useState("");

  async function test() {
    setStatus("Testing Toast…");
    try {
      const res = await base44.functions.invoke("toastTestConnection");
      setStatus(res.data?.ok ? "✅ Toast connected" : `❌ ${res.data?.error}`);
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    }
  }

  async function syncMenu() {
    setStatus("Syncing Toast menu…");
    try {
      const res = await base44.functions.invoke("toastSyncMenu");
      setStatus(`✅ ${res.data?.message || "Done"}`);
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    }
  }

  async function syncToday() {
    setStatus("Syncing Toast sales + labor…");
    try {
      const res = await base44.functions.invoke("toastSyncTodaySummary");
      await refetchSummary();
      setStatus(res.data?.ok ? "✅ Today summary updated" : `❌ ${res.data?.error}`);
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    }
  }

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium text-[rgb(45,45,45)]">Toast Integration</div>
          <div className="text-xs text-[rgb(150,150,150)]">Menu · Today Sales · Labor</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button onClick={test} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
          Test Connection
        </button>
        <button onClick={syncMenu} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
          Sync Menu
        </button>
        <button onClick={syncToday} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
          Sync Today
        </button>
      </div>
      {status && <div className="mt-3 text-xs text-[rgb(120,120,120)]">{status}</div>}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== "admin") window.location.href = createPageUrl("Home");
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl("AdminDashboard"));
      }
    };
    loadUser();
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayStrLocal(), []);

  // ── Restaurant leads ──
  const { data: restaurantReservations = [] } = useQuery({
    queryKey: ["restaurant-reservations-admin"],
    queryFn: () => base44.entities.RestaurantReservationRequests.list("-created_date", 50),
  });
  const { data: eventLeads = [] } = useQuery({
    queryKey: ["event-leads-admin"],
    queryFn: () => base44.entities.RestaurantEventLeads.list("-created_date", 50),
  });
  const { data: contactLeads = [] } = useQuery({
    queryKey: ["contact-leads-dash"],
    queryFn: () => base44.entities.RestaurantContactLeads.filter({ status: "new" }),
  });
  const pendingReservations = restaurantReservations.filter((r) => r.status === "pending");
  const pendingEvents = eventLeads.filter((e) => e.status === "pending");
  const restaurantLeadsCount = pendingReservations.length + pendingEvents.length;

  // ── Housekeeping ──
  const { data: hkIssues = [] } = useQuery({
    queryKey: ["hk-issues-open-dash"],
    queryFn: () => base44.entities.HkIssue.filter({ status: "open" }),
  });
  const { data: hkTasksTodayAll = [] } = useQuery({
    queryKey: ["hk-tasks-today-all-dash", todayStr],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: todayStr }),
  });
  const { data: hkTasksOverdueOpen = [] } = useQuery({
    queryKey: ["hk-tasks-overdue-open-dash", todayStr],
    queryFn: async () => {
      try {
        const [pending, inProg] = await Promise.all([
          base44.entities.HkTask.filter({ taskDate: { $lt: todayStr }, status: "pending" }),
          base44.entities.HkTask.filter({ taskDate: { $lt: todayStr }, status: "in_progress" }),
        ]);
        return [...pending, ...inProg];
      } catch {
        return [];
      }
    },
  });
  const hkTodayOpen = hkTasksTodayAll.filter((t) => HK_OPEN_STATUSES.includes(t.status));
  const hkNeedsCount = hkTodayOpen.length + hkTasksOverdueOpen.length;

  // ── Spa ──
  const { data: spaBookings = [] } = useQuery({
    queryKey: ["spa-bookings-dash"],
    queryFn: () => base44.entities.SpaBooking.list("-startAt", 250),
  });
  const todaySpa = spaBookings.filter(
    (b) => b.startAt?.slice(0, 10) === todayStr && b.status !== "booking.cancelled"
  );
  const spaGapCount = useMemo(() => {
    const sorted = [...todaySpa]
      .map((b) => ({ ...b, _dt: parseIsoMaybe(b.startAt) }))
      .filter((b) => b._dt)
      .sort((a, b) => a._dt.getTime() - b._dt.getTime());
    if (sorted.length < 2) return 0;
    let gaps = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (minutesBetween(sorted[i]._dt, sorted[i + 1]._dt) >= 60) gaps++;
    }
    return gaps;
  }, [todaySpa]);

  // ── Hotel ──
  const { data: hotelBookings = [] } = useQuery({
    queryKey: ["hotel-bookings-dash"],
    queryFn: () => base44.entities.Booking.list("-check_in_date", 400),
  });
  const activeHotelBookings = hotelBookings.filter(
    (b) => String(b.booking_status || "").toLowerCase() !== "cancelled"
  );
  const arrivalsToday = activeHotelBookings.filter((b) => b.check_in_date === todayStr);
  const departuresToday = activeHotelBookings.filter((b) => b.check_out_date === todayStr);
  const inHouseTonight = activeHotelBookings.filter(
    (b) => b.check_in_date <= todayStr && b.check_out_date > todayStr
  );

  // ── Concierge ──
  const { data: packageInquiries = [] } = useQuery({
    queryKey: ["pkg-inquiries-dash"],
    queryFn: () => base44.entities.PackageInquiry.filter({ status: "new" }),
  });
  const conciergeRequests = [...contactLeads, ...packageInquiries];

  // ── Catering ──
  const { data: cateringQuotes = [] } = useQuery({
    queryKey: ["catering-quotes-dash"],
    queryFn: () => base44.entities.CateringQuote.list("-created_date", 120),
  });
  const activeCatering = cateringQuotes.filter((q) =>
    ["draft", "sent", "accepted", "deposit_paid"].includes(q.status)
  );

  // ── Toast ──
  const { data: toastDailyRows = [], refetch: refetchToast } = useQuery({
    queryKey: ["toast-daily-summary-row", todayStr],
    queryFn: async () => {
      try {
        return await base44.entities.ToastDailySummary.filter({ businessDate: todayStr });
      } catch {
        return [];
      }
    },
  });
  const toastToday = toastDailyRows?.[0] ?? null;

  // ── Nav sections ──
  const sections = [
    {
      title: "Rooms & Stays",
      color: "rgb(107,85,64)",
      tiles: [
        { icon: CalendarDays, label: "Room Bookings", page: "AdminBookings" },
        { icon: BedDouble, label: "Rooms", page: "AdminRooms" },
        { icon: FileText, label: "Packages", page: "AdminPackages" },
        { icon: Bell, label: "Package Inquiries", page: "AdminPackageInquiries" },
      ],
    },
    {
      title: "Spa & Wellness",
      color: "rgb(150,170,155)",
      tiles: [
        { icon: Sparkles, label: "Spa Schedule", page: "AdminSpaSchedule" },
        { icon: Sparkles, label: "Treatments", page: "AdminTreatments" },
      ],
    },
    {
      title: "Restaurant",
      color: "rgb(196,155,145)",
      tiles: [
        { icon: UtensilsCrossed, label: "Restaurant", page: "AdminRestaurant", badge: restaurantLeadsCount || null },
        { icon: ChefHat, label: "Catering", page: "AdminCatering" },
      ],
    },
    {
      title: "Housekeeping",
      color: "rgb(120,140,160)",
      tiles: [
        { icon: Brush, label: "Today's Tasks", page: "AdminHousekeeping", badge: hkTodayOpen.length || null },
        { icon: AlertTriangle, label: "Issues", page: "AdminHousekeepingIssues", badge: hkIssues.length || null },
      ],
    },
    {
      title: "Content & Settings",
      color: "rgb(198,182,165)",
      tiles: [
        { icon: MessageSquare, label: "Concierge Inbox", page: "AdminConciergeInbox", badge: conciergeRequests.length || null },
        { icon: ClipboardList, label: "Knowledge Base", page: "AdminKnowledge" },
        { icon: Image, label: "Image Library", page: "AdminImages" },
        { icon: BookOpen, label: "Media", page: "AdminMedia" },
        { icon: Users, label: "Staff Controls", page: "StaffControls" },
      ],
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[rgb(150,170,155)]" />
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Admin</h1>
              <p className="text-xs text-[rgb(150,150,150)]">{format(today, "EEEE, MMMM d")}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("StaffDashboard")} className="text-sm text-[rgb(45,45,45)] hover:text-[rgb(107,85,64)] flex items-center gap-1">
              <Users className="w-4 h-4" /> Staff
            </Link>
            <Link to={createPageUrl("Home")} className="text-sm text-[rgb(150,170,155)] hover:underline flex items-center gap-1">
              View Site <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-sm text-[rgb(45,45,45)] hover:text-red-500 flex items-center gap-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">

        {/* Whitney Focus */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-1">WHITNEY FOCUS · TODAY</p>
              <h2 className="text-lg font-medium text-[rgb(45,45,45)]">Open the day in 60 seconds</h2>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-[rgb(150,150,150)]">
              <Activity className="w-4 h-4" /> Live data
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to={createPageUrl("AdminBookings")} className="rounded-xl border border-[rgb(235,225,213)] bg-[rgb(248,246,242)] px-4 py-3 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[rgb(107,85,64)]">Hotel</span>
                <BedSingle className="w-4 h-4 text-[rgb(107,85,64)]" />
              </div>
              <p className="text-xs text-[rgb(120,120,120)]">{arrivalsToday.length} arriving · {departuresToday.length} departing · {inHouseTonight.length} in-house</p>
            </Link>
            <Link to={createPageUrl("AdminSpaSchedule")} className="rounded-xl border border-[rgb(235,225,213)] bg-[rgb(248,246,242)] px-4 py-3 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[rgb(150,170,155)]">Spa Today</span>
                <Sparkles className="w-4 h-4 text-[rgb(150,170,155)]" />
              </div>
              <p className="text-xs text-[rgb(120,120,120)]">{todaySpa.length} appointments · {spaGapCount} gap{spaGapCount === 1 ? "" : "s"}</p>
            </Link>
            <Link to={createPageUrl("AdminHousekeeping")} className="rounded-xl border border-[rgb(235,225,213)] bg-[rgb(248,246,242)] px-4 py-3 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[rgb(120,140,160)]">Housekeeping</span>
                <Brush className="w-4 h-4 text-[rgb(120,140,160)]" />
              </div>
              <p className="text-xs text-[rgb(120,120,120)]">{hkNeedsCount} open{hkIssues.length ? ` · ${hkIssues.length} issue${hkIssues.length === 1 ? "" : "s"}` : ""}</p>
            </Link>
            <Link to={createPageUrl("AdminRestaurant")} className="rounded-xl border border-[rgb(235,225,213)] bg-[rgb(248,246,242)] px-4 py-3 hover:bg-white hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[rgb(196,155,145)]">Restaurant</span>
                <UtensilsCrossed className="w-4 h-4 text-[rgb(196,155,145)]" />
              </div>
              <p className="text-xs text-[rgb(120,120,120)]">Sales {fmtMoney(toastToday?.netSales)} · Labor {fmtMoney(toastToday?.laborTotalCost)} · {restaurantLeadsCount} leads</p>
            </Link>
          </div>
        </div>

        {/* Today at a Glance — primary tiles */}
        <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-3">TODAY AT A GLANCE</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          {[
            { label: "Arrivals", value: arrivalsToday.length, icon: BedSingle, color: "rgb(107,85,64)", page: "AdminBookings" },
            { label: "Departures", value: departuresToday.length, icon: CalendarDays, color: "rgb(107,85,64)", page: "AdminBookings" },
            { label: "In-House", value: inHouseTonight.length, icon: BedDouble, color: "rgb(107,85,64)", page: "AdminBookings" },
            { label: "Spa Appts", value: todaySpa.length, icon: Sparkles, color: "rgb(150,170,155)", page: "AdminSpaSchedule" },
            { label: "Spa Gaps", value: spaGapCount, icon: Timer, color: spaGapCount > 0 ? "rgb(196,155,145)" : "rgb(150,150,150)", page: "AdminSpaSchedule" },
            { label: "HK Needs", value: hkNeedsCount, icon: Brush, color: hkNeedsCount > 0 ? "rgb(120,140,160)" : "rgb(150,150,150)", page: "AdminHousekeeping", alert: hkIssues.length > 0, alertLabel: `${hkIssues.length} issue${hkIssues.length !== 1 ? "s" : ""}` },
            { label: "Concierge", value: conciergeRequests.length, icon: MessageSquare, color: conciergeRequests.length > 0 ? "rgb(107,85,64)" : "rgb(150,150,150)", page: "AdminConciergeInbox" },
            { label: "Catering", value: activeCatering.length, icon: ChefHat, color: "rgb(196,155,145)", page: "AdminCatering" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={createPageUrl(stat.page)} className="block bg-white border border-[rgb(235,225,213)] p-4 rounded-xl hover:shadow-md hover:border-[rgb(198,182,165)] transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  {stat.alert && (
                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{stat.alertLabel}</span>
                  )}
                </div>
                <p className="text-3xl font-light" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[rgb(150,150,150)] mt-1 leading-snug">{stat.label}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Toast tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Net Sales (Today)", value: fmtMoney(toastToday?.netSales), icon: BadgeDollarSign, color: "rgb(196,155,145)" },
            { label: "Labor Cost (Today)", value: fmtMoney(toastToday?.laborTotalCost), icon: Users, color: "rgb(120,140,160)" },
            { label: "Sales / Labor Hr", value: toastToday?.salesPerLaborHour != null ? `$${Number(toastToday.salesPerLaborHour).toFixed(0)}` : "—", icon: Timer, color: "rgb(150,170,155)" },
            { label: "Restaurant Leads", value: restaurantLeadsCount, icon: UtensilsCrossed, color: "rgb(196,155,145)" },
          ].map((stat, i) => (
            <Link key={stat.label} to={createPageUrl("AdminRestaurant")} className="block bg-white border border-[rgb(235,225,213)] p-4 rounded-xl hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-2">
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                <span className="text-[10px] bg-[rgb(248,246,242)] text-[rgb(120,120,120)] px-1.5 py-0.5 rounded-full font-medium">Toast</span>
              </div>
              <p className="text-2xl font-light text-[rgb(45,45,45)]">{stat.value}</p>
              <p className="text-xs text-[rgb(150,150,150)] mt-1 leading-snug">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Toast Ops Panel */}
        <div className="mb-10">
          <ToastOpsPanel todayStr={todayStr} refetchSummary={refetchToast} />
        </div>

        {/* Section nav tiles */}
        {sections.map((section, si) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-xs tracking-widest font-medium mb-3" style={{ color: section.color }}>
              {section.title.toUpperCase()}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {section.tiles.map((tile, ti) => (
                <motion.div key={tile.page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (si * 4 + ti) * 0.03 }}>
                  <Link to={createPageUrl(tile.page)} className="block bg-white border border-[rgb(235,225,213)] rounded-xl p-4 hover:shadow-md hover:border-[rgb(198,182,165)] transition-all group relative">
                    {tile.badge > 0 && (
                      <span className="absolute top-3 right-3 min-w-[20px] h-5 px-1 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ background: section.color }}>
                        {tile.badge}
                      </span>
                    )}
                    <tile.icon className="w-6 h-6 mb-3" style={{ color: section.color }} />
                    <p className="text-sm font-medium text-[rgb(45,45,45)] group-hover:text-[rgb(107,85,64)] leading-tight">{tile.label}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
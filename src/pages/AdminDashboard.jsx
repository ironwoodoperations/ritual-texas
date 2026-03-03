import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Users, Sparkles, ArrowRight, Bell, UtensilsCrossed, ChefHat,
  BedDouble, ClipboardList, FileText, Image, LogOut, Leaf,
  CalendarDays, BookOpen, Brush, AlertTriangle, BedSingle,
  MessageSquare, Activity, BadgeDollarSign, Timer, Archive, Printer,
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

// ─── Whitney Focus Panel ─────────────────────────────────────────────────────
function WhitneyFocusPanel({ todayStr }) {
  const queryClient = useQueryClient();
  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["ops-tasks", todayStr],
    queryFn: async () => {
      const rows = await base44.entities.OpsTask.filter({ dueDate: todayStr });
      const open = rows.filter((t) => t.status !== "done");
      const done = rows.filter((t) => t.status === "done");
      const pr = (p) => (p === "high" ? 0 : p === "normal" ? 1 : 2);
      open.sort((a, b) => pr(a.priority) - pr(b.priority));
      return [...open, ...done];
    },
  });

  async function buildToday() {
    await base44.functions.invoke("ops_build_daily_tasks", {});
    refetch();
  }

  async function markDone(taskId) {
    await base44.functions.invoke("ops_mark_task_done", { taskId });
    refetch();
  }

  const priorityColor = (p) => p === "high" ? "text-red-500" : p === "normal" ? "text-[rgb(150,170,155)]" : "text-[rgb(180,180,180)]";

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium text-[rgb(45,45,45)]">Whitney Focus · Today</div>
          <div className="text-xs text-[rgb(150,150,150)]">Tap Done — no sticky notes</div>
        </div>
        <button onClick={buildToday} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
          Build Today
        </button>
      </div>
      <div className="grid gap-2">
        {tasks.map((t) => (
          <div key={t.id} className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${t.status === "done" ? "opacity-50" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[rgb(45,45,45)] truncate">{t.status === "done" ? "✅ " : ""}{t.title}</div>
              {t.notes && <div className="text-xs text-[rgb(120,120,120)] mt-0.5 leading-snug">{t.notes}</div>}
              <div className={`text-[11px] mt-1 font-medium ${priorityColor(t.priority)}`}>{t.category} · {t.priority}</div>
            </div>
            {t.status !== "done" ? (
              <button onClick={() => markDone(t.id)} className="shrink-0 px-3 py-1.5 rounded-xl border border-[rgb(235,225,213)] text-xs text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
                Done
              </button>
            ) : <div className="text-xs text-[rgb(180,180,180)] shrink-0">Done</div>}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="text-sm text-[rgb(150,150,150)]">No tasks yet — tap <b>Build Today</b>.</div>
        )}
      </div>
    </div>
  );
}

// ─── Intake Panel ─────────────────────────────────────────────────────────────
function IntakePanel({ intakeForms, intakeNewInquiries }) {
  const allIntakes = [...intakeNewInquiries, ...intakeForms];
  const statusColor = (s) => {
    if (s === "new_inquiry") return "text-[rgb(196,155,145)]";
    if (s === "pending") return "text-[rgb(150,170,155)]";
    return "text-[rgb(150,150,150)]";
  };
  const statusLabel = (s) => {
    if (s === "new_inquiry") return "New";
    if (s === "pending") return "Pending";
    return s;
  };

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium text-[rgb(45,45,45)]">Hotel + Treatment Intake</div>
          <div className="text-xs text-[rgb(150,150,150)]">{allIntakes.length} needing attention</div>
        </div>
        <Link to={createPageUrl("AdminIntake")} className="px-3 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors">
          View All
        </Link>
      </div>
      <div className="grid gap-2">
        {allIntakes.slice(0, 5).map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(235,225,213)] px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[rgb(45,45,45)] truncate">{f.guestName}</div>
              {(f.checkInDate || f.checkOutDate) && (
                <div className="text-xs text-[rgb(120,120,120)]">{f.checkInDate} → {f.checkOutDate}</div>
              )}
            </div>
            <span className={`text-[11px] font-semibold shrink-0 ${statusColor(f.bookingStatus)}`}>
              {statusLabel(f.bookingStatus)}
            </span>
          </div>
        ))}
        {allIntakes.length === 0 && (
          <div className="text-sm text-[rgb(150,150,150)]">No pending intake forms.</div>
        )}
        {allIntakes.length > 5 && (
          <Link to={createPageUrl("AdminIntake")} className="text-xs text-[rgb(150,170,155)] hover:underline text-center block">
            +{allIntakes.length - 5} more
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Day in 60 Seconds Panel ─────────────────────────────────────────────────
function DayIn60Panel({ arrivalsToday, departuresToday, inHouseTonight, todaySpa, spaGapCount, hkNeedsCount, hkIssues, toastToday, restaurantLeadsCount, intakeFollowUpCount, conciergeRequests }) {
  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium text-[rgb(45,45,45)]">Day in 60 Seconds</div>
          <div className="text-xs text-[rgb(150,150,150)]">Live snapshot</div>
        </div>
        <Activity className="w-4 h-4 text-[rgb(150,150,150)]" />
      </div>
      <div className="grid gap-2">
        <Link to={createPageUrl("AdminBookings")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <div className="flex items-center gap-2">
            <BedSingle className="w-4 h-4 text-[rgb(107,85,64)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Hotel</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{arrivalsToday.length} arriving · {departuresToday.length} departing · {inHouseTonight.length} in-house</span>
        </Link>
        <Link to={createPageUrl("AdminSpaSchedule")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[rgb(150,170,155)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Spa Today</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{todaySpa.length} appts · {spaGapCount} gap{spaGapCount === 1 ? "" : "s"}</span>
        </Link>
        <Link to={createPageUrl("AdminHousekeeping")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <div className="flex items-center gap-2">
            <Brush className="w-4 h-4 text-[rgb(120,140,160)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Housekeeping</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{hkNeedsCount} open{hkIssues.length ? ` · ${hkIssues.length} issue${hkIssues.length === 1 ? "" : "s"}` : ""}</span>
        </Link>
        <Link to={createPageUrl("AdminRestaurantSales")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-[rgb(196,155,145)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Restaurant</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">Sales {fmtMoney(toastToday?.netSales)} · Labor {fmtMoney(toastToday?.laborTotalCost)} · {restaurantLeadsCount} leads</span>
        </Link>
        <Link to={createPageUrl("AdminIntake")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${intakeFollowUpCount > 0 ? "border-[rgb(107,85,64)]" : "border-[rgb(235,225,213)]"}`}>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[rgb(107,85,64)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Intake</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{intakeFollowUpCount > 0 ? `${intakeFollowUpCount} need attention` : "Hotel + Treatment"}</span>
        </Link>
        <Link to={createPageUrl("AdminConciergeInbox")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${conciergeRequests.length > 0 ? "border-[rgb(150,170,155)]" : "border-[rgb(235,225,213)]"}`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[rgb(150,170,155)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Concierge</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{conciergeRequests.length > 0 ? `${conciergeRequests.length} unread` : "Inbox"}</span>
        </Link>
      </div>
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

  // ── Intake forms needing follow-up ──
  const { data: intakeForms = [] } = useQuery({
    queryKey: ["intake-followup-dash"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "pending" }),
  });
  const intakeNewInquiries = useQuery({
    queryKey: ["intake-new-dash"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "new_inquiry" }),
  }).data || [];
  const intakeFollowUpCount = intakeForms.length + intakeNewInquiries.length;

  // ── Catering ──
  const { data: cateringQuotes = [] } = useQuery({
    queryKey: ["catering-quotes-dash"],
    queryFn: () => base44.entities.CateringQuote.list("-created_date", 120),
  });
  const activeCatering = cateringQuotes.filter((q) =>
    ["draft", "sent", "accepted", "deposit_paid"].includes(q.status)
  );

  // ── Toast ──
  const { data: toastDailyRows = [] } = useQuery({
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

  // ── Toast Weekly ──
  const weekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    // Roll back to most recent Monday
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const { data: toastWeekRows = [] } = useQuery({
    queryKey: ["toast-weekly-summary", weekStart],
    queryFn: async () => {
      try {
        return await base44.entities.ToastDailySummary.filter({
          businessDate: { $gte: weekStart },
        });
      } catch {
        return [];
      }
    },
  });

  const toastWeeklySales = useMemo(() =>
    toastWeekRows.reduce((sum, r) => sum + (r.netSales || 0), 0),
    [toastWeekRows]
  );
  const toastWeeklyLabor = useMemo(() =>
    toastWeekRows.reduce((sum, r) => sum + (r.laborTotalCost || 0), 0),
    [toastWeekRows]
  );

  // ── Nav sections ──
  const sections = [
    {
      title: "Rooms & Stays",
      color: "rgb(107,85,64)",
      tiles: [
        { icon: BedDouble, label: "Rooms", page: "AdminRooms" },
        { icon: FileText, label: "Packages", page: "AdminPackages" },
        { icon: Printer, label: "Today's Itineraries", page: "AdminTodayItineraries" },
        { icon: FileText, label: "Invoice Generator", page: "AdminInvoiceGenerator" },
      ],
    },
    {
      title: "Spa & Wellness",
      color: "rgb(150,170,155)",
      tiles: [
        { icon: Sparkles, label: "Treatments", page: "AdminTreatments" },
      ],
    },
    {
      title: "Restaurant",
      color: "rgb(196,155,145)",
      tiles: [
        { icon: UtensilsCrossed, label: "Restaurant", page: "AdminRestaurant", badge: restaurantLeadsCount || null },
        { icon: ChefHat, label: "Catering", page: "AdminCatering" },
        { icon: BadgeDollarSign, label: "Sales & Labor", page: "AdminRestaurantSales" },
      ],
    },
    {
      title: "Content & Settings",
      color: "rgb(198,182,165)",
      tiles: [
        { icon: ClipboardList, label: "Knowledge Base", page: "AdminKnowledge" },
        { icon: Image, label: "Image Library", page: "AdminImages" },
        { icon: BookOpen, label: "Media", page: "AdminMedia" },
        { icon: Users, label: "Staff Controls", page: "StaffControls" },
      ],
    },
    {
      title: "CRM & Marketing",
      color: "rgb(150,170,155)",
      tiles: [
        { icon: Users, label: "Master CRM", page: "AdminMasterCRM" },
      ],
    },
    {
      title: "Projects & Archives",
      color: "rgb(120,120,120)",
      tiles: [
        { icon: Archive, label: "Square Archive", page: "AdminSquareBackup" },
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

        {/* Whitney Focus + Day in 60 Seconds Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          <WhitneyFocusPanel todayStr={todayStr} />
          <DayIn60Panel
            arrivalsToday={arrivalsToday}
            departuresToday={departuresToday}
            inHouseTonight={inHouseTonight}
            todaySpa={todaySpa}
            spaGapCount={spaGapCount}
            hkNeedsCount={hkNeedsCount}
            hkIssues={hkIssues}
            toastToday={toastToday}
            restaurantLeadsCount={restaurantLeadsCount}
            intakeFollowUpCount={intakeFollowUpCount}
            conciergeRequests={conciergeRequests}
          />
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
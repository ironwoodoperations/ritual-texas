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
  MessageSquare, Activity, BadgeDollarSign, Timer, Archive, Printer, Upload,
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

// ─── Intake Panel ─────────────────────────────────────────────────────────────
// (WhitneyFocusPanel removed)
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
      </div>
      <div className="grid gap-2">
        <Link to={createPageUrl("AdminConciergeInbox")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${conciergeRequests.length > 0 ? "border-[rgb(150,170,155)]" : "border-[rgb(235,225,213)]"}`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[rgb(150,170,155)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Concierge</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{conciergeRequests.length > 0 ? `${conciergeRequests.length} unread` : "Inbox"}</span>
        </Link>
        <Link to={createPageUrl("AdminIntake")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${intakeFollowUpCount > 0 ? "border-[rgb(107,85,64)]" : "border-[rgb(235,225,213)]"}`}>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[rgb(107,85,64)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Intake</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{intakeFollowUpCount > 0 ? `${intakeFollowUpCount} need attention` : "Hotel + Treatment"}</span>
        </Link>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgb(120,120,120)]">{todaySpa.length} appts · {spaGapCount} gap{spaGapCount === 1 ? "" : "s"}</span>
            <a href="https://simplybook.me/en/?ref=googleads_us_brand" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-1.5 py-1 hover:bg-[rgb(248,246,242)] transition-all">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/9c8b32fe8_download3.png" alt="SimplyBook" className="w-3.5 h-3.5" />
            </a>
          </div>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-[rgb(120,120,120)]">Sales {fmtMoney(toastToday?.netSales)} · Labor {fmtMoney(toastToday?.laborTotalCost)} · {restaurantLeadsCount} leads</span>
            <a href="https://www.toasttab.com/restaurants/admin/home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-1.5 py-1 hover:bg-[rgb(248,246,242)] transition-all">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/40f320a3a_download.png" alt="Toast" className="w-3.5 h-3.5" />
            </a>
            <a href="https://loman.ai" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-1.5 py-1 hover:bg-[rgb(248,246,242)] transition-all">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/3fe6aa7ba_download.jpeg" alt="Loman AI" className="w-3.5 h-3.5" />
            </a>
            <a href="https://www.sonos.com/en-us/shop?utm_campaign=rta_sonos_search_us_brand_core&utm_medium=cpc&utm_source=google&utm_content=rta_sonos_search_us_brand_core&utm_term=sonos&gclsrc=aw.ds&gad_source=1&gad_campaignid=23593370564&gbraid=0AAAAADo4HCepZTd3hBezW1pERk96txMXt&gclid=Cj0KCQiA8KTNBhD_ARIsAOvp6DJXkmdLxUo2BXCSXR08H6syL8EMOGhmjNAqsrZ8Ozmgx-_JfbbwEDYaAjAsEALw_wcB" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-1.5 py-1 hover:bg-[rgb(248,246,242)] transition-all">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/74431a740_download2.png" alt="Sonos" className="w-3.5 h-3.5" />
            </a>
          </div>
        </Link>
      </div>
      {/* Quick Links Row */}
      <div className="mt-4 pt-4 border-t border-[rgb(235,225,213)] flex gap-2 flex-wrap">
        <a href="https://simplybook.me/en/?ref=googleads_us_brand" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/9c8b32fe8_download3.png" alt="SimplyBook" className="w-5 h-5" />
        </a>
        <a href="https://www.optimum.net" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/31abe4610_download1.jpeg" alt="Optimum" className="w-5 h-5" />
        </a>
        <a href="https://loman.ai" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/3fe6aa7ba_download.jpeg" alt="Loman AI" className="w-5 h-5" />
        </a>
        <a href="https://www.cloudbeds.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/a3efecc1b_download1.png" alt="Cloudbeds" className="w-5 h-5" />
        </a>
        <a href="https://www.sonos.com/en-us/shop?utm_campaign=rta_sonos_search_us_brand_core&utm_medium=cpc&utm_source=google&utm_content=rta_sonos_search_us_brand_core&utm_term=sonos&gclsrc=aw.ds&gad_source=1&gad_campaignid=23593370564&gbraid=0AAAAADo4HCepZTd3hBezW1pERk96txMXt&gclid=Cj0KCQiA8KTNBhD_ARIsAOvp6DJXkmdLxUo2BXCSXR08H6syL8EMOGhmjNAqsrZ8Ozmgx-_JfbbwEDYaAjAsEALw_wcB" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/74431a740_download2.png" alt="Sonos" className="w-5 h-5" />
        </a>
        <a href="https://www.toasttab.com/restaurants/admin/home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/40f320a3a_download.png" alt="Toast" className="w-5 h-5" />
        </a>
        <a href="https://squareup.com/us/en" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/1bcdee3bb_images.jpeg" alt="Square" className="w-5 h-5" />
        </a>
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
        { icon: FileText, label: "Square Invoices", page: "AdminInvoiceGenerator" },
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
      title: "Data Management",
      color: "rgb(120,120,120)",
      tiles: [
        { icon: Upload, label: "Import Cloudbeds", page: "AdminCloudbedsImport" },
        { icon: Upload, label: "Import Square", page: "AdminSquareImport" },
        { icon: Upload, label: "Import Acuity", page: "AdminAcuityImport" },
        { icon: Upload, label: "Import SimplyBook", page: "AdminSimplybookImport" },
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

        {/* Quick Action Tiles */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link to={createPageUrl("AdminTodayItineraries")} className="bg-[rgb(107,85,64)] text-white rounded-2xl p-5 hover:bg-[rgb(85,65,45)] transition-all flex items-center gap-4">
            <Printer className="w-7 h-7 shrink-0 opacity-80" />
            <div>
              <div className="font-semibold text-base leading-tight">Today's Itineraries</div>
              <div className="text-xs opacity-70 mt-0.5">{arrivalsToday.length} arriving today</div>
            </div>
          </Link>
          <Link to={createPageUrl("AdminInvoiceGenerator")} className="bg-[rgb(150,170,155)] text-white rounded-2xl p-5 hover:bg-[rgb(130,150,135)] transition-all flex items-center gap-4">
            <FileText className="w-7 h-7 shrink-0 opacity-80" />
            <div>
              <div className="font-semibold text-base leading-tight">Square Invoices</div>
              <div className="text-xs opacity-70 mt-0.5">Create & manage invoices</div>
            </div>
          </Link>
        </div>

        {/* Day in 60 Seconds Panel */}
        <div className="mb-6" style={{ maxWidth: "100%" }}>
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
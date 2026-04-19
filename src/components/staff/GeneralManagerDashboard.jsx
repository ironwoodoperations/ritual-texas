import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  MessageSquare, ClipboardList, Sparkles, Brush, Printer,
  FileText, Users, BedDouble, RefreshCw,
} from "lucide-react";
import HotelTodayPanel from "@/components/dashboard/HotelTodayPanel";
import RestaurantWeekPanel from "@/components/dashboard/RestaurantWeekPanel";
import PageHelpBanner from "@/components/PageHelpBanner";

const GM_HELP_CONTENT = `Your command center for daily hotel, spa, and restaurant operations.

QUICK ACTION TILES
• TODAY'S ITINERARIES: Print-ready briefing for every arriving guest — room, spa appointments, special requests. Review before 10 AM and text guests 2-3 hours before their expected arrival.
• SQUARE INVOICES: Create and manage invoices for group bookings, catering deposits, and custom packages.

DAY IN 60 SECONDS PANEL
Scan every morning at open and again at 3 PM:
• CONCIERGE INBOX: Unread guest inquiries. Target: 2-hour response time.
• INTAKE: Warm leads needing follow-up or booking confirmation.
• HOTEL TODAY: Live arrivals, departures, and in-house counts from Cloudbeds.
• SPA TODAY: Appointments + gap count. Gaps of 30+ min = revenue opportunity for walk-ins.
• HOUSEKEEPING: Open tasks + flagged issues. Never release a room until HK shows Complete.
• RESTAURANT: Current week's sales and labor entered below.

INTEGRATION QUICK LINKS
Icons at the bottom link to SimplyBook (spa bookings), Cloudbeds (hotel PMS), Toast (restaurant POS), Square (payments), Loman (AI phone), and Sonos (music system).`;

function todayStrLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

export default function GeneralManagerDashboard() {
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => todayStrLocal(), []);
  const today = useMemo(() => new Date(), []);

  // Sync SimplyBook → SpaBooking on mount
  async function syncSpaToday() {
    try {
      await base44.functions.invoke("syncSimplybookToday", {});
      queryClient.invalidateQueries({ queryKey: ["gm-spa-bookings"] });
    } catch (e) {
      console.error("Spa sync failed:", e);
    }
  }
  useEffect(() => { syncSpaToday(); }, []);

  // ── Hotel ──
  const { data: hotelBookings = [] } = useQuery({
    queryKey: ["gm-hotel-bookings"],
    queryFn: () => base44.entities.Booking.list("-check_in_date", 400),
  });
  const activeHotelBookings = hotelBookings.filter(b => String(b.booking_status||"").toLowerCase() !== "cancelled");
  const arrivalsToday    = activeHotelBookings.filter(b => b.check_in_date === todayStr);
  const departuresToday  = activeHotelBookings.filter(b => b.check_out_date === todayStr);
  const inHouseTonight   = activeHotelBookings.filter(b => b.check_in_date <= todayStr && b.check_out_date > todayStr);

  // ── Spa ──
  const { data: spaBookings = [] } = useQuery({
    queryKey: ["gm-spa-bookings"],
    queryFn: () => base44.entities.SpaBooking.list("-startAt", 250),
  });
  const todaySpa = spaBookings.filter(b => b.startAt?.slice(0,10) === todayStr && b.status !== "booking.cancelled");
  const spaGapCount = useMemo(() => {
    const sorted = [...todaySpa]
      .map(b => ({ ...b, _dt: parseIsoMaybe(b.startAt) }))
      .filter(b => b._dt)
      .sort((a, b) => a._dt - b._dt);
    if (sorted.length < 2) return 0;
    let gaps = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (minutesBetween(sorted[i]._dt, sorted[i+1]._dt) >= 60) gaps++;
    }
    return gaps;
  }, [todaySpa]);

  // ── Housekeeping ──
  const { data: hkIssues = [] } = useQuery({
    queryKey: ["gm-hk-issues"],
    queryFn: () => base44.entities.HkIssue.filter({ status: "open" }),
  });
  const { data: hkTasksToday = [] } = useQuery({
    queryKey: ["gm-hk-tasks-today", todayStr],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: todayStr }),
  });
  const hkNeedsCount = hkTasksToday.filter(t => ["pending","in_progress"].includes(t.status)).length;

  // ── Concierge ──
  const { data: contactLeads = [] } = useQuery({
    queryKey: ["gm-contact-leads"],
    queryFn: () => base44.entities.RestaurantContactLeads.filter({ status: "new" }),
  });
  const { data: packageInquiries = [] } = useQuery({
    queryKey: ["gm-pkg-inquiries"],
    queryFn: () => base44.entities.PackageInquiry.filter({ status: "new" }),
  });
  const conciergeCount = contactLeads.length + packageInquiries.length;

  // ── Cloudbeds status ──
  const { data: siteSettings = [] } = useQuery({
    queryKey: ['site-settings-cloudbeds-status'],
    queryFn: () => base44.entities.SiteSettings.list(),
    staleTime: 5 * 60 * 1000,
  });
  const cloudbedsStatus = (() => {
    const accessToken = siteSettings.find(s => s.key === 'CLOUDBEDS_ACCESS_TOKEN')?.value;
    const tokenExpiry = siteSettings.find(s => s.key === 'CLOUDBEDS_TOKEN_EXPIRES_AT')?.value;
    if (!accessToken) return 'disconnected';
    if (tokenExpiry && new Date(tokenExpiry) < new Date()) return 'disconnected';
    return 'connected';
  })();

  // ── Intake ──
  const { data: intakePending = [] } = useQuery({
    queryKey: ["gm-intake-pending"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "pending" }),
  });
  const { data: intakeNew = [] } = useQuery({
    queryKey: ["gm-intake-new"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "new_inquiry" }),
  });
  const intakeCount = intakePending.length + intakeNew.length;

  return (
    <div className="space-y-4">
      <PageHelpBanner title="General Manager Dashboard" content={GM_HELP_CONTENT} accentColor="rgb(107,85,64)" />
      <div>
        <p className="text-lg font-light text-[rgb(107,85,64)]">General Manager</p>
        <p className="text-xs text-[rgb(150,150,150)]">{format(today, "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* Quick Action Tiles — same as admin dash */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl("AdminTodayItineraries")} className="bg-[rgb(107,85,64)] text-white rounded-2xl p-4 hover:bg-[rgb(85,65,45)] transition-all flex items-center gap-3">
          <Printer className="w-6 h-6 shrink-0 opacity-80" />
          <div>
            <div className="font-semibold text-sm leading-tight">Today's Itineraries</div>
            <div className="text-xs opacity-70 mt-0.5">{arrivalsToday.length} arriving today</div>
          </div>
        </Link>
        <Link to={createPageUrl("AdminInvoiceGenerator")} className="bg-[rgb(150,170,155)] text-white rounded-2xl p-4 hover:bg-[rgb(130,150,135)] transition-all flex items-center gap-3">
          <FileText className="w-6 h-6 shrink-0 opacity-80" />
          <div>
            <div className="font-semibold text-sm leading-tight">Square Invoices</div>
            <div className="text-xs opacity-70 mt-0.5">Create & manage invoices</div>
          </div>
        </Link>
      </div>

      {/* Day in 60 Seconds — exact same as admin */}
      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
        <div className="text-sm font-medium text-[rgb(45,45,45)] mb-1">Day in 60 Seconds</div>
        <div className="text-xs text-[rgb(150,150,150)] mb-3">Live snapshot</div>
        <div className="grid gap-2">
          <Link to={createPageUrl("AdminConciergeInbox")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${conciergeCount > 0 ? "border-[rgb(150,170,155)]" : "border-[rgb(235,225,213)]"}`}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[rgb(150,170,155)]" />
              <span className="text-sm font-medium text-[rgb(45,45,45)]">Concierge</span>
            </div>
            <span className="text-xs text-[rgb(120,120,120)]">{conciergeCount > 0 ? `${conciergeCount} unread` : "Inbox"}</span>
          </Link>

          <Link to={createPageUrl("AdminIntake")} className={`flex items-center justify-between rounded-xl border px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all ${intakeCount > 0 ? "border-[rgb(107,85,64)]" : "border-[rgb(235,225,213)]"}`}>
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[rgb(107,85,64)]" />
              <span className="text-sm font-medium text-[rgb(45,45,45)]">Intake</span>
            </div>
            <span className="text-xs text-[rgb(120,120,120)]">{intakeCount > 0 ? `${intakeCount} need attention` : "Hotel + Treatment"}</span>
          </Link>

          <HotelTodayPanel arrivalsToday={arrivalsToday} departuresToday={departuresToday} inHouseTonight={inHouseTonight} cloudbedsStatus={cloudbedsStatus} />

          <Link to={createPageUrl("AdminSpaSchedule")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[rgb(150,170,155)]" />
              <span className="text-sm font-medium text-[rgb(45,45,45)]">Spa Today</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[rgb(120,120,120)]">{todaySpa.length} appts · {spaGapCount} gap{spaGapCount === 1 ? "" : "s"}</span>
              <button
                onClick={e => { e.preventDefault(); syncSpaToday(); }}
                title="Sync from Acuity"
                className="p-1 rounded hover:bg-[rgb(235,225,213)] transition-colors"
              >
                <RefreshCw className="w-3 h-3 text-[rgb(150,150,150)]" />
              </button>
            </div>
          </Link>

          <Link to={createPageUrl("AdminHousekeeping")} className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
            <div className="flex items-center gap-2">
              <Brush className="w-4 h-4 text-[rgb(120,140,160)]" />
              <span className="text-sm font-medium text-[rgb(45,45,45)]">Housekeeping</span>
            </div>
            <span className="text-xs text-[rgb(120,120,120)]">{hkNeedsCount} open{hkIssues.length ? ` · ${hkIssues.length} issue${hkIssues.length === 1 ? "" : "s"}` : ""}</span>
          </Link>

          <RestaurantWeekPanel />
        </div>

        {/* Quick Links — exact same logos as admin */}
        <div className="mt-4 pt-4 border-t border-[rgb(235,225,213)] flex gap-2 flex-wrap">
          <a href="https://acuityscheduling.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all text-xs text-[rgb(107,85,64)] font-medium">
            Acuity
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
          <a href="https://www.sonos.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/74431a740_download2.png" alt="Sonos" className="w-5 h-5" />
          </a>
          <a href="https://www.toasttab.com/restaurants/admin/home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/40f320a3a_download.png" alt="Toast" className="w-5 h-5" />
          </a>
          <a href="https://squareup.com/dashboard/invoices" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-lg border border-[rgb(235,225,213)] px-3 py-2 hover:bg-[rgb(248,246,242)] transition-all">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/1bcdee3bb_images.jpeg" alt="Square" className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
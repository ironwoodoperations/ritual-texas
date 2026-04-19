// GM Day in 60 Seconds — reuses the same DayIn60 data as AdminDashboard
import React, { useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { BedDouble, Sparkles, Brush, ClipboardList, ExternalLink, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import RestaurantWeekPanel from "@/components/dashboard/RestaurantWeekPanel";
import HotelTodayPanel from "@/components/dashboard/HotelTodayPanel";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseIsoMaybe(iso) {
  if (!iso) return null;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

export default function GmDaySnapshot() {
  const queryClient = useQueryClient();
  const today = todayStr();

  // Sync SimplyBook → SpaBooking on mount
  useEffect(() => {
    base44.functions.invoke("syncSimplybookToday", {})
      .then(() => queryClient.invalidateQueries({ queryKey: ["gm-spa"] }))
      .catch(e => console.error("Spa sync failed:", e));
  }, []);

  const { data: bookings = [] } = useQuery({
    queryKey: ["gm-bookings"],
    queryFn: () => base44.entities.Booking.list("-check_in_date", 400),
  });

  const { data: hkTasks = [] } = useQuery({
    queryKey: ["gm-hk-tasks", today],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: today }),
  });

  const { data: hkIssues = [] } = useQuery({
    queryKey: ["gm-hk-issues"],
    queryFn: () => base44.entities.HkIssue.filter({ status: "open" }),
  });

  const { data: spaBookings = [] } = useQuery({
    queryKey: ["gm-spa"],
    queryFn: () => base44.entities.SpaBooking.list("-startAt", 250),
  });

  const { data: intakeForms = [] } = useQuery({
    queryKey: ["gm-intake-new"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "new_inquiry" }),
  });

  const { data: intakePending = [] } = useQuery({
    queryKey: ["gm-intake-pending"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "pending" }),
  });

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

  const active = bookings.filter(b => b.booking_status !== "cancelled");
  const arrivalsToday = active.filter(b => b.check_in_date === today);
  const departuresToday = active.filter(b => b.check_out_date === today);
  const inHouseTonight = active.filter(b => b.check_in_date <= today && b.check_out_date > today);

  const todaySpa = spaBookings.filter(b => b.startAt?.slice(0, 10) === today && b.status !== "booking.cancelled");

  const spaGapCount = useMemo(() => {
    const sorted = [...todaySpa]
      .map(b => ({ ...b, _dt: parseIsoMaybe(b.startAt) }))
      .filter(b => b._dt)
      .sort((a, b) => a._dt - b._dt);
    if (sorted.length < 2) return 0;
    let gaps = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if ((sorted[i+1]._dt - sorted[i]._dt) / 60000 >= 60) gaps++;
    }
    return gaps;
  }, [todaySpa]);

  const hkNeedsCount = hkTasks.filter(t => ["pending","in_progress"].includes(t.status)).length;
  const intakeCount = intakeForms.length + intakePending.length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-light text-[rgb(107,85,64)]">Day in 60 Seconds · {format(new Date(), "EEEE, MMMM d")}</h2>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4 space-y-2">
        {intakeCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-[rgb(107,85,64)] px-3 py-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[rgb(107,85,64)]" />
              <span className="text-sm font-medium text-[rgb(45,45,45)]">Intake</span>
            </div>
            <span className="text-xs text-[rgb(107,85,64)] font-semibold">{intakeCount} need attention</span>
          </div>
        )}

        <HotelTodayPanel arrivalsToday={arrivalsToday} departuresToday={departuresToday} inHouseTonight={inHouseTonight} cloudbedsStatus={cloudbedsStatus} />

        <div className="flex items-center justify-between rounded-xl border border-[rgb(235,225,213)] px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[rgb(150,170,155)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Spa Today</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{todaySpa.length} appts · {spaGapCount} gap{spaGapCount === 1 ? "" : "s"}</span>
        </div>

        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${hkNeedsCount > 0 ? "border-amber-300" : "border-[rgb(235,225,213)]"}`}>
          <div className="flex items-center gap-2">
            <Brush className="w-4 h-4 text-[rgb(120,140,160)]" />
            <span className="text-sm font-medium text-[rgb(45,45,45)]">Housekeeping</span>
          </div>
          <span className="text-xs text-[rgb(120,120,120)]">{hkNeedsCount} open{hkIssues.length ? ` · ${hkIssues.length} issue${hkIssues.length === 1 ? "" : "s"}` : ""}</span>
        </div>

        <RestaurantWeekPanel />
      </div>

      {/* Quick links */}
      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4">
        <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-3">Quick Links</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Acuity", url: "https://acuityscheduling.com" },
            { label: "Cloudbeds", url: "https://www.cloudbeds.com" },
            { label: "Toast POS", url: "https://www.toasttab.com/restaurants/admin/home" },
            { label: "Square", url: "https://squareup.com/dashboard/invoices" },
          ].map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 border border-[rgb(235,225,213)] rounded-lg text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-colors">
              <ExternalLink className="w-3 h-3" /> {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
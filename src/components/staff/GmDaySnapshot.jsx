import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, ClipboardList, BedDouble, Sparkles, Brush, UtensilsCrossed, ExternalLink } from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtMoney(n) {
  if (!n) return "—";
  return `$${Number(n).toFixed(0)}`;
}

export default function GmDaySnapshot() {
  const today = todayStr();

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
    queryFn: () => base44.entities.SpaBooking.list("-startAt", 100),
  });

  const { data: intakeForms = [] } = useQuery({
    queryKey: ["gm-intake"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "new_inquiry" }),
  });

  const { data: intakePending = [] } = useQuery({
    queryKey: ["gm-intake-pending"],
    queryFn: () => base44.entities.HotelTreatmentIntake.filter({ bookingStatus: "pending" }),
  });

  const active = bookings.filter(b => b.booking_status !== "cancelled");
  const arrivalsToday = active.filter(b => b.check_in_date === today);
  const departuresToday = active.filter(b => b.check_out_date === today);
  const inHouse = active.filter(b => b.check_in_date <= today && b.check_out_date > today);
  const openHk = hkTasks.filter(t => !["completed"].includes(t.status));
  const todaySpa = spaBookings.filter(b => b.startAt?.slice(0,10) === today && b.status !== "booking.cancelled");
  const intakeCount = intakeForms.length + intakePending.length;

  const items = [
    { icon: BedDouble, label: "Arrivals Today", value: arrivalsToday.length, color: "text-[rgb(150,170,155)]" },
    { icon: BedDouble, label: "Departures Today", value: departuresToday.length, color: "text-[rgb(196,155,145)]" },
    { icon: BedDouble, label: "In-House Tonight", value: inHouse.length, color: "text-[rgb(107,85,64)]" },
    { icon: Sparkles, label: "Spa Appts Today", value: todaySpa.length, color: "text-[rgb(150,170,155)]" },
    { icon: Brush, label: "Open HK Tasks", value: openHk.length, color: openHk.length > 0 ? "text-amber-600" : "text-[rgb(150,150,150)]" },
    { icon: Brush, label: "Open HK Issues", value: hkIssues.length, color: hkIssues.length > 0 ? "text-red-500" : "text-[rgb(150,150,150)]" },
    { icon: ClipboardList, label: "Intake Needing Attention", value: intakeCount, color: intakeCount > 0 ? "text-[rgb(107,85,64)]" : "text-[rgb(150,150,150)]" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-light text-[rgb(107,85,64)]">Day in 60 Seconds</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4 flex items-center gap-3">
            <item.icon className={`w-5 h-5 shrink-0 ${item.color}`} />
            <div>
              <div className={`text-2xl font-light ${item.color}`}>{item.value}</div>
              <div className="text-xs text-[rgb(150,150,150)]">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4">
        <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-3">Quick Links</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "SimplyBook", url: "https://simplybook.me" },
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
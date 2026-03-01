import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, ExternalLink } from "lucide-react";

function fmtEventTime(event) {
  if (event.start?.dateTime) {
    const d = new Date(event.start.dateTime);
    return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  if (event.start?.date) {
    const [y, m, day] = event.start.date.split("-");
    return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return "";
}

function isToday(event) {
  const today = new Date().toISOString().slice(0, 10);
  return (event.start?.dateTime?.slice(0, 10) === today) || (event.start?.date === today);
}

export default function GoogleCalendarPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["google-calendar-events"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getGoogleCalendarEvents", {});
      return res.data?.events || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4 h-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[rgb(107,85,64)]" />
          <div>
            <div className="text-sm font-medium text-[rgb(45,45,45)]">Calendar</div>
            <div className="text-xs text-[rgb(150,150,150)]">Next 7 days</div>
          </div>
        </div>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg hover:bg-[rgb(248,246,242)] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />
        </a>
      </div>

      <div className="grid gap-2">
        {isLoading && (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
          </div>
        )}
        {error && (
          <div className="text-xs text-red-400 py-2">Could not load calendar events.</div>
        )}
        {!isLoading && !error && data?.length === 0 && (
          <div className="text-sm text-[rgb(150,150,150)]">No upcoming events this week.</div>
        )}
        {!isLoading && data?.map((event) => (
          <div
            key={event.id}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 ${isToday(event) ? "border-[rgb(107,85,64)] bg-[rgb(252,249,245)]" : "border-[rgb(235,225,213)]"}`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[rgb(45,45,45)] truncate">{event.summary || "(No title)"}</div>
              <div className="text-xs text-[rgb(120,120,120)] mt-0.5">{fmtEventTime(event)}</div>
            </div>
            {isToday(event) && (
              <span className="shrink-0 text-[10px] font-bold text-[rgb(107,85,64)] bg-[rgb(235,225,213)] rounded-full px-2 py-0.5">TODAY</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
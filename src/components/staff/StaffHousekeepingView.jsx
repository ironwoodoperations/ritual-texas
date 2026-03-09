import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Brush } from "lucide-react";
import StaffHousekeepingTask from "./StaffHousekeepingTask";

const STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  paused: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  needs_review: "bg-red-100 text-red-800",
};

const TYPE_LABEL = {
  checkout: "Checkout",
  stayover: "Stayover",
  deep_clean: "Deep Clean",
  opening_duty: "Opening Duty",
  closing_duty: "Closing Duty",
  public_space: "Public Space",
  manual: "Manual",
};

export default function StaffHousekeepingView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openTaskId, setOpenTaskId] = useState(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["hk-tasks-staff-view", dateStr],
    queryFn: () => base44.entities.HkTask.filter({ taskDate: dateStr }),
  });

  const isEffectivelyDone = (t) => t.status === "completed" || (t.completionPercent >= 100 && t.totalItems > 0);
  const activeTasks = tasks.filter((t) => !isEffectivelyDone(t));
  const doneTasks = tasks.filter((t) => isEffectivelyDone(t));

  const handlePrev = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const handleNext = () => setSelectedDate((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });

  if (openTaskId) {
    return (
      <StaffHousekeepingTask
        taskId={openTaskId}
        onBack={() => { setOpenTaskId(null); refetch(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between bg-white p-4 border border-[rgb(235,225,213)] rounded-lg">
        <button onClick={handlePrev} className="p-2 hover:bg-[rgb(235,225,213)] rounded"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-xl font-light text-[rgb(107,85,64)]">{format(selectedDate, "EEEE")}</p>
          <p className="text-sm text-[rgb(45,45,45)]">{format(selectedDate, "MMMM d, yyyy")}</p>
        </div>
        <button onClick={handleNext} className="p-2 hover:bg-[rgb(235,225,213)] rounded"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-3 text-center">
          <p className="text-2xl font-light text-[rgb(107,85,64)]">{activeTasks.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Needs Attention</p>
        </div>
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-3 text-center">
          <p className="text-2xl font-light text-[rgb(150,170,155)]">{doneTasks.length}</p>
          <p className="text-xs text-[rgb(45,45,45)]">Completed</p>
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-2">To Do</p>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg divide-y divide-[rgb(235,225,213)]">
            {activeTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenTaskId(t.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[rgb(248,246,242)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Brush className="w-5 h-5 text-[rgb(198,182,165)] shrink-0" />
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{t.roomNumber}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">{TYPE_LABEL[t.taskType] || t.taskType} · {t.priority}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[t.status] || "bg-gray-100 text-gray-700"}`}>
                  {t.status?.replace("_", " ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completed tasks */}
      {doneTasks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-2">Completed</p>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-lg divide-y divide-[rgb(235,225,213)] opacity-70">
            {doneTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenTaskId(t.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[rgb(248,246,242)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Brush className="w-5 h-5 text-[rgb(150,170,155)] shrink-0" />
                  <div>
                    <p className="font-medium text-[rgb(45,45,45)] line-through">{t.roomNumber}</p>
                    <p className="text-sm text-[rgb(150,150,150)]">{TYPE_LABEL[t.taskType] || t.taskType}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">done</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg p-12 text-center">
          <Brush className="w-8 h-8 mx-auto mb-3 text-[rgb(198,182,165)]" />
          <p className="text-[rgb(45,45,45)]">No housekeeping tasks for this day</p>
        </div>
      )}
    </div>
  );
}
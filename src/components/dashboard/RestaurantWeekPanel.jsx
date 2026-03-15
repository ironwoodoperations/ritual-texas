import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, ChevronDown, ChevronUp, Save, Archive } from "lucide-react";

function getCurrentWeekDays() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun,1=Mon,2=Tue...
  // Roll back to most recent Tuesday
  let offset;
  if (day === 0) offset = -5;
  else if (day === 1) offset = -6;
  else offset = -(day - 2);

  const tuesday = new Date(today);
  tuesday.setDate(today.getDate() + offset);
  tuesday.setHours(0, 0, 0, 0);

  // Tue, Wed, Thu, Fri, Sat (offsets 0-4)
  const labels = ["Tue", "Wed", "Thu", "Fri", "Sat"];
  return [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(tuesday);
    d.setDate(tuesday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return {
      dateStr: `${yyyy}-${mm}-${dd}`,
      label: labels[i],
    };
  });
}

function fmt$(n) {
  if (n == null || n === "" || isNaN(Number(n))) return "—";
  return `$${Number(n).toFixed(0)}`;
}

function WeekArchiveCard({ week }) {
  const [open, setOpen] = useState(false);
  let days = [];
  try { days = JSON.parse(week.days || "[]"); } catch {}

  return (
    <div className="rounded-xl border border-[rgb(235,225,213)] bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[rgb(248,246,242)] transition-colors"
      >
        <span className="text-xs font-semibold text-[rgb(107,85,64)]">{week.weekLabel}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgb(120,120,120)]">
            {fmt$(week.totalSales)} · {fmt$(week.totalLabor)} labor · {week.totalLaborHours}h
          </span>
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </div>
      </button>
      {open && days.length > 0 && (
        <div className="px-3 pb-3 border-t border-[rgb(235,225,213)]">
          <div className="grid grid-cols-4 gap-1 pt-2 mb-1">
            {["Day", "Sales", "Labor", "Hours"].map((h) => (
              <span key={h} className="text-[10px] text-[rgb(150,150,150)] font-semibold">{h}</span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.date} className="grid grid-cols-4 gap-1 py-0.5">
              <span className="text-xs text-[rgb(45,45,45)]">{d.label}</span>
              <span className="text-xs text-[rgb(45,45,45)]">{fmt$(d.sales)}</span>
              <span className="text-xs text-[rgb(45,45,45)]">{fmt$(d.labor)}</span>
              <span className="text-xs text-[rgb(45,45,45)]">{d.laborHours || 0}h</span>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-1 pt-2 mt-1 border-t border-[rgb(235,225,213)]">
            <span className="text-xs font-bold text-[rgb(107,85,64)]">Total</span>
            <span className="text-xs font-bold text-[rgb(45,45,45)]">{fmt$(week.totalSales)}</span>
            <span className="text-xs font-bold text-[rgb(45,45,45)]">{fmt$(week.totalLabor)}</span>
            <span className="text-xs font-bold text-[rgb(45,45,45)]">{week.totalLaborHours}h</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RestaurantWeekPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [archiving, setArchiving] = useState(false);
  const [cateringRows, setCateringRows] = useState([{ id: Date.now(), label: "", sales: "", labor: "", laborHours: "" }]);
  const [cateringSaved, setCateringSaved] = useState({});
  const queryClient = useQueryClient();

  const weekDays = getCurrentWeekDays();
  const weekKey = weekDays[0].dateStr;

  const { data: dayRecords = [] } = useQuery({
    queryKey: ["manual-sales-week", weekKey],
    queryFn: () => base44.entities.ManualSalesDay.filter({ weekKey }),
  });

  const { data: cateringRecords = [] } = useQuery({
    queryKey: ["catering-sales-week", weekKey],
    queryFn: () => base44.entities.ManualSalesDay.filter({ weekKey, date: { $regex: `^catering-` } }),
  });

  const { data: archivedWeeks = [] } = useQuery({
    queryKey: ["sales-week-archives"],
    queryFn: () => base44.entities.SalesWeekArchive.list("-startDate", 52),
    enabled: showArchive,
  });

  const getRecord = (dateStr) => dayRecords.find((r) => r.date === dateStr);

  const getValue = (dateStr, field) => {
    if (editing[dateStr] && field in editing[dateStr]) return editing[dateStr][field];
    return getRecord(dateStr)?.[field] ?? "";
  };

  const handleChange = (dateStr, field, value) => {
    setEditing((prev) => ({ ...prev, [dateStr]: { ...(prev[dateStr] || {}), [field]: value } }));
  };

  const handleSaveDay = async (dateStr) => {
    const values = editing[dateStr];
    if (!values) return;
    setSaving((prev) => ({ ...prev, [dateStr]: true }));
    const existing = getRecord(dateStr);
    const data = {
      date: dateStr,
      weekKey,
      sales: parseFloat(values.sales) || 0,
      labor: parseFloat(values.labor) || 0,
      laborHours: parseFloat(values.laborHours) || 0,
    };
    if (existing) {
      await base44.entities.ManualSalesDay.update(existing.id, data);
    } else {
      await base44.entities.ManualSalesDay.create(data);
    }
    setEditing((prev) => { const n = { ...prev }; delete n[dateStr]; return n; });
    queryClient.invalidateQueries({ queryKey: ["manual-sales-week", weekKey] });
    setSaving((prev) => ({ ...prev, [dateStr]: false }));
  };

  const totals = weekDays.reduce(
    (acc, { dateStr }) => {
      const rec = getRecord(dateStr);
      return {
        sales: acc.sales + (parseFloat(rec?.sales) || 0),
        labor: acc.labor + (parseFloat(rec?.labor) || 0),
        laborHours: acc.laborHours + (parseFloat(rec?.laborHours) || 0),
      };
    },
    { sales: 0, labor: 0, laborHours: 0 }
  );

  const handleArchiveWeek = async () => {
    if (!window.confirm("Archive this week and start fresh?")) return;
    setArchiving(true);
    const weekLabel = `${weekDays[0].dateStr} – ${weekDays[weekDays.length - 1].dateStr}`;
    await base44.entities.SalesWeekArchive.create({
      weekKey,
      weekLabel,
      startDate: weekDays[0].dateStr,
      endDate: weekDays[weekDays.length - 1].dateStr,
      totalSales: totals.sales,
      totalLabor: totals.labor,
      totalLaborHours: totals.laborHours,
      days: JSON.stringify(
        weekDays.map(({ dateStr, label }) => {
          const rec = getRecord(dateStr);
          return { date: dateStr, label, sales: rec?.sales || 0, labor: rec?.labor || 0, laborHours: rec?.laborHours || 0 };
        })
      ),
    });
    for (const rec of dayRecords) {
      await base44.entities.ManualSalesDay.delete(rec.id);
    }
    queryClient.invalidateQueries({ queryKey: ["manual-sales-week"] });
    queryClient.invalidateQueries({ queryKey: ["sales-week-archives"] });
    setArchiving(false);
  };

  return (
    <div className="rounded-xl border border-[rgb(235,225,213)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-[rgb(248,246,242)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-[rgb(196,155,145)]" />
          <span className="text-sm font-medium text-[rgb(45,45,45)]">Restaurant</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgb(120,120,120)]">
            This week: {fmt$(totals.sales)} sales · {fmt$(totals.labor)} labor · {totals.laborHours}h
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-[rgb(150,150,150)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />}
        </div>
      </button>

      {isOpen && (
        <div className="bg-[rgb(248,246,242)] p-3">
          {/* Week header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[rgb(107,85,64)] tracking-wide">
              {weekDays[0].dateStr} – {weekDays[weekDays.length - 1].dateStr}
            </span>
            <button
              onClick={handleArchiveWeek}
              disabled={archiving}
              className="flex items-center gap-1 text-xs text-[rgb(120,120,120)] hover:text-[rgb(107,85,64)] transition-colors disabled:opacity-50"
            >
              <Archive className="w-3 h-3" />
              {archiving ? "Archiving..." : "Archive Week"}
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[44px_1fr_1fr_1fr_34px] gap-1.5 px-1 mb-1">
            {["Day", "Sales ($)", "Labor ($)", "Hrs", ""].map((h, i) => (
              <span key={i} className="text-[10px] text-[rgb(150,150,150)] font-semibold">{h}</span>
            ))}
          </div>

          {/* Day rows */}
          <div className="flex flex-col gap-1.5">
            {weekDays.map(({ dateStr, label }) => {
              const isDirty = !!editing[dateStr] && Object.values(editing[dateStr]).some((v) => v !== "");
              return (
                <div key={dateStr} className="grid grid-cols-[44px_1fr_1fr_1fr_34px] gap-1.5 items-center">
                  <span className="text-xs font-medium text-[rgb(45,45,45)]">{label}</span>
                  {["sales", "labor", "laborHours"].map((field) => (
                    <input
                      key={field}
                      type="number"
                      placeholder="0"
                      value={getValue(dateStr, field)}
                      onChange={(e) => handleChange(dateStr, field, e.target.value)}
                      className="w-full text-xs border border-[rgb(235,225,213)] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[rgb(198,182,165)]"
                    />
                  ))}
                  <button
                    onClick={() => handleSaveDay(dateStr)}
                    disabled={!isDirty || saving[dateStr]}
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgb(150,170,155)] text-white disabled:opacity-30 hover:bg-[rgb(130,150,135)] transition-colors"
                    title="Save"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Totals */}
            <div className="grid grid-cols-[44px_1fr_1fr_1fr_34px] gap-1.5 items-center mt-1 pt-2 border-t border-[rgb(235,225,213)]">
              <span className="text-xs font-bold text-[rgb(107,85,64)]">Total</span>
              <span className="text-xs font-bold text-[rgb(45,45,45)] px-2">{fmt$(totals.sales)}</span>
              <span className="text-xs font-bold text-[rgb(45,45,45)] px-2">{fmt$(totals.labor)}</span>
              <span className="text-xs font-bold text-[rgb(45,45,45)] px-2">{totals.laborHours}h</span>
              <span />
            </div>
          </div>

          {/* Catering box */}
          <div className="mt-3 rounded-xl border border-[rgb(235,225,213)] bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[rgb(107,85,64)]">🍽️ Catering</div>
              <button
                onClick={() => setCateringRows(prev => [...prev, { id: Date.now(), label: "", sales: "", labor: "", laborHours: "" }])}
                className="text-[10px] px-2 py-1 rounded-lg border border-[rgb(235,225,213)] text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-colors"
              >
                + Add Event
              </button>
            </div>
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_34px] gap-1.5 px-1 mb-1">
              {["Event", "Sales ($)", "Labor ($)", "Hrs", ""].map((h, i) => (
                <span key={i} className="text-[10px] text-[rgb(150,150,150)] font-semibold">{h}</span>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              {cateringRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[80px_1fr_1fr_1fr_34px] gap-1.5 items-center">
                  <input
                    type="text"
                    placeholder="Name"
                    value={row.label}
                    onChange={(e) => setCateringRows(prev => prev.map(r => r.id === row.id ? { ...r, label: e.target.value } : r))}
                    className="w-full text-xs border border-[rgb(235,225,213)] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[rgb(198,182,165)]"
                  />
                  {["sales", "labor", "laborHours"].map((field) => (
                    <input
                      key={field}
                      type="number"
                      placeholder="0"
                      value={row[field]}
                      onChange={(e) => setCateringRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: e.target.value } : r))}
                      className="w-full text-xs border border-[rgb(235,225,213)] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-[rgb(198,182,165)]"
                    />
                  ))}
                  <button
                    onClick={async () => {
                      const dateKey = `catering-${weekKey}-${row.id}`;
                      const existing = cateringRecords.find(r => r.date === dateKey);
                      const data = { date: dateKey, weekKey, label: row.label, sales: parseFloat(row.sales) || 0, labor: parseFloat(row.labor) || 0, laborHours: parseFloat(row.laborHours) || 0 };
                      if (existing) { await base44.entities.ManualSalesDay.update(existing.id, data); }
                      else { await base44.entities.ManualSalesDay.create(data); }
                      queryClient.invalidateQueries({ queryKey: ["catering-sales-week", weekKey] });
                      setCateringSaved(prev => ({ ...prev, [row.id]: true }));
                      setTimeout(() => setCateringSaved(prev => ({ ...prev, [row.id]: false })), 2000);
                    }}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-white transition-colors ${cateringSaved[row.id] ? "bg-green-500" : "bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"}`}
                    title="Save"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Past weeks toggle */}
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="mt-3 text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)] transition-colors flex items-center gap-1"
          >
            {showArchive ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showArchive ? "Hide" : "Show"} past weeks
          </button>

          {showArchive && (
            <div className="mt-2 flex flex-col gap-2">
              {archivedWeeks.length === 0 ? (
                <p className="text-xs text-[rgb(150,150,150)]">No archived weeks yet.</p>
              ) : (
                archivedWeeks.map((week) => <WeekArchiveCard key={week.id} week={week} />)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
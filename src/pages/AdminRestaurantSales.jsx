import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, RefreshCw, ExternalLink, PlusCircle, X } from "lucide-react";
import PageHelpBanner from "@/components/PageHelpBanner";

const HELP_CONTENT = `Daily and weekly restaurant sales & labor reporting, synced from Toast POS.

1. Sync Today: Click "Sync Today" in the header to pull latest data from Toast. If Toast is still compiling, try again in 30-60 seconds.
2. Manual Entry: Click "Enter Data" to manually enter Net Sales, Labor Cost, and Labor Hours for any date.
3. Today Panel: Shows today's net sales, labor cost, labor hours, and labor % at a glance.
4. This Week Panel: Running week totals from the most recent Monday.
5. Daily Breakdown: Last 30 days of history. Rows are color-highlighted for today.
6. Open Toast: Jumps directly to Toast admin for full POS reporting, menu changes, and timeclock.

A healthy restaurant runs labor at 28-32% of net sales. Flag anything above 35% for Whitney's review.`;

function todayStrLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmt(n) {
  if (n == null || isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtPct(sales, labor) {
  if (!sales || !labor) return "—";
  return `${((labor / sales) * 100).toFixed(1)}%`;
}

export default function AdminRestaurantSales() {
  const todayStr = useMemo(() => todayStrLocal(), []);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncError, setSyncError] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ businessDate: todayStr, netSales: "", laborTotalCost: "", laborHours: "" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const weekStart = useMemo(() => {
    const d = new Date();
    const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - diff);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  const { data: allRows = [], refetch } = useQuery({
    queryKey: ["toast-all-summary"],
    queryFn: async () => {
      try {
        return await base44.entities.ToastDailySummary.list("-businessDate", 90);
      } catch { return []; }
    },
  });

  const todayRow = allRows.find(r => r.businessDate === todayStr) ?? null;
  const weekRows = allRows.filter(r => r.businessDate >= weekStart);

  const weekSales = weekRows.reduce((s, r) => s + (r.netSales || 0), 0);
  const weekLabor = weekRows.reduce((s, r) => s + (r.laborTotalCost || 0), 0);
  const weekHours = weekRows.reduce((s, r) => s + (r.laborHours || 0), 0);

  async function saveManual() {
    setSaving(true);
    const payload = {
      businessDate: manualForm.businessDate,
      netSales: Number(manualForm.netSales) || 0,
      laborTotalCost: Number(manualForm.laborTotalCost) || 0,
      laborHours: Number(manualForm.laborHours) || 0,
      salesPerLaborHour: Number(manualForm.laborHours) > 0 ? Number((Number(manualForm.netSales) / Number(manualForm.laborHours)).toFixed(2)) : 0,
      updatedAt: new Date().toISOString(),
    };
    const existing = await base44.entities.ToastDailySummary.filter({ businessDate: manualForm.businessDate });
    if (existing?.[0]?.id) {
      await base44.entities.ToastDailySummary.update(existing[0].id, payload);
    } else {
      await base44.entities.ToastDailySummary.create(payload);
    }
    await queryClient.invalidateQueries({ queryKey: ["toast-all-summary"] });
    setSaving(false);
    setShowManual(false);
    setManualForm({ businessDate: todayStr, netSales: "", laborTotalCost: "", laborHours: "" });
  }

  async function syncToday() {
    setSyncing(true);
    setSyncMsg("");
    setSyncError(null);
    try {
      const res = await base44.functions.invoke("toast_sync_today_summary", { date: todayStr });
      await refetch();
      if (res.data?.pending) {
        setSyncMsg("⏳ Toast is preparing the report — try again in 30–60s.");
      } else if (res.data?.ok) {
        setSyncMsg(`✅ Synced — Sales ${fmt(res.data.netSales)}, Labor ${fmt(res.data.laborTotalCost)}`);
      } else {
        setSyncError(res.data?.error || JSON.stringify(res.data));
      }
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  const StatCard = ({ label, value, sub, highlight }) => (
    <div className={`rounded-2xl border p-5 ${highlight ? "border-[rgb(196,155,145)] bg-[rgb(255,250,248)]" : "border-[rgb(235,225,213)] bg-white"}`}>
      <p className="text-xs text-[rgb(150,150,150)] mb-1">{label}</p>
      <p className="text-2xl font-light text-[rgb(45,45,45)]">{value}</p>
      {sub && <p className="text-xs text-[rgb(150,150,150)] mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("AdminDashboard")} className="text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Sales & Labor</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.toasttab.com/restaurants/admin/home"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(255,82,33)] text-white text-sm hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              Open Toast
            </a>
            <button
              onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)] transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Enter Data
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">

        {/* Manual Entry Modal */}
        {showManual && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-light text-[rgb(107,85,64)]">Enter Sales Data</h2>
                <button onClick={() => setShowManual(false)}><X className="w-5 h-5 text-[rgb(150,150,150)]" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[rgb(150,150,150)] block mb-1">Date</label>
                  <input type="date" value={manualForm.businessDate} onChange={e => setManualForm(f => ({ ...f, businessDate: e.target.value }))} className="w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[rgb(150,150,150)] block mb-1">Net Sales ($)</label>
                  <input type="number" placeholder="0.00" value={manualForm.netSales} onChange={e => setManualForm(f => ({ ...f, netSales: e.target.value }))} className="w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[rgb(150,150,150)] block mb-1">Labor Cost ($)</label>
                  <input type="number" placeholder="0.00" value={manualForm.laborTotalCost} onChange={e => setManualForm(f => ({ ...f, laborTotalCost: e.target.value }))} className="w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-[rgb(150,150,150)] block mb-1">Labor Hours</label>
                  <input type="number" placeholder="0.0" value={manualForm.laborHours} onChange={e => setManualForm(f => ({ ...f, laborHours: e.target.value }))} className="w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowManual(false)} className="flex-1 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)]">Cancel</button>
                <button onClick={saveManual} disabled={saving} className="flex-1 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {syncMsg && (
          <div className="text-sm text-[rgb(120,120,120)] bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3">
            {syncMsg}
          </div>
        )}

        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-red-600 mb-1">Sync Error</p>
            <pre className="text-xs text-red-700 whitespace-pre-wrap break-all">{syncError}</pre>
          </div>
        )}

        {/* Today */}
        <section>
          <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-3">TODAY · {todayStr}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Net Sales" value={fmt(todayRow?.netSales)} highlight />
            <StatCard label="Labor Cost" value={fmt(todayRow?.laborTotalCost)} highlight />
            <StatCard label="Labor Hours" value={todayRow?.laborHours ? `${Number(todayRow.laborHours).toFixed(1)}h` : "—"} />
            <StatCard label="Labor %" value={fmtPct(todayRow?.netSales, todayRow?.laborTotalCost)} sub="cost / sales" />
          </div>
        </section>

        {/* This Week */}
        <section>
          <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-3">THIS WEEK · since {weekStart}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Net Sales" value={fmt(weekSales)} highlight />
            <StatCard label="Labor Cost" value={fmt(weekLabor)} highlight />
            <StatCard label="Labor Hours" value={weekHours ? `${weekHours.toFixed(1)}h` : "—"} />
            <StatCard label="Labor %" value={fmtPct(weekSales, weekLabor)} sub="cost / sales" />
          </div>
        </section>

        {/* Daily breakdown */}
        <section>
          <p className="text-xs tracking-widest font-medium text-[rgb(150,150,150)] mb-3">DAILY BREAKDOWN</p>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(235,225,213)]">
                  <th className="text-left px-4 py-3 text-xs text-[rgb(150,150,150)] font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-xs text-[rgb(150,150,150)] font-medium">Net Sales</th>
                  <th className="text-right px-4 py-3 text-xs text-[rgb(150,150,150)] font-medium">Labor $</th>
                  <th className="text-right px-4 py-3 text-xs text-[rgb(150,150,150)] font-medium hidden sm:table-cell">Labor Hrs</th>
                  <th className="text-right px-4 py-3 text-xs text-[rgb(150,150,150)] font-medium hidden sm:table-cell">Labor %</th>
                </tr>
              </thead>
              <tbody>
                {allRows.slice(0, 30).map((row, i) => (
                  <tr key={row.id} className={`border-b border-[rgb(235,225,213)] last:border-0 ${row.businessDate === todayStr ? "bg-[rgb(255,250,248)]" : i % 2 === 0 ? "" : "bg-[rgb(250,248,246)]"}`}>
                    <td className="px-4 py-3 text-[rgb(45,45,45)]">{row.businessDate}</td>
                    <td className="px-4 py-3 text-right text-[rgb(45,45,45)]">{fmt(row.netSales)}</td>
                    <td className="px-4 py-3 text-right text-[rgb(45,45,45)]">{fmt(row.laborTotalCost)}</td>
                    <td className="px-4 py-3 text-right text-[rgb(120,120,120)] hidden sm:table-cell">{row.laborHours ? `${Number(row.laborHours).toFixed(1)}h` : "—"}</td>
                    <td className="px-4 py-3 text-right text-[rgb(120,120,120)] hidden sm:table-cell">{fmtPct(row.netSales, row.laborTotalCost)}</td>
                  </tr>
                ))}
                {allRows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[rgb(150,150,150)]">No data yet — tap Sync Today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
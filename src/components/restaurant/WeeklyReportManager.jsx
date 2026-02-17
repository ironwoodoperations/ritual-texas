import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, startOfWeek, endOfWeek } from 'date-fns';

function calcReport(data) {
  const sales = data.total_sales || 0;
  const food_cost_percent = sales > 0 ? Math.round((data.food_cost / sales) * 100 * 10) / 10 : 0;
  const labor_percent = sales > 0 ? Math.round((data.labor_cost / sales) * 100 * 10) / 10 : 0;
  const net_profit = sales - (data.food_cost || 0) - (data.labor_cost || 0) - (data.other_expenses || 0);
  return { food_cost_percent, labor_percent, net_profit };
}

const BLANK = {
  week_start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  week_end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  total_sales: 0, food_cost: 0, labor_cost: 0, other_expenses: 0, covers: 0, notes: ''
};

export default function WeeklyReportManager() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);

  const { data: reports = [] } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: () => base44.entities.WeeklyReport.list('-week_start', 52)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const calc = calcReport(data);
      const payload = { ...data, ...calc };
      return editing
        ? base44.entities.WeeklyReport.update(editing.id, payload)
        : base44.entities.WeeklyReport.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['weekly-reports']); reset(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WeeklyReport.delete(id),
    onSuccess: () => qc.invalidateQueries(['weekly-reports'])
  });

  const reset = () => { setForm(BLANK); setEditing(null); setShowDialog(false); };
  const startEdit = (r) => { setEditing(r); setForm({ ...r }); setShowDialog(true); };

  const preview = calcReport(form);

  const MetricBadge = ({ label, value, good, warn, bad }) => {
    const color = value <= good ? '#16a34a' : value <= warn ? '#d97706' : '#dc2626';
    return (
      <div style={{ textAlign: 'center', padding: '10px 14px', background: `${color}15`, borderRadius: '8px', border: `1px solid ${color}40` }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}%</div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{label}</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#3B4831' }}>Weekly Reports</h2>
        <Button onClick={() => setShowDialog(true)} style={{ background: '#C57C5D', color: '#FCF9F4' }}>
          <Plus className="w-4 h-4 mr-2" /> New Week
        </Button>
      </div>

      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888', background: '#FCF9F4', borderRadius: '12px' }}>
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No weekly reports yet. Add your first week above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => {
            const margin = r.total_sales > 0 ? Math.round((r.net_profit / r.total_sales) * 100) : 0;
            return (
              <div key={r.id} style={{ background: '#FCF9F4', borderRadius: '12px', padding: '20px', border: '1px solid rgba(59,72,49,.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#3B4831', fontSize: '16px' }}>
                      {r.week_start} → {r.week_end}
                    </div>
                    {r.covers > 0 && <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{r.covers} covers · ${r.total_sales > 0 && r.covers > 0 ? (r.total_sales / r.covers).toFixed(2) : '—'}/cover</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="outline" size="sm" onClick={() => startEdit(r)}><Edit className="w-3 h-3" /></Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(59,72,49,.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#3B4831' }}>${(r.total_sales || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Total Sales</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(59,72,49,.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#C57C5D' }}>${(r.food_cost || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Food Cost</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(59,72,49,.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#555' }}>${(r.labor_cost || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Labor</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: r.net_profit >= 0 ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)', borderRadius: '8px', border: `1px solid ${r.net_profit >= 0 ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}` }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: r.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>${(r.net_profit || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Net Profit</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: (r.food_cost_percent || 0) <= 32 ? 'rgba(22,163,74,.08)' : (r.food_cost_percent || 0) <= 38 ? 'rgba(217,119,6,.08)' : 'rgba(220,38,38,.08)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: (r.food_cost_percent || 0) <= 32 ? '#16a34a' : (r.food_cost_percent || 0) <= 38 ? '#d97706' : '#dc2626' }}>{r.food_cost_percent || 0}%</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Food Cost %</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', background: (r.labor_percent || 0) <= 30 ? 'rgba(22,163,74,.08)' : (r.labor_percent || 0) <= 38 ? 'rgba(217,119,6,.08)' : 'rgba(220,38,38,.08)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: (r.labor_percent || 0) <= 30 ? '#16a34a' : (r.labor_percent || 0) <= 38 ? '#d97706' : '#dc2626' }}>{r.labor_percent || 0}%</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Labor %</div>
                  </div>
                </div>
                {r.notes && <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>📝 {r.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={open => { if (!open) reset(); }}>
        <DialogContent style={{ maxWidth: '540px' }}>
          <DialogHeader><DialogTitle>{editing ? 'Edit Week' : 'Add Weekly Report'}</DialogTitle></DialogHeader>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Week Start</label>
                <Input type="date" value={form.week_start} onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Week End</label>
                <Input type="date" value={form.week_end} onChange={e => setForm(f => ({ ...f, week_end: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Total Sales ($)</label>
                <Input type="number" step="0.01" value={form.total_sales} onChange={e => setForm(f => ({ ...f, total_sales: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Covers (guests)</label>
                <Input type="number" value={form.covers} onChange={e => setForm(f => ({ ...f, covers: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Food Cost ($)</label>
                <Input type="number" step="0.01" value={form.food_cost} onChange={e => setForm(f => ({ ...f, food_cost: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Labor ($)</label>
                <Input type="number" step="0.01" value={form.labor_cost} onChange={e => setForm(f => ({ ...f, labor_cost: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Other ($)</label>
                <Input type="number" step="0.01" value={form.other_expenses} onChange={e => setForm(f => ({ ...f, other_expenses: parseFloat(e.target.value) || 0 }))} /></div>
            </div>

            {/* Live preview */}
            {form.total_sales > 0 && (
              <div style={{ background: 'rgba(59,72,49,.06)', borderRadius: '10px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <MetricBadge label="Food Cost %" value={preview.food_cost_percent} good={32} warn={38} />
                <MetricBadge label="Labor %" value={preview.labor_percent} good={30} warn={38} />
                <div style={{ textAlign: 'center', padding: '10px 14px', background: preview.net_profit >= 0 ? '#16a34a15' : '#dc262615', borderRadius: '8px', border: `1px solid ${preview.net_profit >= 0 ? '#16a34a40' : '#dc262640'}` }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: preview.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>${preview.net_profit.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Net Profit</div>
                </div>
              </div>
            )}

            <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes for this week..." /></div>
            <Button onClick={() => saveMutation.mutate(form)} style={{ background: '#3B4831', color: '#FCF9F4' }}>
              {saveMutation.isPending ? 'Saving…' : (editing ? 'Update Report' : 'Save Report')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricBadge({ label, value, good, warn }) {
  const color = value <= good ? '#16a34a' : value <= warn ? '#d97706' : '#dc2626';
  return (
    <div style={{ textAlign: 'center', padding: '10px 14px', background: `${color}15`, borderRadius: '8px', border: `1px solid ${color}40` }}>
      <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}%</div>
      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
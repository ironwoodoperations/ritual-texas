import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ['proteins', 'produce', 'dry_goods', 'dairy', 'alcohol', 'paper_disposables', 'other'];

const BLANK = { name: '', category: 'other', unit: '', current_stock: 0, par_level: 0, unit_cost: 0, vendor: '', notes: '', is_active: true };

export default function InventoryManager() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [filterCat, setFilterCat] = useState('all');

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }, 'category')
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.InventoryItem.update(editing.id, data)
      : base44.entities.InventoryItem.create(data),
    onSuccess: () => { qc.invalidateQueries(['inventory-items']); reset(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.update(id, { is_active: false }),
    onSuccess: () => qc.invalidateQueries(['inventory-items'])
  });

  const updateStock = useMutation({
    mutationFn: ({ id, current_stock }) => base44.entities.InventoryItem.update(id, { current_stock }),
    onSuccess: () => qc.invalidateQueries(['inventory-items'])
  });

  const reset = () => { setForm(BLANK); setEditing(null); setShowDialog(false); };

  const startEdit = (item) => { setEditing(item); setForm({ ...item }); setShowDialog(true); };

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);
  const lowStock = items.filter(i => i.par_level > 0 && i.current_stock <= i.par_level);

  return (
    <div>
      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: '#FFF3CD', border: '1px solid #FFC107', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <span style={{ fontWeight: 700, color: '#92400E' }}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} low on stock: </span>
            <span style={{ color: '#92400E', fontSize: '14px' }}>{lowStock.map(i => i.name).join(', ')}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)} style={{ padding: '6px 14px', background: filterCat === cat ? '#3B4831' : 'transparent', color: filterCat === cat ? '#FCF9F4' : '#3B4831', border: '1px solid #3B4831', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              {cat === 'all' ? 'All' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowDialog(true)} style={{ background: '#C57C5D', color: '#FCF9F4' }}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No inventory items yet. Add your first item above.</p>
        </div>
      ) : (
        <div style={{ background: '#FCF9F4', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(59,72,49,.1)' }}>
                {['Item', 'Category', 'Unit', 'In Stock', 'Par Level', 'Unit Cost', 'Vendor', ''].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#3B4831', fontSize: '13px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const isLow = item.par_level > 0 && item.current_stock <= item.par_level;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(59,72,49,.08)', background: isLow ? 'rgba(255,193,7,.06)' : 'transparent' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#3B4831', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isLow && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        {item.name}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#555', fontSize: '13px' }}>{item.category?.replace('_', ' ')}</td>
                    <td style={{ padding: '12px', color: '#555', fontSize: '13px' }}>{item.unit}</td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        value={item.current_stock ?? 0}
                        onChange={e => updateStock.mutate({ id: item.id, current_stock: parseFloat(e.target.value) || 0 })}
                        style={{ width: '70px', padding: '4px 8px', border: `1px solid ${isLow ? '#FFC107' : 'rgba(59,72,49,.2)'}`, borderRadius: '6px', fontSize: '14px', fontWeight: 600, color: isLow ? '#92400E' : '#3B4831', background: 'transparent' }}
                      />
                    </td>
                    <td style={{ padding: '12px', color: '#888', fontSize: '13px' }}>{item.par_level || '—'}</td>
                    <td style={{ padding: '12px', color: '#C57C5D', fontWeight: 600 }}>{item.unit_cost > 0 ? `$${item.unit_cost}` : '—'}</td>
                    <td style={{ padding: '12px', color: '#555', fontSize: '13px' }}>{item.vendor || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Button variant="outline" size="sm" onClick={() => startEdit(item)}><Edit className="w-3 h-3" /></Button>
                        <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={open => { if (!open) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle></DialogHeader>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Unit *</label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="oz, lb, case..." /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>In Stock</label>
                <Input type="number" step="0.1" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Par Level</label>
                <Input type="number" step="0.1" value={form.par_level} onChange={e => setForm(f => ({ ...f, par_level: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Unit Cost ($)</label>
                <Input type="number" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '13px' }}>Vendor</label>
              <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} /></div>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.unit} style={{ background: '#3B4831', color: '#FCF9F4' }}>
              {saveMutation.isPending ? 'Saving…' : (editing ? 'Update' : 'Add Item')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
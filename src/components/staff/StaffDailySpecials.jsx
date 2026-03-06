import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Soup, UtensilsCrossed } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ['Lunch', 'Dinner', 'Bar', 'Dessert', 'Other'];

function SpecialCard({ special, onToggle, onEdit }) {
  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${special.isActiveToday ? 'border-[rgb(107,85,64)] shadow-sm' : 'border-[rgb(235,225,213)]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {special.isSoup ? (
              <Soup className="w-4 h-4 text-[rgb(150,170,155)] flex-shrink-0" />
            ) : (
              <UtensilsCrossed className="w-4 h-4 text-[rgb(196,155,145)] flex-shrink-0" />
            )}
            <span className="font-semibold text-[rgb(107,85,64)] truncate">{special.title}</span>
            {special.category && !special.isSoup && (
              <span className="text-xs px-2 py-0.5 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] rounded-full">{special.category}</span>
            )}
            {special.isSoup && (
              <span className="text-xs px-2 py-0.5 bg-[rgb(198,182,165)] text-white rounded-full">Daily Soup</span>
            )}
          </div>
          {special.description && (
            <p className="text-sm text-[rgb(45,45,45)] leading-relaxed">{special.description}</p>
          )}
          {special.price != null && (
            <p className="text-sm font-bold text-[rgb(107,85,64)] mt-1">${Number(special.price).toFixed(2)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[rgb(45,45,45)]">Active</span>
          <Switch
            checked={!!special.isActiveToday}
            onCheckedChange={(checked) => onToggle(special.id, checked)}
          />
          <button
            onClick={() => onEdit(special)}
            className="p-1.5 rounded-lg border border-[rgb(235,225,213)] hover:bg-[rgb(235,225,213)] transition-colors"
          >
            <Edit className="w-4 h-4 text-[rgb(107,85,64)]" />
          </button>
        </div>
      </div>
      {special.isActiveToday && (
        <div className="mt-2 text-xs font-semibold text-[rgb(150,170,155)]">✓ ON MENU TODAY</div>
      )}
    </div>
  );
}

function SpecialForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    price: initial?.price != null ? String(initial.price) : '',
    category: initial?.category || 'Lunch',
    isActiveToday: initial?.isActiveToday || false,
    isSoup: initial?.isSoup || false,
    soupName: initial?.soupName || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      price: form.price ? parseFloat(form.price) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-[rgb(248,246,242)] rounded-lg">
        <Switch checked={form.isSoup} onCheckedChange={v => setForm(f => ({ ...f, isSoup: v }))} />
        <label className="text-sm font-medium text-[rgb(107,85,64)]">This is a daily soup</label>
      </div>

      {!form.isSoup && (
        <div>
          <label className="block text-sm font-medium mb-1 text-[rgb(107,85,64)]">Category</label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="border-[rgb(235,225,213)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-[rgb(107,85,64)]">
          {form.isSoup ? 'Soup Name *' : 'Title *'}
        </label>
        <Input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
          className="border-[rgb(235,225,213)]"
          placeholder={form.isSoup ? 'e.g. Tomato Basil Bisque' : 'e.g. Pan-Seared Salmon'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-[rgb(107,85,64)]">Description *</label>
        <Textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          required
          rows={2}
          className="border-[rgb(235,225,213)]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 text-[rgb(107,85,64)]">Price (optional)</label>
        <Input
          type="number"
          step="0.01"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          className="border-[rgb(235,225,213)]"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.isActiveToday} onCheckedChange={v => setForm(f => ({ ...f, isActiveToday: v }))} />
        <label className="text-sm font-medium text-[rgb(107,85,64)]">Active Today</label>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)]">
          {initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

export default function StaffDailySpecials() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Lunch');

  const { data: specials = [] } = useQuery({
    queryKey: ['staff-specials'],
    queryFn: () => base44.entities.RestaurantDailySpecials.filter({ isArchived: false }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RestaurantDailySpecials.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-specials'] }); setShowDialog(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantDailySpecials.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-specials'] }); setShowDialog(false); setEditingItem(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActiveToday }) => base44.entities.RestaurantDailySpecials.update(id, { isActiveToday }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-specials'] }),
  });

  // Soups always shown separately
  const soups = specials.filter(s => s.isSoup);
  // Specials by category
  const catSpecials = specials.filter(s => !s.isSoup && (activeCategory === 'all' || s.category === activeCategory));

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowDialog(true);
  };

  const handleSave = (form) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[rgb(107,85,64)]">Daily Specials & Soup</h2>
        <Button
          onClick={() => { setEditingItem(null); setShowDialog(true); }}
          className="bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)] text-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* Active today summary */}
      {specials.some(s => s.isActiveToday) && (
        <div className="bg-[rgb(235,225,213)] rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] mb-2 font-semibold">On the menu today</p>
          <div className="space-y-1">
            {specials.filter(s => s.isActiveToday).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-[rgb(45,45,45)]">
                {s.isSoup ? <Soup className="w-3.5 h-3.5 text-[rgb(150,170,155)]" /> : <UtensilsCrossed className="w-3.5 h-3.5 text-[rgb(196,155,145)]" />}
                <span className="font-medium">{s.title}</span>
                {s.price != null && <span className="text-[rgb(107,85,64)]">${Number(s.price).toFixed(2)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Soup section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Soup className="w-5 h-5 text-[rgb(150,170,155)]" />
          <h3 className="font-medium text-[rgb(107,85,64)]">Daily Soup</h3>
        </div>
        {soups.length === 0 ? (
          <div className="text-sm text-[rgb(45,45,45)] p-4 bg-white rounded-xl border border-dashed border-[rgb(235,225,213)] text-center">
            No soup added yet —{' '}
            <button
              className="underline text-[rgb(107,85,64)]"
              onClick={() => { setEditingItem(null); setShowDialog(true); }}
            >
              add one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {soups.map(s => (
              <SpecialCard
                key={s.id}
                special={s}
                onToggle={(id, v) => toggleMutation.mutate({ id, isActiveToday: v })}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Category tabs for specials */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <UtensilsCrossed className="w-5 h-5 text-[rgb(196,155,145)]" />
          <h3 className="font-medium text-[rgb(107,85,64)]">Specials</h3>
        </div>
        <div className="flex gap-2 flex-wrap mb-4">
          {['Lunch', 'Dinner', 'Bar', 'Dessert', 'Other'].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-sm rounded-full border transition-all ${activeCategory === cat ? 'bg-[rgb(107,85,64)] text-white border-[rgb(107,85,64)]' : 'bg-white text-[rgb(107,85,64)] border-[rgb(235,225,213)] hover:bg-[rgb(235,225,213)]'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        {catSpecials.length === 0 ? (
          <div className="text-sm text-[rgb(45,45,45)] p-4 bg-white rounded-xl border border-dashed border-[rgb(235,225,213)] text-center">
            No {activeCategory} specials yet.
          </div>
        ) : (
          <div className="space-y-3">
            {catSpecials
              .sort((a, b) => (b.isActiveToday ? 1 : 0) - (a.isActiveToday ? 1 : 0))
              .map(s => (
                <SpecialCard
                  key={s.id}
                  special={s}
                  onToggle={(id, v) => toggleMutation.mutate({ id, isActiveToday: v })}
                  onEdit={handleEdit}
                />
              ))
            }
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={open => { if (!open) { setShowDialog(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[rgb(107,85,64)]">{editingItem ? 'Edit' : 'Create'} Special</DialogTitle>
          </DialogHeader>
          <SpecialForm
            initial={editingItem}
            onClose={() => { setShowDialog(false); setEditingItem(null); }}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES = ['starters','salads','entrees','sides','desserts','bar_packages','add_ons','chef_specials'];
const ING_CATS = ['proteins','produce','dry_goods','dairy','alcohol','paper_disposables','rentals','other'];

const blank = {
  name: '', category: 'entrees', description: '', base_price: 0,
  serving_size: 1, unit: 'per person', ingredients: [], prep_notes: '',
  margin_percent: 30, is_active: true, sort_order: 0
};

export default function AdminCateringMenu() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catering-menu-items'],
    queryFn: () => base44.entities.CateringMenuItem.list('sort_order', 200)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.CateringMenuItem.update(editing.id, data)
      : base44.entities.CateringMenuItem.create(data),
    onSuccess: () => { qc.invalidateQueries(['catering-menu-items']); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CateringMenuItem.delete(id),
    onSuccess: () => qc.invalidateQueries(['catering-menu-items'])
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.CateringMenuItem.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries(['catering-menu-items'])
  });

  const resetForm = () => { setForm(blank); setEditing(null); };

  const startEdit = (item) => { setEditing(item); setForm({ ...item }); };

  const addIngredient = () => {
    setForm(f => ({ ...f, ingredients: [...(f.ingredients || []), { name: '', qty_per_serving: 1, unit: 'oz', category: 'produce', cost_per_unit: 0, vendor: '' }] }));
  };

  const updateIngredient = (idx, field, value) => {
    setForm(f => {
      const ings = [...(f.ingredients || [])];
      ings[idx] = { ...ings[idx], [field]: value };
      return { ...f, ingredients: ings };
    });
  };

  const removeIngredient = (idx) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  const S = {
    page: { minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif" },
    header: { background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '28px 32px' },
    label: { display: 'block', color: '#C6A85E', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '6px', fontFamily: 'sans-serif' },
    input: { width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' },
    btn: { padding: '10px 20px', background: '#C6A85E', color: '#0C1C2C', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
    btnOutline: { padding: '10px 20px', background: 'transparent', color: '#C6A85E', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }
  };

  return (
    <div style={{ ...S.page, overflowX: 'hidden' }}>
      <div style={S.header}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#C6A85E', fontSize: '12px', letterSpacing: '3px', margin: '0 0 6px', fontFamily: 'sans-serif' }}>CATERING</p>
          <h1 style={{ color: '#F5F0E8', fontSize: '32px', fontWeight: 300, margin: 0 }}>Menu Manager</h1>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '28px', alignItems: 'start' }}>
        {/* Left: grouped list */}
        <div>
          {CATEGORIES.map(cat => {
            const catItems = grouped[cat] || [];
            if (catItems.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: '24px' }}>
                <h3 style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>
                  {cat.replace('_', ' ').toUpperCase()}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ background: editing?.id === item.id ? 'rgba(198,168,94,.08)' : 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ color: '#F5F0E8', fontWeight: 600 }}>{item.name}</span>
                          <span style={{ color: '#C6A85E', fontSize: '13px', marginLeft: '10px' }}>${item.base_price}</span>
                          <span style={{ color: '#9AA8B5', fontSize: '12px', marginLeft: '8px' }}>{item.unit}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#9AA8B5' }}>
                            {expandedId === item.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={() => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#9AA8B5' }}>
                            {item.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                          <button onClick={() => startEdit(item)} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#C6A85E' }}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }} style={{ padding: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {expandedId === item.id && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(198,168,94,.1)' }}>
                          {item.description && <p style={{ color: '#9AA8B5', fontSize: '13px', margin: '10px 0 6px' }}>{item.description}</p>}
                          {item.prep_notes && <p style={{ color: '#C6A85E', fontSize: '12px', margin: '4px 0' }}>📋 {item.prep_notes}</p>}
                          {item.ingredients?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              <p style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px', fontFamily: 'sans-serif' }}>INGREDIENTS</p>
                              {item.ingredients.map((ing, i) => (
                                <div key={i} style={{ fontSize: '12px', color: '#D4C9B8', marginBottom: '2px' }}>
                                  • {ing.name} — {ing.qty_per_serving} {ing.unit}/serving {ing.cost_per_unit ? `($${ing.cost_per_unit}/${ing.unit})` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {items.length === 0 && !isLoading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9AA8B5' }}>
              <p>No menu items yet. Create one →</p>
            </div>
          )}
        </div>

        {/* Right: form */}
        <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', padding: '28px', position: 'sticky', top: '24px' }}>
          <h2 style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 300, margin: '0 0 24px' }}>
            {editing ? 'Edit Item' : 'Add Menu Item'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={S.label}>ITEM NAME *</label>
              <input style={S.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={S.label}>CATEGORY</label>
                <select style={S.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>UNIT</label>
                <input style={S.input} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="per person, per tray..." />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={S.label}>BASE PRICE ($)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label style={S.label}>SERVES</label>
                <input style={S.input} type="number" min="1" value={form.serving_size} onChange={e => setForm(f => ({ ...f, serving_size: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label style={S.label}>MARGIN %</label>
                <input style={S.input} type="number" min="0" max="100" value={form.margin_percent} onChange={e => setForm(f => ({ ...f, margin_percent: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <label style={S.label}>DESCRIPTION</label>
              <textarea style={{ ...S.input, height: '70px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label style={S.label}>PREP NOTES</label>
              <textarea style={{ ...S.input, height: '60px', resize: 'vertical' }} value={form.prep_notes} onChange={e => setForm(f => ({ ...f, prep_notes: e.target.value }))} />
            </div>

            {/* Ingredients */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...S.label, margin: 0 }}>INGREDIENTS</label>
                <button onClick={addIngredient} style={{ ...S.btnOutline, padding: '5px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={12} /> Add
                </button>
              </div>
              {(form.ingredients || []).map((ing, idx) => (
                <div key={idx} style={{ background: 'rgba(0,0,0,.2)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} placeholder="Ingredient name" value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} />
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} placeholder="Qty/serving" type="number" step="0.01" value={ing.qty_per_serving} onChange={e => updateIngredient(idx, 'qty_per_serving', parseFloat(e.target.value) || 0)} />
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} placeholder="Unit (oz, lb...)" value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <select style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} value={ing.category} onChange={e => updateIngredient(idx, 'category', e.target.value)}>
                      {ING_CATS.map(c => <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, x => x.toUpperCase())}</option>)}
                    </select>
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} placeholder="Cost/unit $" type="number" step="0.01" value={ing.cost_per_unit} onChange={e => updateIngredient(idx, 'cost_per_unit', parseFloat(e.target.value) || 0)} />
                    <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} placeholder="Vendor" value={ing.vendor} onChange={e => updateIngredient(idx, 'vendor', e.target.value)} />
                    <button onClick={() => removeIngredient(idx)} style={{ padding: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <span style={{ color: '#D4C9B8', fontSize: '14px', fontFamily: 'sans-serif' }}>Active (visible on quotes)</span>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => saveMutation.mutate(form)} disabled={!form.name} style={{ ...S.btn, flex: 1, opacity: !form.name ? 0.5 : 1 }}>
                {saveMutation.isPending ? 'Saving…' : (editing ? 'Update Item' : 'Add Item')}
              </button>
              {editing && <button onClick={resetForm} style={S.btnOutline}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
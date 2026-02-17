import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const slugify = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const blank = {
  slug: '', title: '', subtitle: '', price: 0,
  hero_image_url: '', short_description: '', includes: [],
  fine_print: '', is_active: true, sort_order: 10
};

export default function AdminPackages() {
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [includesText, setIncludesText] = useState('');

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.entities.Package.list('sort_order')
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, includes: includesText.split('\n').map(x => x.trim()).filter(Boolean) };
      if (editing) return base44.entities.Package.update(editing.id, payload);
      return base44.entities.Package.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries(['admin-packages']); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Package.delete(id),
    onSuccess: () => qc.invalidateQueries(['admin-packages'])
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Package.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries(['admin-packages'])
  });

  const moveMutation = useMutation({
    mutationFn: async ({ pkg, direction }) => {
      const sorted = [...packages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const idx = sorted.findIndex(p => p.id === pkg.id);
      const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (neighborIdx < 0 || neighborIdx >= sorted.length) return;
      const neighbor = sorted[neighborIdx];
      const aOrder = pkg.sort_order || 0;
      const bOrder = neighbor.sort_order || 0;
      await Promise.all([
        base44.entities.Package.update(pkg.id, { sort_order: bOrder }),
        base44.entities.Package.update(neighbor.id, { sort_order: aOrder })
      ]);
    },
    onSuccess: () => qc.invalidateQueries(['admin-packages'])
  });

  const resetForm = () => { setForm(blank); setEditing(null); setIncludesText(''); };

  const startEdit = (pkg) => {
    setEditing(pkg);
    setForm({ ...pkg });
    setIncludesText((pkg.includes || []).join('\n'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, slug: form.slug || slugify(form.title) });
  };

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '36px', color: '#3B4831' }}>Packages</h1>
          <Button onClick={resetForm} style={{ background: '#3B4831', color: '#FCF9F4' }}>
            <Plus className="w-4 h-4 mr-2" /> New Package
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px', alignItems: 'start' }}>
          {/* List */}
          <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '24px', border: '1px solid rgba(59,72,49,.1)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#3B4831' }}>All Packages</h2>
            {isLoading ? <p style={{ color: '#3B4831' }}>Loading…</p> : packages.length === 0 ? (
              <p style={{ color: '#6B7B5A', fontSize: '15px' }}>No packages yet. Create one →</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...packages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((pkg, idx, arr) => (
                  <div key={pkg.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(59,72,49,.1)', background: editing?.id === pkg.id ? 'rgba(59,72,49,.06)' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#3B4831', fontSize: '16px' }}>{pkg.title}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#C57C5D', fontWeight: 600 }}>${pkg.price?.toLocaleString()}</p>
                        <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: pkg.is_active ? 'rgba(90,107,71,.15)' : 'rgba(0,0,0,.08)', color: pkg.is_active ? '#3B4831' : '#888' }}>
                          {pkg.is_active ? 'Live' : 'Hidden'}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <button onClick={() => moveMutation.mutate({ pkg, direction: 'up' })} disabled={idx === 0} style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(59,72,49,.2)', borderRadius: '8px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, fontSize: '13px' }}>↑</button>
                          <button onClick={() => moveMutation.mutate({ pkg, direction: 'down' })} disabled={idx === arr.length - 1} style={{ padding: '4px 10px', background: 'none', border: '1px solid rgba(59,72,49,.2)', borderRadius: '8px', cursor: idx === arr.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === arr.length - 1 ? 0.4 : 1, fontSize: '13px' }}>↓</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => toggleMutation.mutate({ id: pkg.id, is_active: !pkg.is_active })} title={pkg.is_active ? 'Hide' : 'Show'} style={{ padding: '6px', background: 'none', border: '1px solid rgba(59,72,49,.2)', borderRadius: '8px', cursor: 'pointer' }}>
                          {pkg.is_active ? <EyeOff className="w-4 h-4" style={{ color: '#3B4831' }} /> : <Eye className="w-4 h-4" style={{ color: '#3B4831' }} />}
                        </button>
                        <button onClick={() => startEdit(pkg)} style={{ padding: '6px', background: 'none', border: '1px solid rgba(59,72,49,.2)', borderRadius: '8px', cursor: 'pointer' }}>
                          <Pencil className="w-4 h-4" style={{ color: '#3B4831' }} />
                        </button>
                        <button onClick={() => { if (confirm('Delete this package?')) deleteMutation.mutate(pkg.id); }} style={{ padding: '6px', background: 'none', border: '1px solid rgba(197,124,93,.3)', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 className="w-4 h-4" style={{ color: '#C57C5D' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ background: '#FCF9F4', borderRadius: '18px', padding: '24px', border: '1px solid rgba(59,72,49,.1)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#3B4831' }}>{editing ? 'Edit Package' : 'Create Package'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Title *</label>
                <Input value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value, slug: slugify(e.target.value) }))} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Slug</label>
                <Input value={form.slug} onChange={e => setForm(s => ({ ...s, slug: slugify(e.target.value) }))} placeholder="auto-generated from title" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Subtitle</label>
                <Input value={form.subtitle || ''} onChange={e => setForm(s => ({ ...s, subtitle: e.target.value }))} placeholder="e.g. Two nights + signature rituals" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Price ($) *</label>
                <Input type="number" min="0" value={form.price || ''} onChange={e => setForm(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Hero Image URL</label>
                <Input value={form.hero_image_url || ''} onChange={e => setForm(s => ({ ...s, hero_image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Short Description</label>
                <Textarea value={form.short_description || ''} onChange={e => setForm(s => ({ ...s, short_description: e.target.value }))} rows={3} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Includes (one per line)</label>
                <Textarea value={includesText} onChange={e => setIncludesText(e.target.value)} rows={6} placeholder={"Two-night stay\nShirodhara (1 hour)\nSwedish massage (1 hour)"} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B', fontSize: '14px' }}>Fine Print / Good to Know</label>
                <Textarea value={form.fine_print || ''} onChange={e => setForm(s => ({ ...s, fine_print: e.target.value }))} rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(s => ({ ...s, is_active: e.target.checked }))} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Active (visible on site)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '14px' }}>Sort order</label>
                  <Input type="number" value={form.sort_order || 0} onChange={e => setForm(s => ({ ...s, sort_order: parseInt(e.target.value) || 0 }))} style={{ width: '80px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <Button type="submit" style={{ background: '#3B4831', color: '#FCF9F4', flex: 1 }}>
                  {saveMutation.isPending ? 'Saving…' : (editing ? 'Update Package' : 'Create Package')}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
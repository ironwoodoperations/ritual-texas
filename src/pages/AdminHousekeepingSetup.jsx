import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle2, Layers } from 'lucide-react';

const CATEGORIES = ['strip','bath','bed','dust','floors','replenish','inspect','trash','final','chemicals','safety','outdoor','general'];

const COMMON_AREA_TEMPLATES = [
  {
    name: 'Pool Area',
    taskType: 'public_space',
    items: [
      { label: 'Test pH and chlorine levels', category: 'chemicals', required: true, active: true },
      { label: 'Skim surface for debris', category: 'inspect', required: true, active: true },
      { label: 'Check pump and filter operation', category: 'inspect', required: true, active: true },
      { label: 'Clean pool deck / surrounding area', category: 'floors', required: true, active: true },
      { label: 'Brush pool steps and walls', category: 'general', required: false, active: true },
      { label: 'Restock pool towels', category: 'replenish', required: true, active: true },
      { label: 'Check and arrange pool furniture', category: 'general', required: true, active: true },
      { label: 'Inspect safety equipment (life ring, etc.)', category: 'safety', required: true, active: true },
      { label: 'Empty trash cans', category: 'trash', required: true, active: true },
      { label: 'Check water temperature', category: 'chemicals', required: true, active: true },
      { label: 'Clean pool gate / latch check', category: 'safety', required: true, active: true },
      { label: 'Wipe down pool signage', category: 'dust', required: false, active: true },
    ],
  },
  {
    name: 'Hot Tub / Jacuzzi',
    taskType: 'public_space',
    items: [
      { label: 'Test chemical levels (pH, bromine/chlorine)', category: 'chemicals', required: true, active: true },
      { label: 'Skim surface and remove debris', category: 'inspect', required: true, active: true },
      { label: 'Clean and wipe down surround / ledge', category: 'general', required: true, active: true },
      { label: 'Wipe jets and interior walls', category: 'general', required: true, active: true },
      { label: 'Check and clean filter', category: 'inspect', required: true, active: true },
      { label: 'Verify water temperature setting', category: 'chemicals', required: true, active: true },
      { label: 'Clean hot tub cover (inside and out)', category: 'general', required: false, active: true },
      { label: 'Restock towels nearby', category: 'replenish', required: true, active: true },
      { label: 'Clean steps and entry area', category: 'floors', required: true, active: true },
      { label: 'Empty trash', category: 'trash', required: true, active: true },
    ],
  },
  {
    name: 'Sauna',
    taskType: 'public_space',
    items: [
      { label: 'Wipe down all benches', category: 'general', required: true, active: true },
      { label: 'Sweep and mop floor', category: 'floors', required: true, active: true },
      { label: 'Check heater operation', category: 'inspect', required: true, active: true },
      { label: 'Inspect sauna rocks', category: 'inspect', required: false, active: true },
      { label: 'Clean and refill water bucket and ladle', category: 'replenish', required: true, active: true },
      { label: 'Restock towels', category: 'replenish', required: true, active: true },
      { label: 'Wipe door handle and glass', category: 'general', required: true, active: true },
      { label: 'Ventilate / air out room', category: 'general', required: true, active: true },
      { label: 'Check temperature set correctly', category: 'inspect', required: true, active: true },
      { label: 'Empty trash', category: 'trash', required: true, active: true },
    ],
  },
  {
    name: 'Grounds / Exterior',
    taskType: 'public_space',
    items: [
      { label: 'Pick up litter and debris (all areas)', category: 'trash', required: true, active: true },
      { label: 'Blow or sweep walkways and paths', category: 'floors', required: true, active: true },
      { label: 'Check and tidy outdoor seating / furniture', category: 'general', required: true, active: true },
      { label: 'Water plants and garden areas', category: 'outdoor', required: false, active: true },
      { label: 'Check all exterior lighting', category: 'inspect', required: true, active: true },
      { label: 'Clean entry / front door area', category: 'general', required: true, active: true },
      { label: 'Check signage is clean and visible', category: 'inspect', required: false, active: true },
      { label: 'Inspect parking area / driveway', category: 'outdoor', required: false, active: true },
      { label: 'Rake gravel, mulch, or garden beds', category: 'outdoor', required: false, active: true },
      { label: 'Check gate latches and fencing', category: 'safety', required: true, active: true },
      { label: 'Remove spider webs from eaves / entry', category: 'general', required: false, active: true },
    ],
  },
  {
    name: 'Lobby / Common Areas',
    taskType: 'public_space',
    items: [
      { label: 'Vacuum or sweep all floors', category: 'floors', required: true, active: true },
      { label: 'Mop hard floors', category: 'floors', required: false, active: true },
      { label: 'Dust surfaces, shelves, and décor', category: 'dust', required: true, active: true },
      { label: 'Wipe down high-touch surfaces (handles, switches)', category: 'general', required: true, active: true },
      { label: 'Clean mirrors and windows', category: 'general', required: true, active: true },
      { label: 'Empty all trash cans', category: 'trash', required: true, active: true },
      { label: 'Restock any amenity baskets', category: 'replenish', required: false, active: true },
      { label: 'Straighten furniture and pillows', category: 'general', required: true, active: true },
      { label: 'Check all lighting is working', category: 'inspect', required: false, active: true },
      { label: 'Clean restrooms (if applicable)', category: 'bath', required: true, active: true },
      { label: 'Restock restroom supplies', category: 'replenish', required: true, active: true },
    ],
  },
];
const S = {
  input: { width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' },
  label: { color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' },
};

export default function AdminHousekeepingSetup() {
  const qc = useQueryClient();
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [saved, setSaved] = useState(false);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', roomType: 'Suite' });
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showNewArea, setShowNewArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaSeed, setNewAreaSeed] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['hk-templates'],
    queryFn: () => base44.entities.HkTemplate.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['hk-rooms'],
    queryFn: () => base44.entities.HkRoom.list('sortOrder', 50),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (t) => base44.entities.HkTemplate.update(t.id, { items: t.items }),
    onSuccess: () => { qc.invalidateQueries(['hk-templates']); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  });

  const addRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.HkRoom.create({ ...data, active: true, sortOrder: rooms.length }),
    onSuccess: () => { qc.invalidateQueries(['hk-rooms']); setNewRoom({ roomNumber: '', roomType: 'Suite' }); setShowAddRoom(false); }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.HkRoom.delete(id),
    onSuccess: () => qc.invalidateQueries(['hk-rooms'])
  });

  const toggleRoomMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.HkRoom.update(id, { active }),
    onSuccess: () => qc.invalidateQueries(['hk-rooms'])
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.HkTemplate.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries(['hk-templates']);
      setActiveTemplate(created.id);
      setShowNewArea(false);
      setNewAreaName('');
      setNewAreaSeed('');
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.HkTemplate.delete(id),
    onSuccess: () => { qc.invalidateQueries(['hk-templates']); setActiveTemplate(null); }
  });

  const handleCreateArea = () => {
    if (!newAreaName.trim()) return;
    const seed = COMMON_AREA_TEMPLATES.find(t => t.name === newAreaSeed);
    createTemplateMutation.mutate({
      name: newAreaName.trim(),
      taskType: 'public_space',
      active: true,
      items: seed ? seed.items.map((item, i) => ({ ...item, sortOrder: i })) : [],
    });
  };

  const handleAddPreset = (preset) => {
    // Check if already exists
    if (templates.some(t => t.name === preset.name)) return;
    createTemplateMutation.mutate({
      name: preset.name,
      taskType: 'public_space',
      active: true,
      items: preset.items.map((item, i) => ({ ...item, sortOrder: i })),
    });
  };

  const template = templates.find(t => t.id === activeTemplate);

  const addItem = () => {
    const items = [...(template.items || []), { category: 'final', label: '', required: true, qtyExpected: null, sortOrder: template.items?.length || 0 }];
    saveTemplateMutation.mutate({ ...template, items });
    qc.setQueryData(['hk-templates'], old => old.map(t => t.id === template.id ? { ...t, items } : t));
  };

  const updateItem = (idx, field, value) => {
    const items = [...template.items];
    items[idx] = { ...items[idx], [field]: value };
    qc.setQueryData(['hk-templates'], old => old.map(t => t.id === template.id ? { ...t, items } : t));
  };

  const removeItem = (idx) => {
    const items = template.items.filter((_, i) => i !== idx);
    qc.setQueryData(['hk-templates'], old => old.map(t => t.id === template.id ? { ...t, items } : t));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", color: '#F5F0E8' }}>
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '16px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link to={createPageUrl('AdminHousekeeping')} style={{ color: '#9AA8B5', display: 'flex' }}><ArrowLeft size={20} /></Link>
            <h1 style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 300, margin: 0 }}>Housekeeping Setup</h1>
          </div>
          {template && (
            <button onClick={() => saveTemplateMutation.mutate(template)} style={{ padding: '8px 18px', background: saved ? '#4CAF50' : '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saved ? <><CheckCircle2 size={14} /> Saved!</> : <><Save size={14} /> Save Template</>}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Sidebar */}
        <div>
          <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>TEMPLATES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {templates.filter(t => t.taskType !== 'public_space').map(t => (
              <button key={t.id} onClick={() => setActiveTemplate(t.id)} style={{ padding: '10px 14px', borderRadius: '8px', border: activeTemplate === t.id ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.15)', background: activeTemplate === t.id ? 'rgba(198,168,94,.1)' : 'transparent', color: activeTemplate === t.id ? '#C6A85E' : '#9AA8B5', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontFamily: 'sans-serif' }}>
                {t.name}
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{t.items?.length || 0} items</div>
              </button>
            ))}
          </div>

          {/* Common Areas Section */}
          <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '20px 0 10px', fontFamily: 'sans-serif' }}>COMMON AREAS</p>
          {/* Existing public_space templates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {templates.filter(t => t.taskType === 'public_space').map(t => (
              <button key={t.id} onClick={() => setActiveTemplate(t.id)} style={{ padding: '10px 14px', borderRadius: '8px', border: activeTemplate === t.id ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.15)', background: activeTemplate === t.id ? 'rgba(198,168,94,.1)' : 'transparent', color: activeTemplate === t.id ? '#C6A85E' : '#9AA8B5', cursor: 'pointer', textAlign: 'left', fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div>{t.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{t.items?.length || 0} items</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${t.name}"?`)) deleteTemplateMutation.mutate(t.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D', padding: '2px', opacity: 0.6 }}><Trash2 size={12} /></button>
              </button>
            ))}
          </div>
          {/* Preset suggestions */}
          <div style={{ marginBottom: '8px' }}>
            <p style={{ color: '#666', fontSize: '10px', letterSpacing: '1px', margin: '0 0 6px', fontFamily: 'sans-serif' }}>ADD PRESET</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {COMMON_AREA_TEMPLATES.filter(p => !templates.some(t => t.name === p.name)).map(p => (
                <button key={p.name} onClick={() => handleAddPreset(p)} style={{ padding: '6px 10px', background: 'transparent', border: '1px dashed rgba(198,168,94,.25)', borderRadius: '6px', color: '#9AA8B5', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={11} /> {p.name}
                </button>
              ))}
              {COMMON_AREA_TEMPLATES.every(p => templates.some(t => t.name === p.name)) && (
                <p style={{ color: '#555', fontSize: '11px', fontFamily: 'sans-serif' }}>All presets added ✓</p>
              )}
            </div>
          </div>
          {/* Custom area */}
          {showNewArea ? (
            <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
              <input placeholder="Area name (e.g. Fitness Room)" value={newAreaName} onChange={e => setNewAreaName(e.target.value)} style={{ ...S.input, padding: '8px 10px', fontSize: '13px' }} />
              <select value={newAreaSeed} onChange={e => setNewAreaSeed(e.target.value)} style={{ ...S.input, padding: '8px 10px', fontSize: '12px' }}>
                <option value="">Start blank</option>
                {COMMON_AREA_TEMPLATES.map(p => <option key={p.name} value={p.name}>Copy from: {p.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setShowNewArea(false); setNewAreaName(''); setNewAreaSeed(''); }} style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '6px', color: '#9AA8B5', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={handleCreateArea} disabled={!newAreaName.trim()} style={{ flex: 2, padding: '7px', background: '#C6A85E', border: 'none', borderRadius: '6px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'sans-serif' }}>Create</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewArea(true)} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
              <Layers size={12} /> Custom Area
            </button>
          )}

          <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>ROOMS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {rooms.map(r => (
              <div key={r.id} style={{ padding: '8px 12px', background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#F5F0E8', fontSize: '13px' }}>{r.roomNumber}</div>
                  <div style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif' }}>{r.roomType}</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => toggleRoomMutation.mutate({ id: r.id, active: !r.active })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.active ? '#4CAF50' : '#666', fontSize: '16px' }} title={r.active ? 'Active' : 'Inactive'}>●</button>
                  <button onClick={() => { if (confirm('Delete room?')) deleteRoomMutation.mutate(r.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D', padding: '2px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          {showAddRoom ? (
            <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input placeholder="Room name" value={newRoom.roomNumber} onChange={e => setNewRoom(r => ({ ...r, roomNumber: e.target.value }))} style={{ ...S.input, padding: '8px 10px', fontSize: '13px' }} />
              <input placeholder="Room type" value={newRoom.roomType} onChange={e => setNewRoom(r => ({ ...r, roomType: e.target.value }))} style={{ ...S.input, padding: '8px 10px', fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setShowAddRoom(false)} style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '6px', color: '#9AA8B5', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={() => addRoomMutation.mutate(newRoom)} disabled={!newRoom.roomNumber} style={{ flex: 2, padding: '7px', background: '#C6A85E', border: 'none', borderRadius: '6px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'sans-serif' }}>Add</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddRoom(true)} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Room
            </button>
          )}
        </div>

        {/* Template editor */}
        <div>
          {!template ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9AA8B5', border: '1px dashed rgba(198,168,94,.2)', borderRadius: '12px' }}>
              <p style={{ fontFamily: 'sans-serif' }}>Select a template to edit its checklist</p>
            </div>
          ) : (
            <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: 0, fontFamily: 'sans-serif' }}>{template.name.toUpperCase()} — {template.items?.length || 0} ITEMS</p>
                <button onClick={addItem} style={{ padding: '7px 14px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '12px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(template.items || []).map((item, idx) => (
                  <div key={idx} style={{ background: item.active === false ? 'rgba(0,0,0,.05)' : 'rgba(0,0,0,.2)', borderRadius: '8px', padding: '12px', display: 'grid', gridTemplateColumns: '28px 1fr 120px 80px 80px 32px 32px', gap: '8px', alignItems: 'center', opacity: item.active === false ? 0.5 : 1 }}>
                    {/* Active toggle */}
                    <button
                      onClick={() => updateItem(idx, 'active', item.active === false ? true : false)}
                      title={item.active !== false ? 'Disable item' : 'Enable item'}
                      style={{ background: 'none', border: `1px solid ${item.active !== false ? '#4CAF50' : '#666'}`, borderRadius: '4px', cursor: 'pointer', color: item.active !== false ? '#4CAF50' : '#666', fontSize: '14px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {item.active !== false ? '●' : '○'}
                    </button>
                    <input value={item.label} onChange={e => updateItem(idx, 'label', e.target.value)} placeholder="Item label..." style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} />
                    <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)} style={{ ...S.input, padding: '7px 8px', fontSize: '12px' }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" min="0" placeholder="Qty" value={item.qtyExpected ?? ''} onChange={e => updateItem(idx, 'qtyExpected', e.target.value ? parseInt(e.target.value) : null)} style={{ ...S.input, padding: '7px 8px', fontSize: '13px', textAlign: 'center' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={item.required !== false} onChange={e => updateItem(idx, 'required', e.target.checked)} style={{ accentColor: '#C6A85E' }} />
                      <span style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif' }}>Req.</span>
                    </label>
                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D', padding: '4px' }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
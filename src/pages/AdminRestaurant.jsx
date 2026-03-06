import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminRestaurant() {
  const [activeTab, setActiveTab] = useState('specials');
  const queryClient = useQueryClient();

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '24px 16px', overflowX: 'hidden', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link to={createPageUrl('AdminDashboard')} style={{ color: '#3B4831', display: 'flex', padding: '6px', flexShrink: 0 }}><ArrowLeft size={20} /></Link>
          <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '28px', color: '#3B4831' }}>
            Restaurant Admin
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '2px solid rgba(59,72,49,.1)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          {[
            { key: 'specials', label: 'Daily Specials' },
            { key: 'menu', label: 'Menu Items' },
            { key: 'categories', label: 'Menu Sections' },
            { key: 'hours', label: 'Hours' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 14px',
                background: activeTab === tab.key ? '#3B4831' : 'transparent',
                color: activeTab === tab.key ? '#FCF9F4' : '#3B4831',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'specials' && <SpecialsManager />}
        {activeTab === 'menu' && <MenuManager />}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'hours' && <HoursManager />}
      </div>
    </div>
  );
}

const SPECIAL_CATS = ['Lunch', 'Dinner', 'Bar'];

function CategorySpecialsList({ category, specials, onSelect, onEdit, onDelete, isSelecting }) {
  const catSpecials = specials.filter(s => s.category === category && !s.isSoup);
  const activeId = catSpecials.find(s => s.isActiveToday)?.id || null;

  if (catSpecials.length === 0) {
    return (
      <p style={{ color: '#888', fontSize: '14px', fontStyle: 'italic', padding: '12px 0' }}>
        No {category} specials yet. Click "Add Special" to create one.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {catSpecials.map(special => {
        const isActive = special.isActiveToday;
        return (
          <label
            key={special.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '14px 16px',
              background: isActive ? '#FFF5F0' : '#FCF9F4',
              border: isActive ? '2px solid #C57C5D' : '1px solid rgba(59,72,49,.15)',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="radio"
              name={`special-${category}`}
              checked={isActive}
              onChange={() => onSelect(special.id, catSpecials)}
              style={{ marginTop: '3px', accentColor: '#C57C5D', width: '18px', height: '18px', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#3B4831', fontSize: '15px' }}>{special.title}</span>
                  {isActive && (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#C57C5D', color: '#FCF9F4', fontSize: '11px', borderRadius: '4px', fontWeight: 700 }}>
                      ON MENU TODAY
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); onEdit(special); }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); onDelete(special.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {special.description && (
                <p style={{ margin: '4px 0 0', color: '#555', fontSize: '13px', lineHeight: '1.5' }}>{special.description}</p>
              )}
              {special.price != null && (
                <p style={{ margin: '4px 0 0', color: '#C57C5D', fontWeight: 700, fontSize: '14px' }}>${Number(special.price).toFixed(2)}</p>
              )}
            </div>
          </label>
        );
      })}
      {/* Deselect option */}
      {activeId && (
        <button
          onClick={() => onSelect(null, catSpecials)}
          style={{ fontSize: '12px', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0', textDecoration: 'underline' }}
        >
          Clear today's {category} special
        </button>
      )}
    </div>
  );
}

function SpecialsManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState(null);
  const [activeTab, setActiveTab] = useState('Lunch');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Lunch',
    isActiveToday: false,
    isSoup: false,
  });

  const { data: specials = [] } = useQuery({
    queryKey: ['restaurant-specials'],
    queryFn: () => base44.entities.RestaurantDailySpecials.filter({ isArchived: false }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RestaurantDailySpecials.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] }); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantDailySpecials.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] }); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RestaurantDailySpecials.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] }),
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', category: activeTab || 'Lunch', isActiveToday: false, isSoup: false });
    setEditingSpecial(null);
    setShowDialog(false);
  };

  const handleEdit = (special) => {
    setEditingSpecial(special);
    setFormData({
      title: special.title,
      description: special.description || '',
      price: special.price != null ? String(special.price) : '',
      category: special.category || 'Lunch',
      isActiveToday: special.isActiveToday || false,
      isSoup: special.isSoup || false,
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, price: formData.price ? parseFloat(formData.price) : null };
    if (editingSpecial) {
      updateMutation.mutate({ id: editingSpecial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Radio-select: activate chosen special, deactivate all others in that category
  const handleSelect = async (selectedId, catSpecials) => {
    for (const s of catSpecials) {
      const shouldBeActive = s.id === selectedId;
      if (s.isActiveToday !== shouldBeActive) {
        await base44.entities.RestaurantDailySpecials.update(s.id, { isActiveToday: shouldBeActive });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] });
  };

  // Soups
  const soups = specials.filter(s => s.isSoup);
  const activeSoups = soups.filter(s => s.isActiveToday);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#3B4831' }}>Daily Specials</h2>
        <Button onClick={() => { setFormData(f => ({ ...f, category: activeTab })); setShowDialog(true); }} style={{ background: '#C57C5D', color: '#FCF9F4' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Special
        </Button>
      </div>

      {/* Today's active summary */}
      {specials.some(s => s.isActiveToday) && (
        <div style={{ background: '#F0EBE3', border: '1px solid rgba(197,124,93,.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: '#C57C5D', textTransform: 'uppercase' }}>On the menu today</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {specials.filter(s => s.isActiveToday).map(s => (
              <span key={s.id} style={{ padding: '4px 12px', background: '#FCF9F4', border: '1px solid rgba(197,124,93,.4)', borderRadius: '20px', fontSize: '13px', color: '#3B4831', fontWeight: 600 }}>
                {s.isSoup ? '🍵 ' : ''}{s.title} {s.category && !s.isSoup ? `(${s.category})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs: Lunch, Dinner, Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid rgba(59,72,49,.1)', paddingBottom: '0' }}>
        {SPECIAL_CATS.map(cat => {
          const catActive = specials.filter(s => s.category === cat && s.isActiveToday && !s.isSoup).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === cat ? '3px solid #C57C5D' : '3px solid transparent',
                color: activeTab === cat ? '#C57C5D' : '#3B4831',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {cat}
              {catActive > 0 && (
                <span style={{ marginLeft: '6px', width: '8px', height: '8px', background: '#C57C5D', borderRadius: '50%', display: 'inline-block', verticalAlign: 'middle' }} />
              )}
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab('Soup')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Soup' ? '3px solid #8BA08C' : '3px solid transparent',
            color: activeTab === 'Soup' ? '#8BA08C' : '#3B4831',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            marginBottom: '-2px',
          }}
        >
          🍵 Soup
          {activeSoups.length > 0 && (
            <span style={{ marginLeft: '6px', width: '8px', height: '8px', background: '#8BA08C', borderRadius: '50%', display: 'inline-block', verticalAlign: 'middle' }} />
          )}
        </button>
      </div>

      {/* Tab content */}
      <div style={{ minHeight: '120px' }}>
        {activeTab !== 'Soup' ? (
          <CategorySpecialsList
            category={activeTab}
            specials={specials}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ) : (
          /* Soup section */
          <div style={{ display: 'grid', gap: '10px' }}>
            {soups.length === 0 && (
              <p style={{ color: '#888', fontSize: '14px', fontStyle: 'italic', padding: '12px 0' }}>No soups yet. Click "Add Special" and toggle "This is a Daily Soup".</p>
            )}
            {soups.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px',
                background: s.isActiveToday ? '#F0F7F2' : '#FCF9F4',
                border: s.isActiveToday ? '2px solid #8BA08C' : '1px solid rgba(59,72,49,.15)',
                borderRadius: '10px',
              }}>
                <Switch
                  checked={s.isActiveToday}
                  onCheckedChange={async (v) => {
                    await base44.entities.RestaurantDailySpecials.update(s.id, { isActiveToday: v });
                    queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] });
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, color: '#3B4831', fontSize: '15px' }}>{s.title}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(s)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {s.description && <p style={{ margin: '4px 0 0', color: '#555', fontSize: '13px' }}>{s.description}</p>}
                  {s.price != null && <p style={{ margin: '4px 0 0', color: '#8BA08C', fontWeight: 700 }}>${Number(s.price).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpecial ? 'Edit Special' : 'Add Special'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#F0EBE3', borderRadius: '8px' }}>
              <Switch checked={formData.isSoup} onCheckedChange={(v) => setFormData({...formData, isSoup: v})} />
              <label style={{ fontWeight: 600 }}>This is a Daily Soup</label>
            </div>
            {!formData.isSoup && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Category</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Title *</label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Description</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Price (optional)</label>
              <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>
            <Button type="submit" style={{ background: '#3B4831', color: '#FCF9F4' }}>
              {editingSpecial ? 'Update' : 'Create'} Special
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category: 'Lunch',
    section: '',
    name: '',
    description: '',
    price: '',
    priceNote: '',
    tags: '',
    sortOrder: 0,
    isActive: true
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => base44.entities.RestaurantMenuItems.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RestaurantMenuItems.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantMenuItems.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RestaurantMenuItems.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-menu-items'] });
    },
  });

  const resetForm = () => {
    setFormData({ category: 'Lunch', section: '', name: '', description: '', price: '', priceNote: '', tags: '', sortOrder: 0, isActive: true });
    setEditingItem(null);
    setShowDialog(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      section: item.section || '',
      name: item.name,
      description: item.description || '',
      price: item.price,
      priceNote: item.priceNote || '',
      tags: item.tags || '',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price)
    };
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredItems = filterCategory === 'all' ? menuItems : menuItems.filter(item => item.category === filterCategory);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'Lunch', 'Bar', 'Dinner', 'Dessert', 'Espresso', 'Cocktails', 'Wine'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '8px 16px',
                background: filterCategory === cat ? '#3B4831' : 'transparent',
                color: filterCategory === cat ? '#FCF9F4' : '#3B4831',
                border: '1px solid #3B4831',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowDialog(true)} style={{ background: '#C57C5D', color: '#FCF9F4' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div style={{ background: '#FCF9F4', borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ background: 'rgba(59,72,49,.1)' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#3B4831' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#3B4831' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#3B4831' }}>Section</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#3B4831' }}>Price</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#3B4831' }}>Active</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#3B4831' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(59,72,49,.08)' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 600, color: '#3B4831' }}>{item.name}</div>
                  {item.priceNote && <div style={{ fontSize: '12px', color: '#1B1B1B', marginTop: '2px' }}>({item.priceNote})</div>}
                </td>
                <td style={{ padding: '12px', color: '#1B1B1B' }}>{item.category}</td>
                <td style={{ padding: '12px', color: '#1B1B1B' }}>{item.section || '—'}</td>
                <td style={{ padding: '12px', color: '#C57C5D', fontWeight: 600 }}>${item.price}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {item.isActive ? '✓' : '—'}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#1B1B1B' }}>
            No menu items found
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Category *</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Dessert">Dessert</SelectItem>
                    <SelectItem value="Espresso">Espresso</SelectItem>
                    <SelectItem value="Cocktails">Cocktails</SelectItem>
                    <SelectItem value="Wine">Wine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Section</label>
                <Input value={formData.section} onChange={(e) => setFormData({...formData, section: e.target.value})} placeholder="e.g., Appetizers" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Description</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Price *</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Price Note</label>
                <Input value={formData.priceNote} onChange={(e) => setFormData({...formData, priceNote: e.target.value})} placeholder="e.g., cup, bowl" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} />
              <label style={{ fontWeight: 600 }}>Active</label>
            </div>
            <Button type="submit" style={{ background: '#3B4831', color: '#FCF9F4' }}>
              {editingItem ? 'Update' : 'Create'} Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryManager() {
  const queryClient = useQueryClient();
  const { data: settings = [] } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SiteSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SiteSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  const categories = ['Lunch', 'Dinner', 'Bar', 'Dessert', 'Espresso', 'Cocktails', 'Wine'];
  
  const getSettingForCategory = (cat) => {
    return settings.find(s => s.key === `MENU_${cat.toUpperCase()}_ENABLED`);
  };

  const toggleCategory = (category) => {
    const setting = getSettingForCategory(category);
    if (setting) {
      updateMutation.mutate({ 
        id: setting.id, 
        data: { ...setting, value: setting.value === 'true' ? 'false' : 'true' } 
      });
    } else {
      createMutation.mutate({ 
        key: `MENU_${category.toUpperCase()}_ENABLED`, 
        value: 'true',
        description: `Enable/disable ${category} menu section`
      });
    }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#3B4831' }}>Menu Sections</h2>
      <p style={{ margin: '0 0 24px 0', color: '#1B1B1B', fontSize: '14px' }}>
        Control which menu sections appear on your restaurant menu page. Turn off sections you're not currently serving.
      </p>
      <div style={{ display: 'grid', gap: '12px' }}>
        {categories.map(cat => {
          const setting = getSettingForCategory(cat);
          const isEnabled = !setting || setting.value === 'true';
          return (
            <div 
              key={cat}
              style={{ 
                background: '#FCF9F4', 
                padding: '20px', 
                borderRadius: '12px',
                border: isEnabled ? '2px solid #C57C5D' : '1px solid rgba(59,72,49,.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#3B4831', fontWeight: 700 }}>{cat}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#1B1B1B' }}>
                  {isEnabled ? 'Visible on menu' : 'Hidden from menu'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#1B1B1B', fontWeight: 600 }}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch 
                  checked={isEnabled}
                  onCheckedChange={() => toggleCategory(cat)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HoursManager() {
  const queryClient = useQueryClient();
  const [editingHours, setEditingHours] = useState({});

  const { data: hours = [] } = useQuery({
    queryKey: ['restaurant-hours'],
    queryFn: () => base44.entities.RestaurantHours.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantHours.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-hours'] });
    },
  });

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const sortedHours = [...hours].sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek));

  const handleUpdate = (hour) => {
    const data = editingHours[hour.id] || hour;
    updateMutation.mutate({ id: hour.id, data });
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#3B4831' }}>Restaurant Hours</h2>
      <div style={{ background: '#FCF9F4', borderRadius: '12px', padding: '24px' }}>
        {sortedHours.map(hour => {
          const editing = editingHours[hour.id] || hour;
          return (
            <div key={hour.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px,120px) minmax(0,1fr) minmax(0,1fr) auto auto', gap: '8px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(59,72,49,.08)', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, color: '#3B4831' }}>{hour.dayOfWeek}</div>
              <Input
                type="time"
                value={editing.openTime || ''}
                onChange={(e) => setEditingHours({...editingHours, [hour.id]: {...editing, openTime: e.target.value}})}
                disabled={editing.isClosed}
              />
              <Input
                type="time"
                value={editing.closeTime || ''}
                onChange={(e) => setEditingHours({...editingHours, [hour.id]: {...editing, closeTime: e.target.value}})}
                disabled={editing.isClosed}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Switch
                  checked={editing.isClosed || false}
                  onCheckedChange={(checked) => setEditingHours({...editingHours, [hour.id]: {...editing, isClosed: checked}})}
                />
                <span style={{ fontSize: '14px' }}>Closed</span>
              </div>
              <Button size="sm" onClick={() => handleUpdate(hour)} style={{ background: '#3B4831', color: '#FCF9F4' }}>
                Save
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
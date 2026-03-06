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

const CAT_TABS = ['Lunch', 'Dinner', 'Bar', 'Dessert', 'Other'];

function SpecialsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Lunch');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState(null);
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

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActiveToday }) => base44.entities.RestaurantDailySpecials.update(id, { isActiveToday }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['restaurant-specials'] }),
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', category: activeTab, isActiveToday: false, isSoup: false });
    setEditingSpecial(null);
    setShowDialog(false);
  };

  const handleEdit = (special) => {
    setEditingSpecial(special);
    setFormData({
      title: special.title,
      description: special.description,
      price: special.price || '',
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

  const openAddForTab = () => {
    setEditingSpecial(null);
    setFormData({ title: '', description: '', price: '', category: activeTab, isActiveToday: false, isSoup: activeTab === 'Soup' });
    setShowDialog(true);
  };

  const tabSpecials = specials.filter(s => !s.isSoup && s.category === activeTab);
  const soups = specials.filter(s => s.isSoup);
  const activeCount = specials.filter(s => s.isActiveToday).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#3B4831' }}>Daily Specials</h2>
          {activeCount > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#C57C5D', fontWeight: 600 }}>
              {activeCount} item{activeCount !== 1 ? 's' : ''} showing on website today
            </p>
          )}
        </div>
        <Button onClick={openAddForTab} style={{ background: '#C57C5D', color: '#FCF9F4' }}>
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab} Special
        </Button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid rgba(59,72,49,.1)', paddingBottom: '0' }}>
        {CAT_TABS.map(cat => {
          const count = specials.filter(s => !s.isSoup && s.category === cat).length;
          const activeInCat = specials.filter(s => !s.isSoup && s.category === cat && s.isActiveToday).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              style={{
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === cat ? '3px solid #C57C5D' : '3px solid transparent',
                color: activeTab === cat ? '#C57C5D' : '#3B4831',
                fontWeight: activeTab === cat ? 700 : 500,
                cursor: 'pointer',
                fontSize: '14px',
                position: 'relative',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
              {activeInCat > 0 && (
                <span style={{ marginLeft: '6px', background: '#C57C5D', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                  {activeInCat}
                </span>
              )}
              {count > 0 && activeInCat === 0 && (
                <span style={{ marginLeft: '6px', background: 'rgba(59,72,49,.15)', color: '#3B4831', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {/* Soup tab */}
        <button
          onClick={() => setActiveTab('Soup')}
          style={{
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'Soup' ? '3px solid #C57C5D' : '3px solid transparent',
            color: activeTab === 'Soup' ? '#C57C5D' : '#3B4831',
            fontWeight: activeTab === 'Soup' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          🥣 Soup
          {soups.filter(s => s.isActiveToday).length > 0 && (
            <span style={{ marginLeft: '6px', background: '#C57C5D', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
              {soups.filter(s => s.isActiveToday).length}
            </span>
          )}
        </button>
      </div>

      {/* Checklist for current tab */}
      {activeTab !== 'Soup' ? (
        <div>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#1B1B1B' }}>
            Check the box next to any item to show it on the website today. Uncheck to hide it.
          </p>
          {tabSpecials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#1B1B1B', background: '#FCF9F4', borderRadius: '12px', border: '1px dashed rgba(59,72,49,.2)' }}>
              No {activeTab} specials yet.{' '}
              <button onClick={openAddForTab} style={{ color: '#C57C5D', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Add one
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {tabSpecials.map(special => (
                <div
                  key={special.id}
                  style={{
                    background: '#FCF9F4',
                    borderRadius: '12px',
                    border: special.isActiveToday ? '2px solid #C57C5D' : '1px solid rgba(59,72,49,.1)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => toggleActiveMutation.mutate({ id: special.id, isActiveToday: !special.isActiveToday })}
                >
                  {/* Big checkbox */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: special.isActiveToday ? '2px solid #C57C5D' : '2px solid rgba(59,72,49,.3)',
                    background: special.isActiveToday ? '#C57C5D' : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {special.isActiveToday && <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#3B4831', fontWeight: 700 }}>{special.title}</h3>
                      {special.price != null && (
                        <span style={{ color: '#C57C5D', fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>${Number(special.price).toFixed(2)}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: '#1B1B1B', fontSize: '13px', lineHeight: '1.5' }}>{special.description}</p>
                    {special.isActiveToday && (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#C57C5D', fontWeight: 600 }}>✓ Showing on website today</p>
                    )}
                  </div>
                  {/* Edit/Delete — stop propagation */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(special)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(special.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Soup tab */
        <div>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#1B1B1B' }}>
            Check the soup to show it on the website today.
          </p>
          {soups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#1B1B1B', background: '#FCF9F4', borderRadius: '12px', border: '1px dashed rgba(59,72,49,.2)' }}>
              No soups yet.{' '}
              <button onClick={() => { setEditingSpecial(null); setFormData({ title: '', description: '', price: '', category: 'Lunch', isActiveToday: false, isSoup: true }); setShowDialog(true); }}
                style={{ color: '#C57C5D', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Add one
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {soups.map(special => (
                <div
                  key={special.id}
                  style={{
                    background: '#FCF9F4',
                    borderRadius: '12px',
                    border: special.isActiveToday ? '2px solid #C57C5D' : '1px solid rgba(59,72,49,.1)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleActiveMutation.mutate({ id: special.id, isActiveToday: !special.isActiveToday })}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    border: special.isActiveToday ? '2px solid #C57C5D' : '2px solid rgba(59,72,49,.3)',
                    background: special.isActiveToday ? '#C57C5D' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                  }}>
                    {special.isActiveToday && <span style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#3B4831', fontWeight: 700 }}>{special.title}</h3>
                      {special.price != null && <span style={{ color: '#C57C5D', fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap' }}>${Number(special.price).toFixed(2)}</span>}
                    </div>
                    <p style={{ margin: 0, color: '#1B1B1B', fontSize: '13px', lineHeight: '1.5' }}>{special.description}</p>
                    {special.isActiveToday && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#C57C5D', fontWeight: 600 }}>✓ Showing on website today</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(special)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(special.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSpecial ? 'Edit Special' : `Add ${formData.isSoup ? 'Soup' : formData.category} Special`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Title *</label>
              <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Description *</label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Price</label>
                <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
              </div>
              {!formData.isSoup && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Category</label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lunch">Lunch</SelectItem>
                      <SelectItem value="Dinner">Dinner</SelectItem>
                      <SelectItem value="Bar">Bar</SelectItem>
                      <SelectItem value="Dessert">Dessert</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Switch checked={formData.isSoup || false} onCheckedChange={(checked) => setFormData({...formData, isSoup: checked})} />
              <label style={{ fontWeight: 600 }}>This is a Daily Soup</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Switch checked={formData.isActiveToday} onCheckedChange={(checked) => setFormData({...formData, isActiveToday: checked})} />
              <label style={{ fontWeight: 600 }}>Active Today</label>
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
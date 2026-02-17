import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Save, FileDown, ShoppingCart, Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import jsPDF from 'jspdf';

const SERVICE_STYLES = ['plated','buffet','passed_appetizers','family_style','cocktail_reception'];
const ING_CATS = ['proteins','produce','dry_goods','dairy','alcohol','paper_disposables','rentals','other'];
const CATEGORIES = ['starters','salads','entrees','sides','desserts','bar_packages','add_ons','chef_specials'];

const STAFF_ROLES = [
  { role: 'bartender', label: 'Bartenders' },
  { role: 'server', label: 'Servers' },
  { role: 'busboy', label: 'Bussers / Busboys' },
  { role: 'setup_crew', label: 'Setup Crew' },
  { role: 'breakdown_crew', label: 'Breakdown Crew' },
  { role: 'chef', label: 'Chef / Cook' },
  { role: 'kitchen_helper', label: 'Kitchen Helpers' },
  { role: 'event_captain', label: 'Event Captain' },
  { role: 'host', label: 'Host / Greeter' },
  { role: 'security', label: 'Security' },
];

function calcLaborTotal(staffing = []) {
  return staffing.reduce((sum, s) => sum + ((s.count || 0) * (s.hours || 0) * (s.rate || 0)), 0);
}

function calcTotals(state) {
  const items = state.selected_items || [];
  const guestCount = state.guest_count || 1;

  const food_subtotal = items.reduce((sum, item) => {
    const price = item.override_price != null ? item.override_price : item.unit_price;
    const qty = item.per_person ? guestCount : (item.quantity || 1);
    return sum + (price * qty);
  }, 0);

  const labor_cost = calcLaborTotal(state.staffing || []);
  const bar_total = state.bar_package ? guestCount * 25 : 0;
  const rentals_total = state.rentals_needed ? 500 : 0;

  let venue_total = 0;
  if (state.is_onsite) {
    if (state.venue_pricing_mode === 'bundle') {
      venue_total = state.venue_bundle || 0;
    } else {
      if (state.venue_front_enabled) venue_total += state.venue_front || 0;
      if (state.venue_bar_enabled) venue_total += state.venue_bar || 0;
      if (state.venue_upstairs_enabled) venue_total += state.venue_upstairs || 0;
    }
  }

  const subtotal = food_subtotal + labor_cost + bar_total + rentals_total + venue_total;
  const service_charge_amount = subtotal * ((state.service_charge_rate || 20) / 100);
  const tax_amount = (subtotal + service_charge_amount) * ((state.tax_rate || 8.25) / 100);
  const grand_total = subtotal + service_charge_amount + tax_amount;
  const deposit_amount = grand_total * ((state.deposit_rate || 30) / 100);

  const food_cost = items.reduce((sum, item) => {
    const qty = item.per_person ? guestCount : (item.quantity || 1);
    const ingCost = (item.ingredients || []).reduce((s, ing) => s + (ing.cost_per_unit || 0) * (ing.qty_per_serving || 0) * qty, 0);
    return sum + ingCost;
  }, 0);
  const food_cost_percent = food_subtotal > 0 ? Math.round((food_cost / food_subtotal) * 100) : 0;
  const projected_margin = grand_total > 0 ? Math.round(((grand_total - food_cost - labor_cost) / grand_total) * 100) : 0;

  return { food_subtotal, labor_cost, bar_total, rentals_total, service_charge_amount, tax_amount, grand_total, deposit_amount, food_cost_percent, projected_margin };
}

const BLANK = {
  quote_number: `QT-${Date.now()}`,
  status: 'draft',
  client_name: '', company: '', phone: '', email: '',
  event_name: '', event_date: '', event_location: '',
  indoor_outdoor: 'indoor', guest_count: 50,
  service_style: 'buffet',
  is_onsite: false,
  staffing_needed: false, bar_package: false, rentals_needed: false,
  staffing: [],
  venue_pricing_mode: 'individual', // 'individual' or 'bundle'
  venue_front: 0,
  venue_bar: 0,
  venue_upstairs: 0,
  venue_bundle: 0,
  venue_front_enabled: false,
  venue_bar_enabled: false,
  venue_upstairs_enabled: false,
  notes: '', selected_items: [],
  tax_rate: 8.25, service_charge_rate: 20, deposit_rate: 30,
  terms: 'A 30% non-refundable deposit is required to secure your event date. Remaining balance is due 7 days prior to the event. Cancellations within 72 hours forfeit the full deposit.'
};

const S = {
  page: { minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", color: '#F5F0E8' },
  section: { background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', padding: '28px', marginBottom: '24px' },
  sectionTitle: { color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 20px', fontFamily: 'sans-serif' },
  label: { display: 'block', color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', marginBottom: '5px', fontFamily: 'sans-serif' },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' },
  toggle: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: on ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.2)', background: on ? 'rgba(198,168,94,.15)' : 'transparent', color: on ? '#C6A85E' : '#9AA8B5', cursor: 'pointer', fontSize: '14px', fontFamily: 'sans-serif' }),
};

export default function AdminCateringQuote() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const qc = useQueryClient();

  const [form, setForm] = useState(BLANK);
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState('entrees');
  const [saved, setSaved] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['catering-menu-items'],
    queryFn: () => base44.entities.CateringMenuItem.filter({ is_active: true }, 'sort_order')
  });

  const { data: existingQuote } = useQuery({
    queryKey: ['catering-quote', editId],
    queryFn: () => base44.entities.CateringQuote.filter({ id: editId }),
    enabled: !!editId,
    select: (data) => data[0]
  });

  useEffect(() => {
    if (existingQuote) setForm({ ...BLANK, ...existingQuote });
  }, [existingQuote]);

  const totals = calcTotals(form);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, ...totals };
      if (editId) return base44.entities.CateringQuote.update(editId, payload);
      return base44.entities.CateringQuote.create(payload);
    },
    onSuccess: (result) => {
      qc.invalidateQueries(['catering-quotes']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const addItem = (menuItem) => {
    const existing = form.selected_items.find(i => i.item_id === menuItem.id);
    if (existing) return;
    setForm(f => ({
      ...f,
      selected_items: [...f.selected_items, {
        item_id: menuItem.id,
        item_name: menuItem.name,
        category: menuItem.category,
        quantity: 1,
        per_person: menuItem.unit === 'per person',
        serves: menuItem.serving_size || 1,
        unit_price: menuItem.base_price,
        override_price: null,
        line_total: menuItem.base_price,
        ingredients: menuItem.ingredients || []
      }]
    }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = [...f.selected_items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, selected_items: items };
    });
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, selected_items: f.selected_items.filter((_, i) => i !== idx) }));
  };

  const addCustomItem = () => {
    setForm(f => ({
      ...f,
      selected_items: [...f.selected_items, {
        item_id: `custom-${Date.now()}`,
        item_name: 'Custom Item',
        category: 'add_ons',
        quantity: 1,
        per_person: false,
        serves: 1,
        unit_price: 0,
        override_price: null,
        line_total: 0,
        ingredients: []
      }]
    }));
  };

  const generateClientPDF = () => {
    const doc = new jsPDF();
    const t = totals;

    // Header
    doc.setFillColor(12, 28, 44);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(198, 168, 94);
    doc.setFontSize(22);
    doc.setFont('times', 'bold');
    doc.text('HOTEL RITUAL', 20, 18);
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('Catering & Events', 20, 26);
    doc.setTextColor(200, 200, 180);
    doc.text(`Quote #${form.quote_number}`, 20, 33);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 33);

    // Event Info
    doc.setTextColor(12, 28, 44);
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('Event Details', 20, 55);
    doc.setDrawColor(198, 168, 94);
    doc.line(20, 57, 190, 57);

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    const info = [
      ['Client', form.client_name], ['Company', form.company],
      ['Event', form.event_name], ['Date', form.event_date],
      ['Location', form.event_location], ['Guests', String(form.guest_count)],
      ['Service Style', form.service_style?.replace('_', ' ')], ['Phone', form.phone], ['Email', form.email]
    ].filter(([,v]) => v);

    let y = 64;
    info.forEach(([k, v]) => {
      doc.setTextColor(120, 100, 80);
      doc.text(`${k}:`, 20, y);
      doc.setTextColor(12, 28, 44);
      doc.text(String(v), 70, y);
      y += 7;
    });

    // Menu Items
    y += 4;
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.setTextColor(12, 28, 44);
    doc.text('Menu Selection', 20, y);
    y += 3;
    doc.setDrawColor(198, 168, 94);
    doc.line(20, y, 190, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    form.selected_items.forEach(item => {
      if (y > 250) { doc.addPage(); y = 20; }
      const price = item.override_price != null ? item.override_price : item.unit_price;
      const qty = item.per_person ? form.guest_count : item.quantity;
      const line = price * qty;
      doc.setTextColor(12, 28, 44);
      doc.text(item.item_name, 20, y);
      doc.setTextColor(100, 100, 100);
      doc.text(item.per_person ? `${form.guest_count} guests × $${price}` : `${qty} × $${price}`, 100, y);
      doc.setTextColor(12, 28, 44);
      doc.text(`$${line.toFixed(2)}`, 175, y, { align: 'right' });
      y += 7;
    });

    // Totals
    y += 8;
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setDrawColor(198, 168, 94);
    doc.line(20, y, 190, y);
    y += 8;

    const totalsRows = [
      ['Food Subtotal', t.food_subtotal],
      t.labor_cost > 0 && ['Labor', t.labor_cost],
      form.bar_package && ['Bar Package', t.bar_total],
      form.rentals_needed && ['Rentals', t.rentals_total],
      [`Service Charge (${form.service_charge_rate}%)`, t.service_charge_amount],
      [`Tax (${form.tax_rate}%)`, t.tax_amount],
    ].filter(Boolean);

    totalsRows.forEach(([label, val]) => {
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(String(label), 120, y);
      doc.setTextColor(12, 28, 44);
      doc.text(`$${val.toFixed(2)}`, 190, y, { align: 'right' });
      y += 7;
    });

    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.setTextColor(12, 28, 44);
    doc.text('TOTAL', 120, y + 2);
    doc.setTextColor(198, 168, 94);
    doc.text(`$${t.grand_total.toFixed(2)}`, 190, y + 2, { align: 'right' });
    y += 10;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text(`Deposit Required (${form.deposit_rate}%): $${t.deposit_amount.toFixed(2)}`, 120, y);

    // Signature line
    y += 20;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setDrawColor(12, 28, 44);
    doc.line(20, y, 100, y);
    doc.text('Client Signature', 20, y + 5);
    doc.line(120, y, 190, y);
    doc.text('Date', 120, y + 5);

    // Terms
    y += 20;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('times', 'italic');
    const terms = doc.splitTextToSize(form.terms || '', 170);
    doc.text(terms, 20, y);

    // Footer
    doc.setFillColor(12, 28, 44);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(198, 168, 94);
    doc.setFontSize(8);
    doc.text('Hotel RITUAL · 540 El Paso Street, Jacksonville, TX 75766 · (903) 810-6695', 105, 291, { align: 'center' });

    doc.save(`Ritual-Quote-${form.quote_number}.pdf`);
  };

  const generateShoppingListPDF = () => {
    const doc = new jsPDF();
    const guestCount = form.guest_count || 1;

    // Build shopping list
    const shoppingList = {};
    ING_CATS.forEach(cat => { shoppingList[cat] = []; });

    form.selected_items.forEach(item => {
      const qty = item.per_person ? guestCount : (item.quantity || 1);
      (item.ingredients || []).forEach(ing => {
        const totalQty = ing.qty_per_serving * qty * 1.1; // 10% buffer
        const cat = ing.category || 'other';
        const existing = shoppingList[cat].find(i => i.name === ing.name && i.unit === ing.unit);
        if (existing) {
          existing.totalQty += totalQty;
          existing.totalCost += (ing.cost_per_unit || 0) * totalQty;
        } else {
          shoppingList[cat].push({
            name: ing.name, unit: ing.unit,
            totalQty, vendor: ing.vendor || '',
            totalCost: (ing.cost_per_unit || 0) * totalQty
          });
        }
      });
    });

    // Header
    doc.setFillColor(12, 28, 44);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(198, 168, 94);
    doc.setFontSize(18);
    doc.setFont('times', 'bold');
    doc.text('INTERNAL SHOPPING LIST', 20, 18);
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(200, 200, 180);
    doc.text(`${form.event_name} · ${form.event_date} · ${form.guest_count} guests`, 20, 26);
    doc.text(`Quote #${form.quote_number} — CONFIDENTIAL`, 20, 33);

    let y = 50;

    ING_CATS.forEach(cat => {
      const items = shoppingList[cat];
      if (items.length === 0) return;
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.setTextColor(12, 28, 44);
      doc.text(cat.replace('_', ' ').toUpperCase(), 20, y);
      doc.setDrawColor(198, 168, 94);
      doc.line(20, y + 2, 190, y + 2);
      y += 10;

      items.forEach(item => {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.setTextColor(12, 28, 44);
        doc.text(item.name, 22, y);
        doc.setTextColor(80, 80, 80);
        doc.text(`${item.totalQty.toFixed(1)} ${item.unit}`, 100, y);
        doc.text(item.vendor || '—', 140, y);
        doc.text(item.totalCost > 0 ? `$${item.totalCost.toFixed(2)}` : '', 185, y, { align: 'right' });
        y += 7;
      });
      y += 6;
    });

    doc.setFillColor(12, 28, 44);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(198, 168, 94);
    doc.setFontSize(8);
    doc.text('Hotel RITUAL · Internal Use Only', 105, 291, { align: 'center' });

    doc.save(`Ritual-ShoppingList-${form.quote_number}.pdf`);
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = menuItems.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '20px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link to={createPageUrl('AdminCatering')} style={{ color: '#9AA8B5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontFamily: 'sans-serif' }}>
              <ArrowLeft size={16} /> Back
            </Link>
            <div style={{ width: '1px', height: '24px', background: 'rgba(198,168,94,.2)' }} />
            <div>
              <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: 0, fontFamily: 'sans-serif' }}>CATERING</p>
              <h1 style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 300, margin: 0 }}>{editId ? 'Edit Quote' : 'New Quote'}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {saved && <span style={{ color: '#C6A85E', fontSize: '13px', fontFamily: 'sans-serif' }}>✓ Saved</span>}
            <button onClick={generateShoppingListPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
              <ShoppingCart size={15} /> Shopping List
            </button>
            <button onClick={generateClientPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
              <FileDown size={15} /> Client PDF
            </button>
            <button onClick={() => saveMutation.mutate(form)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'sans-serif' }}>
              <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Quote'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '28px', alignItems: 'start' }}>
        {/* LEFT */}
        <div>
          {/* Event Details */}
          <div style={S.section}>
            <p style={S.sectionTitle}>EVENT DETAILS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={S.label}>CLIENT NAME *</label>
                <input style={S.input} value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>COMPANY</label>
                <input style={S.input} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>PHONE</label>
                <input style={S.input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>EMAIL</label>
                <input style={S.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>EVENT NAME</label>
                <input style={S.input} value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>EVENT DATE</label>
                <input style={S.input} type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={S.label}>EVENT LOCATION</label>
                <input style={S.input} value={form.event_location} onChange={e => setForm(f => ({ ...f, event_location: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>GUEST COUNT</label>
                <input style={S.input} type="number" min="1" value={form.guest_count} onChange={e => setForm(f => ({ ...f, guest_count: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <label style={S.label}>SERVICE STYLE</label>
                <select style={S.input} value={form.service_style} onChange={e => setForm(f => ({ ...f, service_style: e.target.value }))}>
                  {SERVICE_STYLES.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>SETTING</label>
                <select style={S.input} value={form.indoor_outdoor} onChange={e => setForm(f => ({ ...f, indoor_outdoor: e.target.value }))}>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label style={S.label}>STATUS</label>
                <select style={S.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['draft','sent','accepted','deposit_paid','completed','archived'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              {[
                ['staffing_needed', '👥 Staffing Needed'],
                ['bar_package', '🍷 Bar Package'],
                ['rentals_needed', '🪑 Rentals Needed']
              ].map(([key, label]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))} style={S.toggle(form[key])}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={S.label}>NOTES</label>
              <textarea style={{ ...S.input, height: '70px', resize: 'vertical' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {/* Staffing Section */}
          <div style={S.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ ...S.sectionTitle, margin: 0 }}>STAFFING</p>
              <button
                onClick={() => setForm(f => ({ ...f, staffing: [...(f.staffing || []), { role: 'server', label: 'Servers', count: 1, hours: 4, rate: 18 }] }))}
                style={{ padding: '7px 14px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}
              >
                <Plus size={13} /> Add Staff Role
              </button>
            </div>

            {(!form.staffing || form.staffing.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#9AA8B5', border: '1px dashed rgba(198,168,94,.2)', borderRadius: '10px', fontSize: '13px', fontFamily: 'sans-serif' }}>
                No staff added. Click "Add Staff Role" to build your staffing plan.
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 90px 36px', gap: '8px', padding: '0 10px 8px', marginBottom: '4px' }}>
                  {['Role', '# Staff', 'Hours', 'Rate/Hr', 'Subtotal', ''].map(h => (
                    <div key={h} style={{ color: '#9AA8B5', fontSize: '10px', letterSpacing: '1px', fontFamily: 'sans-serif' }}>{h}</div>
                  ))}
                </div>
                {(form.staffing || []).map((s, idx) => {
                  const subtotal = (s.count || 0) * (s.hours || 0) * (s.rate || 0);
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 90px 36px', gap: '8px', padding: '8px 10px', background: 'rgba(245,240,232,.03)', border: '1px solid rgba(198,168,94,.1)', borderRadius: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <select
                        style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }}
                        value={s.role}
                        onChange={e => {
                          const found = STAFF_ROLES.find(r => r.role === e.target.value);
                          setForm(f => {
                            const staffing = [...(f.staffing || [])];
                            staffing[idx] = { ...staffing[idx], role: e.target.value, label: found?.label || e.target.value };
                            return { ...f, staffing };
                          });
                        }}
                      >
                        {STAFF_ROLES.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                      <input style={{ ...S.input, padding: '7px 8px', fontSize: '13px', textAlign: 'center' }} type="number" min="1" value={s.count}
                        onChange={e => setForm(f => { const st = [...(f.staffing||[])]; st[idx] = { ...st[idx], count: parseInt(e.target.value)||0 }; return { ...f, staffing: st }; })} />
                      <input style={{ ...S.input, padding: '7px 8px', fontSize: '13px', textAlign: 'center' }} type="number" min="0.5" step="0.5" value={s.hours}
                        onChange={e => setForm(f => { const st = [...(f.staffing||[])]; st[idx] = { ...st[idx], hours: parseFloat(e.target.value)||0 }; return { ...f, staffing: st }; })} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#9AA8B5', fontSize: '13px', fontFamily: 'sans-serif' }}>$</span>
                        <input style={{ ...S.input, padding: '7px 8px', fontSize: '13px' }} type="number" min="0" step="0.5" value={s.rate}
                          onChange={e => setForm(f => { const st = [...(f.staffing||[])]; st[idx] = { ...st[idx], rate: parseFloat(e.target.value)||0 }; return { ...f, staffing: st }; })} />
                      </div>
                      <span style={{ color: '#C6A85E', fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif' }}>${subtotal.toFixed(0)}</span>
                      <button onClick={() => setForm(f => ({ ...f, staffing: (f.staffing||[]).filter((_,i) => i !== idx) }))} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                <div style={{ textAlign: 'right', marginTop: '8px', padding: '8px 10px', borderTop: '1px solid rgba(198,168,94,.15)' }}>
                  <span style={{ color: '#9AA8B5', fontSize: '12px', fontFamily: 'sans-serif' }}>Total Labor: </span>
                  <span style={{ color: '#C6A85E', fontSize: '15px', fontWeight: 700, fontFamily: 'sans-serif' }}>${calcLaborTotal(form.staffing).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Menu Selection */}
          <div style={S.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ ...S.sectionTitle, margin: 0 }}>MENU SELECTION</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={addCustomItem} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}>
                  <Plus size={13} /> Custom Item
                </button>
                <button onClick={() => setShowMenuPicker(!showMenuPicker)} style={{ padding: '8px 16px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}>
                  <Plus size={13} /> Add from Menu
                </button>
              </div>
            </div>

            {/* Menu Picker */}
            {showMenuPicker && (
              <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setPickerCategory(cat)} style={{ padding: '6px 12px', borderRadius: '20px', border: pickerCategory === cat ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.2)', background: pickerCategory === cat ? 'rgba(198,168,94,.15)' : 'transparent', color: pickerCategory === cat ? '#C6A85E' : '#9AA8B5', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>
                      {cat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {(grouped[pickerCategory] || []).map(item => {
                    const added = form.selected_items.some(i => i.item_id === item.id);
                    return (
                      <button key={item.id} onClick={() => !added && addItem(item)} style={{ padding: '12px', textAlign: 'left', background: added ? 'rgba(198,168,94,.08)' : 'rgba(245,240,232,.04)', border: `1px solid ${added ? '#C6A85E' : 'rgba(198,168,94,.15)'}`, borderRadius: '10px', cursor: added ? 'default' : 'pointer', opacity: added ? 0.6 : 1 }}>
                        <div style={{ color: '#F5F0E8', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{item.name}</div>
                        <div style={{ color: '#C6A85E', fontSize: '12px' }}>${item.base_price} {item.unit}</div>
                        {added && <div style={{ color: '#9AA8B5', fontSize: '11px' }}>✓ Added</div>}
                      </button>
                    );
                  })}
                  {(grouped[pickerCategory] || []).length === 0 && (
                    <div style={{ gridColumn: '1/-1', color: '#9AA8B5', fontSize: '13px', padding: '20px', textAlign: 'center' }}>No items in this category. <Link to={createPageUrl('AdminCateringMenu')} style={{ color: '#C6A85E' }}>Add some →</Link></div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Items */}
            {form.selected_items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9AA8B5', border: '1px dashed rgba(198,168,94,.2)', borderRadius: '10px' }}>
                No items selected yet. Click "Add from Menu" to build your menu.
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 40px', gap: '8px', padding: '8px 12px', marginBottom: '8px' }}>
                  {['Item', 'Qty / Per Person', 'Unit Price', 'Override', 'Total', ''].map(h => (
                    <div key={h} style={{ color: '#9AA8B5', fontSize: '10px', letterSpacing: '1px', fontFamily: 'sans-serif' }}>{h}</div>
                  ))}
                </div>
                {form.selected_items.map((item, idx) => {
                  const price = item.override_price != null ? item.override_price : item.unit_price;
                  const qty = item.per_person ? form.guest_count : item.quantity;
                  const lineTotal = price * qty;
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px 40px', gap: '8px', padding: '10px 12px', background: 'rgba(245,240,232,.03)', border: '1px solid rgba(198,168,94,.1)', borderRadius: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} value={item.item_name} onChange={e => updateItem(idx, 'item_name', e.target.value)} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!item.per_person} onChange={e => updateItem(idx, 'per_person', e.target.checked)} />
                          <span style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif' }}>Per Person</span>
                        </label>
                        {!item.per_person && (
                          <input style={{ ...S.input, padding: '5px 8px', fontSize: '12px' }} type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                        )}
                      </div>
                      <span style={{ color: '#9AA8B5', fontSize: '13px', fontFamily: 'sans-serif' }}>${item.unit_price}</span>
                      <input style={{ ...S.input, padding: '7px 10px', fontSize: '13px' }} type="number" min="0" step="0.01" placeholder="Override" value={item.override_price ?? ''} onChange={e => updateItem(idx, 'override_price', e.target.value === '' ? null : parseFloat(e.target.value))} />
                      <span style={{ color: '#C6A85E', fontSize: '13px', fontWeight: 600, fontFamily: 'sans-serif' }}>${lineTotal.toFixed(0)}</span>
                      <button onClick={() => removeItem(idx)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#C57C5D' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Terms */}
          <div style={S.section}>
            <p style={S.sectionTitle}>TERMS & CONDITIONS</p>
            <textarea style={{ ...S.input, height: '100px', resize: 'vertical' }} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />
          </div>
        </div>

        {/* RIGHT: Totals & Profit */}
        <div style={{ position: 'sticky', top: '24px' }}>
          {/* Rate Settings */}
          <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ ...S.sectionTitle, marginBottom: '16px' }}>PRICING RATES</p>
            {[
              ['Tax Rate (%)', 'tax_rate'], ['Service Charge (%)', 'service_charge_rate'], ['Deposit (%)', 'deposit_rate']
            ].map(([label, key]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <label style={S.label}>{label.toUpperCase()}</label>
                <input style={{ ...S.input, padding: '8px 12px' }} type="number" min="0" max="100" step="0.01" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))} />
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ ...S.sectionTitle, marginBottom: '16px' }}>QUOTE SUMMARY</p>
            {[
              ['Food Subtotal', totals.food_subtotal],
              totals.labor_cost > 0 && [`Labor (${(form.staffing||[]).reduce((s,r)=>s+(r.count||0),0)} staff)`, totals.labor_cost],
              form.bar_package && ['Bar Package', totals.bar_total],
              form.rentals_needed && ['Rentals (est.)', totals.rentals_total],
              [`Service Charge (${form.service_charge_rate}%)`, totals.service_charge_amount],
              [`Tax (${form.tax_rate}%)`, totals.tax_amount],
            ].filter(Boolean).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#9AA8B5', fontSize: '13px', fontFamily: 'sans-serif' }}>{label}</span>
                <span style={{ color: '#D4C9B8', fontSize: '13px', fontFamily: 'sans-serif' }}>${val.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(198,168,94,.2)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#F5F0E8', fontSize: '16px', fontWeight: 600 }}>Total</span>
              <span style={{ color: '#C6A85E', fontSize: '22px', fontWeight: 300 }}>${totals.grand_total.toFixed(2)}</span>
            </div>
            <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(198,168,94,.08)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#C6A85E', fontSize: '13px', fontFamily: 'sans-serif' }}>Deposit ({form.deposit_rate}%)</span>
              <span style={{ color: '#C6A85E', fontSize: '15px', fontWeight: 700, fontFamily: 'sans-serif' }}>${totals.deposit_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Profit Snapshot */}
          <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ ...S.sectionTitle, marginBottom: '16px' }}>PROFIT SNAPSHOT</p>
            {[
              ['Food Cost %', `${totals.food_cost_percent}%`, totals.food_cost_percent < 35 ? '#4CAF50' : totals.food_cost_percent < 45 ? '#FF9800' : '#F44336'],
              ['Labor %', totals.labor_cost > 0 ? `${Math.round((totals.labor_cost / totals.grand_total) * 100)}%` : 'N/A', '#9AA8B5'],
              ['Projected Margin', `${totals.projected_margin}%`, totals.projected_margin > 40 ? '#4CAF50' : totals.projected_margin > 25 ? '#FF9800' : '#F44336'],
              ['Guests', String(form.guest_count), '#D4C9B8'],
              ['Price / Person', form.guest_count > 0 ? `$${(totals.grand_total / form.guest_count).toFixed(0)}` : '$0', '#D4C9B8'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#9AA8B5', fontSize: '13px', fontFamily: 'sans-serif' }}>{label}</span>
                <span style={{ color: color, fontSize: '14px', fontWeight: 600, fontFamily: 'sans-serif' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
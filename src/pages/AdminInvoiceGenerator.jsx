import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, ExternalLink,
  Copy, RefreshCw, FileText, DollarSign, AlertCircle, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

const blankItem = () => ({ name: '', amount: '', quantity: '1' });

const STATUS_COLOR = {
  UNPAID: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
  CANCELED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-purple-100 text-purple-700',
  SCHEDULED: 'bg-indigo-100 text-indigo-700',
};

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s) {
  if (!s) return '—';
  try { return format(new Date(s), 'MMM d, yyyy'); } catch { return s; }
}

// ─── Invoice List Tab ─────────────────────────────────────────────────────────
function InvoiceList() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('outstanding');

  const { data, isLoading } = useQuery({
    queryKey: ['square-invoices'],
    queryFn: async () => {
      const res = await base44.functions.invoke('squareListInvoices', {});
      return res.data;
    },
    staleTime: 60_000,
  });

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['square-invoices'] });
    setRefreshing(false);
  };

  const invoices = data?.invoices || [];
  const outstanding = invoices.filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(i.status));
  const totalOutstanding = outstanding.reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);
  const displayed = filter === 'outstanding' ? outstanding : invoices;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[rgb(150,170,155)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-[rgb(107,85,64)]">{invoices.length}</div>
          <div className="text-xs text-[rgb(150,150,150)] mt-1">All Invoices</div>
        </div>
        <div className="bg-white border border-yellow-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-yellow-700">{outstanding.length}</div>
          <div className="text-xs text-[rgb(150,150,150)] mt-1">Outstanding</div>
        </div>
        <div className="bg-white border border-[rgb(235,225,213)] rounded-xl p-4 text-center">
          <div className="text-2xl font-light text-[rgb(107,85,64)]">{fmtMoney(totalOutstanding)}</div>
          <div className="text-xs text-[rgb(150,150,150)] mt-1">Owed Total</div>
        </div>
      </div>

      {/* Filter toggle + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[rgb(235,225,213)] rounded-lg p-1">
          {[
            { key: 'outstanding', label: `Outstanding (${outstanding.length})` },
            { key: 'all', label: `All (${invoices.length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${filter === f.key ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-1 text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)]">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Invoice rows */}
      <div className="space-y-2">
        {displayed.map(inv => (
          <div 
            key={inv.id} 
            onClick={() => inv.publicUrl && window.open(inv.publicUrl, '_blank')}
            className={`bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3 ${inv.publicUrl ? 'cursor-pointer hover:border-[rgb(150,170,155)] hover:shadow-md transition-all' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[rgb(150,150,150)] font-mono">#{inv.invoiceNumber}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                    {inv.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm font-medium text-[rgb(45,45,45)] mt-0.5 truncate">{inv.recipientName || '—'}</div>
                {inv.recipientEmail && <div className="text-xs text-[rgb(150,150,150)]">{inv.recipientEmail}</div>}
                <div className="text-xs text-[rgb(150,150,150)] mt-0.5">{inv.title}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[rgb(107,85,64)]">{fmtMoney(inv.amountDue)}</div>
                {inv.amountPaid > 0 && (
                  <div className="text-xs text-green-600">{fmtMoney(inv.amountPaid)} paid</div>
                )}
                <div className="text-xs text-[rgb(150,150,150)] mt-0.5">Due {fmtDate(inv.dueDate)}</div>
              </div>
            </div>
            {inv.publicUrl && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[rgb(150,170,155)] flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Click to open payment link
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(inv.publicUrl); }}
                  className="text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center py-12 text-[rgb(150,150,150)] text-sm">
            {filter === 'outstanding' ? 'No outstanding invoices — you\'re all caught up! 🎉' : 'No invoices found in Square.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Invoice Tab ──────────────────────────────────────────────────────────
function NewInvoice({ rooms, treatments, packages }) {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState([blankItem()]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [taxes, setTaxes] = useState({
    stateTax: false,
    cityTax: false,
    hotelTax: false,
  });
  const [taxRates] = useState({
    stateTax: 6.25,
    cityTax: 2,
    hotelTax: 15,
  });

  const setItem = (idx, key, val) => {
    setLineItems(items => items.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  };

  const RITUAL_ROOMS = [
    { id: 'suite1', name: 'Suite 1', price: '' },
    { id: 'suite2', name: 'Suite 2', price: '' },
    { id: 'suite3', name: 'Suite 3', price: '' },
    { id: 'suite5', name: 'Suite 5', price: '' },
    { id: 'carriage', name: 'Carriage House', price: '' },
  ];

  // Quick-add from dropdown
  const addCatalogItem = (val) => {
    if (!val) return;
    const [type, id] = val.split('::');
    let entry = null;
    if (type === 'room') {
      const r = RITUAL_ROOMS.find(x => x.id === id);
      if (r) entry = { name: `Room – ${r.name}`, amount: String(r.price || ''), quantity: '1', _type: 'room' };
    } else if (type === 'treatment') {
      const t = treatments.find(x => x.id === id);
      if (t) entry = { name: t.name, amount: String(t.price || ''), quantity: '1', _type: 'treatment' };
    } else if (type === 'pkg') {
      const p = packages.find(x => x.id === id);
      if (p) entry = { name: p.title, amount: String(p.price || ''), quantity: '1', _type: 'pkg' };
    }
    if (entry) {
      setLineItems(items => {
        const clean = items.filter(it => it.name || it.amount);
        return [...clean, entry];
      });
    }
  };

  const subtotal = lineItems.reduce((sum, it) => {
    return sum + (parseFloat(it.amount) || 0) * (parseInt(it.quantity) || 1);
  }, 0);

  // Taxes only apply to hotel/room items (not treatments)
  const taxableSubtotal = lineItems.reduce((sum, it) => {
    const isTreatment = it._type === 'treatment';
    if (isTreatment) return sum;
    return sum + (parseFloat(it.amount) || 0) * (parseInt(it.quantity) || 1);
  }, 0);

  const taxAmount = Object.entries(taxes).reduce((sum, [key, isChecked]) => {
    if (!isChecked) return sum;
    return sum + (taxableSubtotal * (taxRates[key] || 0) / 100);
  }, 0);

  const total = subtotal + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = lineItems.filter(it => it.name && parseFloat(it.amount) > 0);
    if (!validItems.length) { alert('Add at least one line item with a name and amount.'); return; }
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke('squareCreateInvoice', {
      customerName,
      customerEmail,
      note,
      dueDate: dueDate || undefined,
      lineItems: validItems.map(it => ({
        name: it.name,
        amount: parseFloat(it.amount),
        quantity: parseInt(it.quantity) || 1,
      })),
    });
    setLoading(false);
    if (res.data?.success) {
      setResult({ success: true, publicUrl: res.data.publicUrl, invoiceId: res.data.invoiceId });
      queryClient.invalidateQueries({ queryKey: ['square-invoices'] });
    } else {
      setResult({ success: false, error: res.data?.error || 'Invoice creation failed' });
    }
  };

  const copyLink = () => {
    if (result?.publicUrl) {
      navigator.clipboard.writeText(result.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setCustomerName(''); setCustomerEmail(''); setNote(''); setDueDate('');
    setLineItems([blankItem()]); setResult(null);
  };

  return (
    <div className="space-y-5">
      {result?.success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-medium text-green-800">Invoice created & emailed to {customerEmail}!</p>
          </div>
          {result.publicUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input readOnly value={result.publicUrl} className="flex-1 text-sm border border-green-200 rounded-lg px-3 py-2 bg-white font-mono" />
                <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 border-green-300 text-green-700">
                  {copied ? 'Copied!' : <><Copy className="w-4 h-4 mr-1" />Copy</>}
                </Button>
                <a href={result.publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="shrink-0 border-green-300 text-green-700">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          )}
          <button onClick={resetForm} className="mt-3 text-sm text-green-700 hover:underline">Create another invoice</button>
        </div>
      )}
      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {result.error}
        </div>
      )}

      {!result?.success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Customer */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Customer</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[rgb(107,85,64)]">Full Name *</Label>
                <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required className="mt-1" placeholder="Jane Smith" />
              </div>
              <div>
                <Label className="text-xs text-[rgb(107,85,64)]">Email *</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required className="mt-1" placeholder="jane@example.com" />
              </div>
            </div>
          </div>

          {/* Quick-add catalog */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Add from Catalog</h2>
            <Select onValueChange={addCatalogItem}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a room, treatment, or package to add…" />
              </SelectTrigger>
              <SelectContent>
                <>
                  <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-[rgb(150,150,150)] font-semibold">Rooms</div>
                  {RITUAL_ROOMS.map(r => (
                    <SelectItem key={r.id} value={`room::${r.id}`}>
                      {r.name}
                    </SelectItem>
                  ))}
                </>
                {treatments.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-[rgb(150,150,150)] font-semibold">Treatments</div>
                    {treatments.filter(t => t.is_available !== false).map(t => (
                      <SelectItem key={t.id} value={`treatment::${t.id}`}>
                        {t.name} — ${t.price} ({t.duration_minutes}min)
                      </SelectItem>
                    ))}
                  </>
                )}
                {packages.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[11px] uppercase tracking-widest text-[rgb(150,150,150)] font-semibold">Packages</div>
                    {packages.filter(p => p.is_active !== false).map(p => (
                      <SelectItem key={p.id} value={`pkg::${p.id}`}>
                        {p.title} — ${p.price}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-[rgb(150,150,150)] mt-2">Selecting an item adds it as a line item below. You can still edit the amount or description.</p>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
            <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Line Items</h2>
            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={item.name}
                    onChange={e => setItem(idx, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={e => setItem(idx, 'amount', e.target.value)}
                    className="w-28"
                  />
                  <Input
                    placeholder="Qty"
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', e.target.value)}
                    className="w-16"
                  />
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => setLineItems(items => items.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLineItems(items => [...items, blankItem()])}
              className="mt-3 flex items-center gap-1 text-sm text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)]"
            >
              <Plus className="w-4 h-4" /> Add custom line item
            </button>
            <div className="mt-4 pt-4 border-t border-[rgb(235,225,213)] space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="text-[rgb(150,150,150)]">Subtotal</span>
                 <span className="text-[rgb(107,85,64)]">{fmtMoney(subtotal)}</span>
               </div>
               {taxAmount > 0 && (
                 <div className="flex justify-between text-sm">
                   <span className="text-[rgb(150,150,150)]">Taxes</span>
                   <span className="text-[rgb(107,85,64)]">{fmtMoney(taxAmount)}</span>
                 </div>
               )}
               <div className="flex justify-between font-semibold">
                 <span className="text-[rgb(107,85,64)]">Total</span>
                 <span className="text-[rgb(107,85,64)]">{fmtMoney(total)}</span>
               </div>
             </div>
          </div>

          {/* Taxes */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)]">Taxes (Hotel Items Only)</h2>
            </div>
            <p className="text-xs text-[rgb(150,150,150)]">Texas hotel taxes apply to room/stay charges only — not treatments.</p>
            <div className="space-y-2">
              {[
                { key: 'stateTax', label: 'State Tax (Texas)', rate: 6.25 },
                { key: 'cityTax', label: 'City Tax', rate: 2 },
                { key: 'hotelTax', label: 'Hotel Tax', rate: 15 },
              ].map(tax => (
                <div key={tax.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgb(248,246,242)]">
                  <input
                    type="checkbox"
                    checked={taxes[tax.key]}
                    onChange={e => setTaxes(prev => ({ ...prev, [tax.key]: e.target.checked }))}
                    className="rounded w-4 h-4 accent-[rgb(150,170,155)]"
                  />
                  <label className="flex-1 text-sm text-[rgb(45,45,45)] cursor-pointer">{tax.label}</label>
                  <span className="text-sm font-medium text-[rgb(107,85,64)]">{tax.rate}%</span>
                </div>
              ))}
            </div>
            {taxableSubtotal < subtotal && taxes.stateTax || taxes.cityTax || taxes.hotelTax ? (
              <p className="text-xs text-[rgb(150,170,155)]">Taxes calculated on {fmtMoney(taxableSubtotal)} (hotel items only)</p>
            ) : null}
          </div>

          {/* Options */}
           <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 space-y-4">
             <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-2">Invoice Options</h2>
             <div>
               <Label className="text-xs text-[rgb(107,85,64)]">Due Date</Label>
               <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
             </div>
             <div>
               <Label className="text-xs text-[rgb(107,85,64)]">Note to Customer</Label>
               <Textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1" rows={2} placeholder="Thank you for choosing Hotel RITUAL…" />
             </div>
           </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white py-3 text-base"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Invoice…</>
            ) : `Create & Send Invoice — ${fmtMoney(total)}`}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminInvoiceGenerator() {
  const [user, setUser] = React.useState(null);
  const [tab, setTab] = useState('invoices');

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminInvoiceGenerator')));
  }, []);

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-invoice'],
    queryFn: () => base44.entities.Room.list('name'),
    enabled: !!user,
  });
  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments-invoice'],
    queryFn: () => base44.entities.Treatment.list('sort_order'),
    enabled: !!user,
  });
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-invoice'],
    queryFn: () => base44.entities.Package.list('sort_order'),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Invoices</h1>
            <p className="text-sm text-[rgb(150,150,150)]">Square invoice management</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[rgb(235,225,213)] rounded-xl p-1 mb-6">
          {[
            { key: 'invoices', label: 'All Invoices', icon: FileText },
            { key: 'new', label: 'New Invoice', icon: Plus },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'invoices' && <InvoiceList />}
        {tab === 'new' && <NewInvoice rooms={rooms} treatments={treatments} packages={packages} />}
      </main>
    </div>
  );
}
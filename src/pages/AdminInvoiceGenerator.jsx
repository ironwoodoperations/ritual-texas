import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, ExternalLink,
  Copy, RefreshCw, FileText, DollarSign, AlertCircle, Clock, Search,
  Send, X, Mail, Pencil
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

// Sales Tax (applies to retail items)
const SALES_TAXES = [
  { key: 'sales_state',  label: 'State of Texas',                       rate: 6.25 },
  { key: 'sales_city',   label: 'City of Jacksonville',                  rate: 1.00 },
  { key: 'sales_jedc',   label: 'Jacksonville Economic Development (JEDC)', rate: 0.50 },
  { key: 'sales_county', label: 'Cherokee County',                       rate: 0.50 },
];

// Hotel Occupancy Tax (applies to hotel/room stays)
const HOTEL_TAXES = [
  { key: 'hotel_state',  label: 'State of Texas',          rate: 6.00, note: 'Applies to stays $15+/day.' },
  { key: 'hotel_city',   label: 'City of Jacksonville',    rate: 7.00, note: 'General municipal hotel tax.' },
  { key: 'hotel_venue',  label: 'Jacksonville Venue Tax',  rate: 2.00, note: 'Voter-approved civic projects.' },
];

const ALL_TAXES = [...SALES_TAXES, ...HOTEL_TAXES];

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s) {
  if (!s) return '—';
  try { return format(new Date(s), 'MMM d, yyyy'); } catch { return s; }
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────
function InvoiceDetailModal({ inv, onClose, onRefresh }) {
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState(null);

  const doAction = async (action, extra = {}) => {
    setLoading(action);
    setMsg(null);
    const res = await base44.functions.invoke('squareInvoiceActions', { action, invoiceId: inv.id, version: inv.version, ...extra });
    setLoading('');
    if (res.data?.success) {
      setMsg({ ok: true, text: action === 'send' ? 'Email sent!' : action === 'cancel' ? 'Invoice cancelled.' : action === 'delete' ? 'Deleted.' : 'Done.' });
      onRefresh();
      if (action === 'delete') setTimeout(onClose, 1200);
    } else {
      setMsg({ ok: false, text: res.data?.error || 'Something went wrong.' });
    }
  };

  const canSend = ['UNPAID', 'PARTIALLY_PAID', 'SCHEDULED', 'DRAFT'].includes(inv.status);
  const canCancel = ['UNPAID', 'PARTIALLY_PAID', 'SCHEDULED'].includes(inv.status);
  const canDelete = ['DRAFT', 'CANCELED', 'CANCELLED'].includes(inv.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[rgb(107,85,64)] font-light">Invoice #{inv.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-[rgb(248,246,242)] rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Customer</span>
              <span className="font-medium text-[rgb(45,45,45)]">{inv.recipientName || '—'}</span>
            </div>
            {inv.recipientEmail && (
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(150,150,150)]">Email</span>
                <span className="text-[rgb(45,45,45)]">{inv.recipientEmail}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Amount</span>
              <span className="font-semibold text-[rgb(107,85,64)]">{fmtMoney(inv.amountDue)}</span>
            </div>
            {inv.amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(150,150,150)]">Paid</span>
                <span className="text-green-600 font-medium">{fmtMoney(inv.amountPaid)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Due</span>
              <span className="text-[rgb(45,45,45)]">{fmtDate(inv.dueDate)}</span>
            </div>
          </div>

          {/* Payment link */}
          {inv.publicUrl && (
            <div className="flex gap-2">
              <a href={inv.publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium">
                <ExternalLink className="w-4 h-4" /> Open Payment Page
              </a>
              <button onClick={() => { navigator.clipboard.writeText(inv.publicUrl); }} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
            </div>
          )}

          {/* Edit in Square */}
          <a
            href="https://squareup.com/dashboard/invoices"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)] transition-all"
          >
            <Pencil className="w-4 h-4" /> Edit Invoice in Square Dashboard
          </a>

          {msg && (
            <div className={`text-sm px-4 py-2 rounded-xl ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {canSend && (
              <button
                onClick={() => doAction('send')}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[rgb(150,170,155)] text-white rounded-xl text-sm font-medium hover:bg-[rgb(130,150,135)] transition-all disabled:opacity-60"
              >
                {loading === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Resend Invoice Email
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => { if (confirm('Cancel this invoice? This cannot be undone.')) doAction('cancel'); }}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-orange-300 text-orange-700 rounded-xl text-sm font-medium hover:bg-orange-50 transition-all disabled:opacity-60"
              >
                {loading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Cancel Invoice
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { if (confirm('Permanently delete this invoice?')) doAction('delete'); }}
                disabled={!!loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-red-300 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-60"
              >
                {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Invoice
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice List Tab ─────────────────────────────────────────────────────────
function InvoiceList() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('outstanding');
  const [search, setSearch] = useState('');
  const [selectedInv, setSelectedInv] = useState(null);

  const handleSearch = (val) => {
    setSearch(val);
    if (val.trim()) setFilter('all');
  };

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

  // Enrich invoices with version from raw data (needed for actions)
  const invoicesRaw = data?.invoicesRaw || [];

  const invoices = data?.invoices || [];
  const outstanding = invoices.filter(i => ['UNPAID', 'PARTIALLY_PAID'].includes(i.status));
  const totalOutstanding = outstanding.reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);
  const base = filter === 'outstanding' ? outstanding : invoices;
  const q = search.toLowerCase().trim();
  const displayed = q
    ? base.filter(i =>
        (i.recipientName || '').toLowerCase().includes(q) ||
        (i.recipientEmail || '').toLowerCase().includes(q) ||
        (i.recipientPhone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (i.title || '').toLowerCase().includes(q) ||
        String(i.invoiceNumber || '').includes(q)
      )
    : base;

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(150,150,150)]" />
        <input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white focus:outline-none focus:border-[rgb(198,182,165)]"
        />
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
            onClick={() => setSelectedInv(inv)}
            className="bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3 cursor-pointer hover:border-[rgb(150,170,155)] hover:shadow-md transition-all"
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
            <div className="mt-1.5 text-xs text-[rgb(150,170,155)]">Tap to manage →</div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center py-12 text-[rgb(150,150,150)] text-sm">
            {q ? `No invoices match "${search}".` : filter === 'outstanding' ? 'No outstanding invoices — you\'re all caught up! 🎉' : 'No invoices found in Square.'}
          </div>
        )}
      </div>

      {selectedInv && (
        <InvoiceDetailModal
          inv={selectedInv}
          onClose={() => setSelectedInv(null)}
          onRefresh={refresh}
        />
      )}
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
  const [taxes, setTaxes] = useState(
    Object.fromEntries(ALL_TAXES.map(t => [t.key, false]))
  );

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

  // Hotel items only (for occupancy tax)
  const hotelSubtotal = lineItems.reduce((sum, it) => {
    const isHotel = it._type === 'room';
    if (!isHotel) return sum;
    return sum + (parseFloat(it.amount) || 0) * (parseInt(it.quantity) || 1);
  }, 0);

  // Non-hotel items (for sales tax)
  const retailSubtotal = lineItems.reduce((sum, it) => {
    const isHotel = it._type === 'room';
    if (isHotel) return sum;
    return sum + (parseFloat(it.amount) || 0) * (parseInt(it.quantity) || 1);
  }, 0);

  // Calculate taxes individually
  const taxBreakdown = {};
  let totalTaxAmount = 0;

  SALES_TAXES.forEach(tax => {
    if (taxes[tax.key]) {
      const amount = (retailSubtotal * tax.rate) / 100;
      taxBreakdown[tax.key] = amount;
      totalTaxAmount += amount;
    }
  });

  HOTEL_TAXES.forEach(tax => {
    if (taxes[tax.key]) {
      const amount = (hotelSubtotal * tax.rate) / 100;
      taxBreakdown[tax.key] = amount;
      totalTaxAmount += amount;
    }
  });

  const total = subtotal + totalTaxAmount;

  const handleSubmit = async (e, sendNow = true) => {
    e.preventDefault();
    const validItems = lineItems.filter(it => it.name && parseFloat(it.amount) > 0);
    if (!validItems.length) { alert('Add at least one line item with a name and amount.'); return; }
    setLoading(sendNow ? 'send' : 'save');
    setResult(null);
    const res = await base44.functions.invoke('squareCreateInvoice', {
      customerName,
      customerEmail,
      note,
      dueDate: dueDate || undefined,
      sendNow,
      lineItems: validItems.map(it => ({
        name: it.name,
        amount: parseFloat(it.amount),
        quantity: parseInt(it.quantity) || 1,
      })),
      taxBreakdown: Object.keys(taxBreakdown).length > 0 ? Object.entries(taxBreakdown).map(([key, amount]) => {
        const taxObj = ALL_TAXES.find(t => t.key === key);
        return { name: taxObj?.label, amount };
      }) : undefined,
    });
    setLoading(false);
    if (res.data?.success) {
      setResult({ success: true, saved: res.data.saved, publicUrl: res.data.publicUrl, invoiceId: res.data.invoiceId });
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
            <p className="font-medium text-green-800">
              {result.saved ? 'Invoice saved as draft in Square.' : `Invoice created! Square will email it to ${customerEmail}.`}
            </p>
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

               {/* Individual tax breakdowns */}
               {Object.keys(taxBreakdown).length > 0 && (
                 <div className="space-y-1 bg-[rgb(248,246,242)] p-2 rounded-lg">
                   {Object.entries(taxBreakdown).map(([taxKey, amount]) => {
                     const taxObj = ALL_TAXES.find(t => t.key === taxKey);
                     return (
                       <div key={taxKey} className="flex justify-between text-xs">
                         <span className="text-[rgb(150,150,150)]">{taxObj?.label}</span>
                         <span className="text-[rgb(107,85,64)]">{fmtMoney(amount)}</span>
                       </div>
                     );
                   })}
                 </div>
               )}

               {totalTaxAmount > 0 && (
                 <div className="flex justify-between text-sm font-medium border-t border-[rgb(235,225,213)] pt-2">
                   <span className="text-[rgb(150,150,150)]">Total Taxes</span>
                   <span className="text-[rgb(107,85,64)]">{fmtMoney(totalTaxAmount)}</span>
                 </div>
               )}
               <div className="flex justify-between font-semibold text-base border-t border-[rgb(235,225,213)] pt-2">
                 <span className="text-[rgb(107,85,64)]">Total</span>
                 <span className="text-[rgb(107,85,64)]">{fmtMoney(total)}</span>
               </div>
             </div>
          </div>

          {/* Taxes */}
          <div className="space-y-4">
            {/* Sales Tax Section */}
            <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
              <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Sales Tax (Retail Items)</h2>
              <p className="text-xs text-[rgb(150,150,150)] mb-3">Applies to non-hotel items. Combined rate: 8.25%</p>
              <div className="space-y-2">
                {SALES_TAXES.map(tax => (
                  <div key={tax.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgb(248,246,242)]">
                    <input
                      type="checkbox"
                      checked={taxes[tax.key] || false}
                      onChange={e => setTaxes(prev => ({ ...prev, [tax.key]: e.target.checked }))}
                      className="rounded w-4 h-4 accent-[rgb(150,170,155)]"
                    />
                    <div className="flex-1">
                      <label className="block text-sm text-[rgb(45,45,45)] cursor-pointer font-medium">{tax.label}</label>
                    </div>
                    <span className="text-sm font-medium text-[rgb(107,85,64)]">{tax.rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hotel Occupancy Tax Section */}
            <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
              <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Hotel Occupancy Tax (Room Stays)</h2>
              <p className="text-xs text-[rgb(150,150,150)] mb-3">Applies to hotel/room items only. Combined rate: 15.00%</p>
              <div className="space-y-2">
                {HOTEL_TAXES.map(tax => (
                  <div key={tax.key} className="p-3 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)] transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={taxes[tax.key] || false}
                        onChange={e => setTaxes(prev => ({ ...prev, [tax.key]: e.target.checked }))}
                        className="rounded w-4 h-4 accent-[rgb(150,170,155)]"
                      />
                      <div className="flex-1">
                        <label className="block text-sm text-[rgb(45,45,45)] cursor-pointer font-medium">{tax.label}</label>
                        {tax.note && <p className="text-xs text-[rgb(150,150,150)] mt-0.5">{tax.note}</p>}
                      </div>
                      <span className="text-sm font-medium text-[rgb(107,85,64)] shrink-0">{tax.rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={!!loading}
              onClick={(e) => handleSubmit(e, true)}
              className="w-full bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white py-3 text-base"
            >
              {loading === 'send' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Invoice…</>
              ) : <><Send className="w-4 h-4 mr-2" />Create & Send Invoice — {fmtMoney(total)}</>}
            </Button>
            <Button
              type="button"
              disabled={!!loading}
              onClick={(e) => handleSubmit(e, false)}
              variant="outline"
              className="w-full py-3 text-base border-[rgb(198,182,165)] text-[rgb(107,85,64)]"
            >
              {loading === 'save' ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Draft…</>
              ) : <><FileText className="w-4 h-4 mr-2" />Save as Draft (Don't Send)</>}
            </Button>
          </div>
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
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Square Invoices</h1>
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
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, ExternalLink, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const blankItem = () => ({ name: '', amount: '', quantity: '1' });

export default function AdminInvoiceGenerator() {
  const [user, setUser] = React.useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState([blankItem()]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminInvoiceGenerator')));
  }, []);

  // Pre-fill from packages
  const { data: packages = [] } = useQuery({
    queryKey: ['packages-invoice'],
    queryFn: () => base44.entities.Package.list('sort_order'),
    enabled: !!user,
  });

  const setItem = (idx, key, val) => {
    setLineItems(items => items.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  };

  const addFromPackage = (pkg) => {
    setLineItems(items => [
      ...items.filter(it => it.name || it.amount),
      { name: pkg.title, amount: String(pkg.price || ''), quantity: '1' },
    ]);
  };

  const total = lineItems.reduce((sum, it) => {
    const amt = parseFloat(it.amount) || 0;
    const qty = parseInt(it.quantity) || 1;
    return sum + amt * qty;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = lineItems.filter(it => it.name && parseFloat(it.amount) > 0);
    if (!validItems.length) { alert('Add at least one line item with a name and amount.'); return; }

    setLoading(true);
    setResult(null);
    try {
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
      if (res.data?.success) {
        setResult({ success: true, publicUrl: res.data.publicUrl, invoiceId: res.data.invoiceId });
      } else {
        setResult({ success: false, error: res.data?.error || 'Invoice creation failed' });
      }
    } catch (e) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (result?.publicUrl) {
      navigator.clipboard.writeText(result.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Invoice Generator</h1>
            <p className="text-sm text-[rgb(150,150,150)]">Create a Square invoice with a payment link</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Result Banner */}
        {result?.success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-800">Invoice created & emailed to {customerEmail}!</p>
            </div>
            {result.publicUrl && (
              <div className="space-y-2">
                <p className="text-sm text-green-700">Payment link:</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={result.publicUrl}
                    className="flex-1 text-sm border border-green-200 rounded-lg px-3 py-2 bg-white font-mono"
                  />
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
          </div>
        )}
        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{result.error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Customer</h2>
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

          {/* Quick-add from packages */}
          {packages.length > 0 && (
            <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
              <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Quick-Add Package</h2>
              <div className="flex flex-wrap gap-2">
                {packages.filter(p => p.is_active).map(pkg => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => addFromPackage(pkg)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-[rgb(235,225,213)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)] transition-colors"
                  >
                    {pkg.title} — ${pkg.price?.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
            <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Line Items</h2>
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
                    placeholder="Amount"
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
              <Plus className="w-4 h-4" /> Add line item
            </button>
            <div className="mt-4 pt-4 border-t border-[rgb(235,225,213)] flex justify-between">
              <span className="text-sm text-[rgb(150,150,150)]">Total</span>
              <span className="font-medium text-[rgb(107,85,64)]">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-2">Invoice Options</h2>
            <div>
              <Label className="text-xs text-[rgb(107,85,64)]">Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-[rgb(107,85,64)]">Message / Note to Customer</Label>
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
            ) : `Create & Send Invoice — $${total.toFixed(2)}`}
          </Button>
        </form>
      </main>
    </div>
  );
}
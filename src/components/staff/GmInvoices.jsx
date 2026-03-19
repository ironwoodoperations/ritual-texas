import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Loader2, RefreshCw, Search, ExternalLink, Copy, Mail,
  Trash2, Plus, FileText, Send, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_COLOR = {
  DRAFT:           "bg-gray-100 text-gray-600",
  UNPAID:          "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID:  "bg-blue-100 text-blue-700",
  PAID:            "bg-green-100 text-green-700",
  CANCELED:        "bg-red-100 text-red-500",
  CANCELLED:       "bg-red-100 text-red-500",
  SCHEDULED:       "bg-purple-100 text-purple-700",
};

const fmtMoney = (n) => n != null ? `$${(Number(n)/100).toFixed(2)}` : "—";
const fmtDate  = (s) => s ? new Date(s).toLocaleDateString() : "—";

const ALL_TAXES = [
  { key: "sales_state",  label: "State of Texas (Sales)",               rate: 6.25, group: "sales" },
  { key: "sales_city",   label: "City of Jacksonville (Sales)",          rate: 1.00, group: "sales" },
  { key: "sales_jedc",   label: "JEDC (Sales)",                          rate: 0.50, group: "sales" },
  { key: "sales_county", label: "Cherokee County (Sales)",               rate: 0.50, group: "sales" },
  { key: "hotel_state",  label: "State of Texas (Hotel)",                rate: 6.00, group: "hotel" },
  { key: "hotel_city",   label: "City of Jacksonville (Hotel)",          rate: 7.00, group: "hotel" },
  { key: "hotel_venue",  label: "Jacksonville Venue Tax (Hotel)",        rate: 2.00, group: "hotel" },
];
const SALES_TAXES = ALL_TAXES.filter(t => t.group === "sales");
const HOTEL_TAXES = ALL_TAXES.filter(t => t.group === "hotel");

const RITUAL_ROOMS = [
  { id: "suite1", name: "Suite 1" },
  { id: "suite2", name: "Suite 2" },
  { id: "suite3", name: "Suite 3" },
  { id: "suite5", name: "Suite 5" },
  { id: "carriage", name: "Carriage House" },
];

function blankItem() { return { name: "", amount: "", quantity: "1", _type: "" }; }

// ── Invoice Detail Modal (no cancel button) ───────────────────────────────────
function InvoiceDetailModal({ inv, onClose, onRefresh }) {
  const [loading, setLoading] = useState("");
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const doAction = async (action, extra = {}) => {
    setLoading(action);
    setMsg(null);
    const res = await base44.functions.invoke("squareInvoiceActions", { action, invoiceId: inv.id, version: inv.version, ...extra });
    setLoading("");
    if (res.data?.success) {
      setMsg({ ok: true, text: action === "send" ? "Email sent!" : action === "delete" ? "Deleted." : "Done." });
      onRefresh();
      if (action === "delete") setTimeout(onClose, 1200);
    } else {
      setMsg({ ok: false, text: res.data?.error || "Something went wrong." });
    }
  };

  const canSend   = ["UNPAID","PARTIALLY_PAID","SCHEDULED","DRAFT"].includes(inv.status);
  const canCancel = ["UNPAID","PARTIALLY_PAID","SCHEDULED"].includes(inv.status);
  const canDelete = ["DRAFT","CANCELED","CANCELLED"].includes(inv.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[rgb(107,85,64)] font-light">Invoice #{inv.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-[rgb(248,246,242)] rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Customer</span><span className="font-medium">{inv.recipientName || "—"}</span></div>
            {inv.recipientEmail && <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Email</span><span>{inv.recipientEmail}</span></div>}
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status] || "bg-gray-100 text-gray-600"}`}>{inv.status?.replace("_"," ")}</span>
            </div>
            <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Amount</span><span className="font-semibold text-[rgb(107,85,64)]">{fmtMoney(inv.amountDue)}</span></div>
            {inv.amountPaid > 0 && <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Paid</span><span className="text-green-600 font-medium">{fmtMoney(inv.amountPaid)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Due</span><span>{fmtDate(inv.dueDate)}</span></div>
          </div>

          {inv.publicUrl && (
            <div className="flex gap-2">
              <a href={inv.publicUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium">
                <ExternalLink className="w-4 h-4" /> Open Payment Page
              </a>
              <button onClick={() => { navigator.clipboard.writeText(inv.publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all font-medium">
                <Copy className="w-4 h-4" /> {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          )}

          <a href="https://squareup.com/dashboard/invoices" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(150,150,150)] hover:bg-[rgb(248,246,242)] transition-all">
            Edit Invoice in Square Dashboard
          </a>

          {msg && <div className={`text-sm px-4 py-2 rounded-xl ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

          <div className="flex flex-col gap-2">
            {canSend && (
              <button onClick={() => doAction("send")} disabled={!!loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[rgb(150,170,155)] text-white rounded-xl text-sm font-medium hover:bg-[rgb(130,150,135)] disabled:opacity-60">
                {loading === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Resend Invoice Email
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Invoice List ──────────────────────────────────────────────────────────────
function InvoiceList() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("outstanding");
  const [search, setSearch] = useState("");
  const [selectedInv, setSelectedInv] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["square-invoices-gm"],
    queryFn: async () => (await base44.functions.invoke("squareListInvoices", {})).data,
    staleTime: 60_000,
  });

  const refresh = async () => { setRefreshing(true); await qc.invalidateQueries({ queryKey: ["square-invoices-gm"] }); setRefreshing(false); };

  const invoices = data?.invoices || [];
  const outstanding = invoices.filter(i => ["UNPAID","PARTIALLY_PAID"].includes(i.status));
  const totalOwed = outstanding.reduce((s, i) => s + (i.amountDue - i.amountPaid), 0);
  const activeInvoices = invoices.filter(i => !["PAID","CANCELED","CANCELLED","ARCHIVED"].includes(i.status));
  const base = filter === "outstanding" ? outstanding : activeInvoices;
  const q = search.toLowerCase().trim();
  const displayed = q ? base.filter(i =>
    (i.recipientName||"").toLowerCase().includes(q) ||
    (i.recipientEmail||"").toLowerCase().includes(q) ||
    String(i.invoiceNumber||"").includes(q)
  ) : base;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[rgb(150,170,155)]" /></div>;

  return (
    <div className="space-y-4">
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
          <div className="text-2xl font-light text-[rgb(107,85,64)]">{fmtMoney(totalOwed)}</div>
          <div className="text-xs text-[rgb(150,150,150)] mt-1">Owed Total</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(150,150,150)]" />
        <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm bg-white focus:outline-none" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[rgb(235,225,213)] rounded-lg p-1">
          {[{ key:"outstanding", label:`Outstanding (${outstanding.length})`}, {key:"all", label:`Active (${activeInvoices.length})`}].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${filter === f.key ? "bg-white text-[rgb(107,85,64)] shadow-sm" : "text-[rgb(107,85,64)] hover:bg-white/50"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-1 text-xs text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)]">
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        {displayed.map(inv => (
          <div key={inv.id} onClick={() => setSelectedInv(inv)}
            className="bg-white border border-[rgb(235,225,213)] rounded-xl px-4 py-3 cursor-pointer hover:border-[rgb(150,170,155)] hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[rgb(150,150,150)] font-mono">#{inv.invoiceNumber}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[inv.status] || "bg-gray-100 text-gray-600"}`}>{inv.status?.replace("_"," ")}</span>
                </div>
                <div className="text-sm font-medium text-[rgb(45,45,45)] mt-0.5 truncate">{inv.recipientName || "—"}</div>
                {inv.recipientEmail && <div className="text-xs text-[rgb(150,150,150)]">{inv.recipientEmail}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-[rgb(107,85,64)]">{fmtMoney(inv.amountDue)}</div>
                {inv.amountPaid > 0 && <div className="text-xs text-green-600">{fmtMoney(inv.amountPaid)} paid</div>}
                <div className="text-xs text-[rgb(150,150,150)] mt-0.5">Due {fmtDate(inv.dueDate)}</div>
              </div>
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center py-12 text-[rgb(150,150,150)] text-sm">
            {filter === "outstanding" ? "No outstanding invoices 🎉" : "No invoices found."}
          </div>
        )}
      </div>

      {selectedInv && <InvoiceDetailModal inv={selectedInv} onClose={() => setSelectedInv(null)} onRefresh={refresh} />}
    </div>
  );
}

// ── New Invoice ───────────────────────────────────────────────────────────────
function NewInvoice() {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState([blankItem()]);
  const [taxes, setTaxes] = useState(Object.fromEntries(ALL_TAXES.map(t => [t.key, false])));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: treatments = [] } = useQuery({ queryKey:["gm-treatments"], queryFn:()=>base44.entities.Treatment.list("sort_order") });
  const { data: packages = [] } = useQuery({ queryKey:["gm-packages"], queryFn:()=>base44.entities.Package.list("sort_order") });

  const setItem = (idx, k, v) => setLineItems(items => items.map((it,i) => i===idx ? {...it,[k]:v} : it));

  const addCatalog = (val) => {
    if (!val) return;
    const [type, id] = val.split("::");
    let entry = null;
    if (type === "room") { const r = RITUAL_ROOMS.find(x=>x.id===id); if(r) entry={name:`Room – ${r.name}`,amount:"",quantity:"1",_type:"room"}; }
    else if (type === "treatment") { const t=treatments.find(x=>x.id===id); if(t) entry={name:t.name,amount:String(t.price||""),quantity:"1",_type:"treatment"}; }
    else if (type === "pkg") { const p=packages.find(x=>x.id===id); if(p) entry={name:p.title,amount:String(p.price||""),quantity:"1",_type:"pkg"}; }
    if (entry) setLineItems(items => [...items.filter(it=>it.name||it.amount), entry]);
  };

  const subtotal = lineItems.reduce((s,it) => s+(parseFloat(it.amount)||0)*(parseInt(it.quantity)||1), 0);
  const hotelSub = lineItems.filter(it=>it._type==="room").reduce((s,it) => s+(parseFloat(it.amount)||0)*(parseInt(it.quantity)||1), 0);
  const retailSub = subtotal - hotelSub;

  const taxBreakdown = {};
  let totalTax = 0;
  ALL_TAXES.forEach(t => {
    if (taxes[t.key]) {
      const base = t.group === "hotel" ? hotelSub : retailSub;
      const amt = base * t.rate / 100;
      if (amt > 0) { taxBreakdown[t.key] = amt; totalTax += amt; }
    }
  });

  const total = subtotal + totalTax;

  const handleSubmit = async (sendNow = true) => {
    const valid = lineItems.filter(it => it.name && parseFloat(it.amount) > 0);
    if (!valid.length) { alert("Add at least one line item."); return; }
    setLoading(sendNow ? "send" : "save");
    setResult(null);
    const finalItems = [...valid.map(it => ({ name:it.name, amount:parseFloat(it.amount), quantity:parseInt(it.quantity)||1 }))];
    Object.entries(taxBreakdown).forEach(([key, amount]) => {
      const t = ALL_TAXES.find(x=>x.key===key);
      if (t && amount > 0) finalItems.push({ name:t.label, amount, quantity:1 });
    });
    const res = await base44.functions.invoke("squareCreateInvoice", { customerName, customerEmail, note, dueDate: dueDate||undefined, sendNow, lineItems: finalItems });
    setLoading(false);
    if (res.data?.success) {
      setResult({ success:true, saved:res.data.saved, publicUrl:res.data.publicUrl });
      setShowConfirm(false);
      qc.invalidateQueries({ queryKey:["square-invoices-gm"] });
    } else {
      setResult({ success:false, error: res.data?.error||"Failed" });
    }
  };

  if (result?.success) return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><p className="font-medium text-green-800">{result.saved ? "Invoice saved as draft." : `Invoice sent!`}</p></div>
      {result.publicUrl && (
        <div className="flex gap-2">
          <input readOnly value={result.publicUrl} className="flex-1 text-sm border border-green-200 rounded-lg px-3 py-2 bg-white font-mono" />
          <button onClick={() => { navigator.clipboard.writeText(result.publicUrl); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="px-3 py-2 border border-green-300 rounded-lg text-sm text-green-700">{copied ? "Copied!" : <Copy className="w-4 h-4" />}</button>
          <a href={result.publicUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border border-green-300 rounded-lg text-sm text-green-700"><ExternalLink className="w-4 h-4" /></a>
        </div>
      )}
      <button onClick={() => { setResult(null); setLineItems([blankItem()]); setCustomerName(""); setCustomerEmail(""); setNote(""); setDueDate(""); }} className="text-sm text-green-700 hover:underline">Create another</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {result?.error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{result.error}</div>}

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)]">Customer</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-[rgb(107,85,64)]">Full Name *</Label><Input value={customerName} onChange={e=>setCustomerName(e.target.value)} className="mt-1" placeholder="Jane Smith" /></div>
          <div><Label className="text-xs text-[rgb(107,85,64)]">Email *</Label><Input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} className="mt-1" placeholder="jane@example.com" /></div>
        </div>
      </div>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
        <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Add from Catalog</h2>
        <Select onValueChange={addCatalog}>
          <SelectTrigger><SelectValue placeholder="Select a room, treatment, or package…" /></SelectTrigger>
          <SelectContent>
            <div className="px-3 py-1 text-[11px] uppercase text-[rgb(150,150,150)] font-semibold">Rooms</div>
            {RITUAL_ROOMS.map(r => <SelectItem key={r.id} value={`room::${r.id}`}>{r.name}</SelectItem>)}
            {treatments.length > 0 && <><div className="px-3 py-1 text-[11px] uppercase text-[rgb(150,150,150)] font-semibold">Treatments</div>{treatments.filter(t=>t.is_available!==false).map(t=><SelectItem key={t.id} value={`treatment::${t.id}`}>{t.name} — ${t.price}</SelectItem>)}</>}
            {packages.length > 0 && <><div className="px-3 py-1 text-[11px] uppercase text-[rgb(150,150,150)] font-semibold">Packages</div>{packages.filter(p=>p.is_active!==false).map(p=><SelectItem key={p.id} value={`pkg::${p.id}`}>{p.title} — ${p.price}</SelectItem>)}</>}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
        <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-3">Line Items</h2>
        <div className="space-y-2">
          {lineItems.map((item,idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input placeholder="Description" value={item.name} onChange={e=>setItem(idx,"name",e.target.value)} className="flex-1" />
              <Input placeholder="Price" type="number" min="0" step="0.01" value={item.amount} onChange={e=>setItem(idx,"amount",e.target.value)} className="w-28" />
              <Input placeholder="Qty" type="number" min="1" value={item.quantity} onChange={e=>setItem(idx,"quantity",e.target.value)} className="w-16" />
              {lineItems.length > 1 && <button type="button" onClick={()=>setLineItems(items=>items.filter((_,i)=>i!==idx))}><Trash2 className="w-4 h-4 text-red-400" /></button>}
            </div>
          ))}
        </div>
        <button onClick={()=>setLineItems(items=>[...items,blankItem()])} className="mt-3 flex items-center gap-1 text-sm text-[rgb(150,170,155)]"><Plus className="w-4 h-4" /> Add line item</button>
        <div className="mt-4 pt-4 border-t border-[rgb(235,225,213)] space-y-1">
          <div className="flex justify-between text-sm"><span className="text-[rgb(150,150,150)]">Subtotal</span><span className="text-[rgb(107,85,64)]">${subtotal.toFixed(2)}</span></div>
          {Object.entries(taxBreakdown).map(([key,amt]) => { const t=ALL_TAXES.find(x=>x.key===key); return <div key={key} className="flex justify-between text-xs"><span className="text-[rgb(150,150,150)]">{t?.label}</span><span className="text-[rgb(107,85,64)]">${amt.toFixed(2)}</span></div>; })}
          <div className="flex justify-between font-semibold text-base border-t border-[rgb(235,225,213)] pt-2"><span className="text-[rgb(107,85,64)]">Total</span><span className="text-[rgb(107,85,64)]">${total.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] mb-2">Taxes</h2>
        <p className="text-xs text-[rgb(150,150,150)]">Sales Tax (8.25% combined)</p>
        {SALES_TAXES.map(t => <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={taxes[t.key]||false} onChange={e=>setTaxes(prev=>({...prev,[t.key]:e.target.checked}))} className="rounded accent-[rgb(150,170,155)]" />{t.label} <span className="ml-auto text-[rgb(107,85,64)]">{t.rate}%</span></label>)}
        <p className="text-xs text-[rgb(150,150,150)] mt-2">Hotel Occupancy Tax (15% combined)</p>
        {HOTEL_TAXES.map(t => <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={taxes[t.key]||false} onChange={e=>setTaxes(prev=>({...prev,[t.key]:e.target.checked}))} className="rounded accent-[rgb(150,170,155)]" />{t.label} <span className="ml-auto text-[rgb(107,85,64)]">{t.rate}%</span></label>)}
      </div>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-[rgb(150,150,150)]">Options</h2>
        <div><Label className="text-xs text-[rgb(107,85,64)]">Due Date</Label><Input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="mt-1" /></div>
        <div><Label className="text-xs text-[rgb(107,85,64)]">Note to Customer</Label><Textarea value={note} onChange={e=>setNote(e.target.value)} className="mt-1" rows={2} /></div>
      </div>

      {showConfirm && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">⚠️ Confirm: Send Invoice?</p>
          <p className="text-xs text-amber-700">This will email the invoice to <strong>{customerEmail}</strong> for <strong>${total.toFixed(2)}</strong>.</p>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit(true)} className="flex-1 py-2 bg-[rgb(107,85,64)] text-white text-sm font-medium rounded-lg">Yes, Send</button>
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-amber-300 text-amber-800 text-sm font-medium rounded-lg">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button type="button" disabled={!!loading} onClick={() => setShowConfirm(true)} className="w-full bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white py-3">
          {loading === "send" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Send className="w-4 h-4 mr-2" />Create & Send — ${total.toFixed(2)}</>}
        </Button>
        <Button type="button" disabled={!!loading} onClick={() => handleSubmit(false)} variant="outline" className="w-full py-3 border-[rgb(198,182,165)] text-[rgb(107,85,64)]">
          {loading === "save" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><FileText className="w-4 h-4 mr-2" />Save as Draft</>}
        </Button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GmInvoices() {
  const [tab, setTab] = useState("invoices");
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-light text-[rgb(107,85,64)]">Square Invoices</h2>
      <div className="flex gap-1 bg-[rgb(235,225,213)] rounded-xl p-1">
        {[{ key:"invoices", label:"All Invoices", icon:FileText }, { key:"new", label:"New Invoice", icon:Plus }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab===t.key ? "bg-white text-[rgb(107,85,64)] shadow-sm" : "text-[rgb(107,85,64)] hover:bg-white/50"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      {tab === "invoices" && <InvoiceList />}
      {tab === "new" && <NewInvoice />}
    </div>
  );
}
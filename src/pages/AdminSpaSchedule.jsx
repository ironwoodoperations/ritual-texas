import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Download, RefreshCw, Sparkles, ArrowLeft, Send, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SpaCalendar from '@/components/spa/SpaCalendar';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const toISODate = (d) => d.toISOString().slice(0, 10);

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const STATUS_COLORS = {
  confirmed: '#10b981',
  booked: '#3b82f6',
  canceled: '#ef4444',
  cancelled: '#ef4444',
  completed: '#6b7280',
  'booking.accepted': '#10b981',
  'booking.updated': '#f59e0b',
  'booking.cancelled': '#ef4444',
};

const statusLabel = (s) => (s || '—').replace('booking.', '');

export default function AdminSpaSchedule() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [staffName, setStaffName] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [tipModal, setTipModal] = useState(null);
  const [tipLink, setTipLink] = useState('');
  const [showBookingWidget, setShowBookingWidget] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await base44.functions.invoke('adminSpaBookingsLookup', {
        startISO: new Date(`${date}T00:00:00`).toISOString(),
        endISO: new Date(`${date}T23:59:59`).toISOString(),
        staffName,
        status,
      });
      const data = resp.data;
      if (data?.success) {
        setBookings(data.bookings || []);
        // accumulate staff names so dropdown stays populated when filtered
        setAllStaff(prev => Array.from(new Set([...prev, ...(data.staffNames || [])])).sort());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date, staffName, status]);

  const grouped = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const key = b.staffName || 'Unassigned';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  const handleExportICS = async () => {
    try {
      const resp = await base44.functions.invoke('exportSpaDayIcs', { date, staffName, status });
      const blob = new Blob([resp.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ritual-Spa-${date}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  const handleSendTipRequest = () => {
    if (!tipModal || !tipLink) return;
    
    const smsBody = encodeURIComponent(`💰 Tip Request\n\nThank you for your service! Tip here:\n${tipLink}`);
    const emailSubject = encodeURIComponent('Tip Request');
    const emailBody = encodeURIComponent(`Thank you for your service!\n\nTip here: ${tipLink}`);
    
    // Open native share options or provide both options
    const hasPhone = tipModal.phone;
    const hasEmail = tipModal.email;
    
    if (hasPhone && hasEmail) {
      // Show choice
      const choice = confirm('Send via text message? (Cancel to send email)');
      if (choice && hasPhone) {
        window.location.href = `sms:${tipModal.phone}?body=${smsBody}`;
      } else if (hasEmail) {
        window.location.href = `mailto:${tipModal.email}?subject=${emailSubject}&body=${emailBody}`;
      }
    } else if (hasPhone) {
      window.location.href = `sms:${tipModal.phone}?body=${smsBody}`;
    } else if (hasEmail) {
      window.location.href = `mailto:${tipModal.email}?subject=${emailSubject}&body=${emailBody}`;
    }
    
    setTipModal(null);
    setTipLink('');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Link to={createPageUrl('AdminDashboard')} className="text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>Spa Schedule</h1>
        <p style={{ color: '#666' }}>View and export daily spa appointments from Square</p>
      </div>

      {/* Calendar + Day view layout */}
      <div className="grid gap-6 mb-6 no-print" style={{ gridTemplateColumns: '280px 1fr' }}>
        <SpaCalendar selectedDate={date} onSelectDate={(d) => setDate(d)} />

        {/* Quick summary for selected day */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#3B4831' }}>{bookings.length}</div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            appointment{bookings.length !== 1 ? 's' : ''} on
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>
            {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {loading && <div className="text-xs text-gray-400">Loading…</div>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6 no-print">
        <div>
          <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Date</div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Provider</div>
          <select
            className="border border-input rounded-md h-9 px-3 text-sm bg-white"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          >
            <option value="ALL">All Providers</option>
            {allStaff.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Status</div>
          <select
            className="border border-input rounded-md h-9 px-3 text-sm bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="accepted">Accepted</option>
            <option value="booked">Booked</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <Button onClick={load} disabled={loading} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </Button>

        <div className="ml-auto flex gap-2">
           <Button onClick={() => setShowBookingWidget(true)} className="flex items-center gap-2" style={{ backgroundColor: '#836055', color: 'white' }}>
             <Calendar className="w-4 h-4" />
             Book New Treatment
           </Button>
           <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-2">
             <Printer className="w-4 h-4" />
             Print Day Sheet
           </Button>
           <Button onClick={handleExportICS} className="flex items-center gap-2" style={{ backgroundColor: '#3B4831', color: 'white' }}>
             <Download className="w-4 h-4" />
             Export ICS
           </Button>
         </div>
      </div>

      {/* Day header (shows on print) */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ color: '#666', fontSize: '14px', marginTop: '2px' }}>
              {bookings.length} appointment{bookings.length !== 1 ? 's' : ''}
              {staffName !== 'ALL' ? ` · ${staffName}` : ''}
            </div>
          </div>
          <Sparkles className="w-8 h-8" style={{ color: '#C4A55C', opacity: 0.6 }} />
        </div>

        {bookings.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
            No appointments found for this day.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([provider, items]) => (
              <div key={provider}>
                {/* Provider header */}
                <div style={{
                  fontSize: '12px', fontWeight: '600', textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: '#666',
                  borderBottom: '1px solid #e5e7eb', paddingBottom: '6px', marginBottom: '10px'
                }}>
                  {provider}
                </div>

                <div className="space-y-2">
                  {items.map((b) => {
                    const statusKey = (b.status || '').toLowerCase();
                    const color = STATUS_COLORS[statusKey] || STATUS_COLORS[b.status] || '#6b7280';
                    const endTime = b.durationMinutes
                      ? new Date(new Date(b.startAt).getTime() + b.durationMinutes * 60000)
                      : null;

                    return (
                      <div
                        key={b.id || b.squareBookingId}
                        style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', background: '#fafafa' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>
                              {b.serviceName || b.service || 'Spa Treatment'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#555' }}>
                              {fmtTime(b.startAt)}
                              {endTime ? ` – ${fmtTime(endTime.toISOString())}` : ''}
                              {b.durationMinutes ? ` (${b.durationMinutes} min)` : ''}
                              {b.price ? ` · $${Number(b.price).toFixed(0)}` : ''}
                            </div>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>
                                {b.clientName ? <span style={{ fontWeight: '500' }}>{b.clientName}</span> : null}
                                {b.clientName && (b.email || b.phone) ? ' · ' : ''}
                                {b.email || b.phone || (!b.clientName ? '—' : '')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  fontSize: '11px', fontWeight: '600', padding: '3px 10px',
                                  borderRadius: '999px', whiteSpace: 'nowrap',
                                  backgroundColor: color + '20', color: color,
                                  border: `1px solid ${color}40`
                                }}
                              >
                                {statusLabel(b.status)}
                              </span>
                              <button
                                onClick={() => { setTipModal(b); setTipLink(''); }}
                                className="no-print flex items-center gap-1 px-2 py-1 text-xs rounded border border-[rgb(150,170,155)] text-[rgb(150,170,155)] hover:bg-[rgb(150,170,155)] hover:text-white transition-colors"
                                title="Send tip request"
                              >
                                <Send className="w-3 h-3" />
                                Tip
                              </button>
                            </div>
                            </div>
                            </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          )}
      </div>

      {/* Book New Treatment Box */}
      {showBookingWidget && (
        <div style={{ marginTop: '24px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Book New Treatment</h2>
            <button
              onClick={() => setShowBookingWidget(false)}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
            >
              ×
            </button>
          </div>
          <iframe 
            src="https://ritualtexas.simplybook.me" 
            style={{ width: '100%', height: '600px', border: 'none', borderRadius: '4px' }}
            title="Book Treatment"
          />
        </div>
      )}

          <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
          }
          `}</style>

      {/* Tip Request Modal */}
      <Dialog open={!!tipModal} onOpenChange={() => { setTipModal(null); setTipLink(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[rgb(107,85,64)]">Send Tip Request</DialogTitle>
          </DialogHeader>
          {tipModal && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-sm font-medium text-[rgb(45,45,45)]">{tipModal.clientName || 'Guest'}</p>
                {tipModal.email && <p className="text-xs text-[rgb(150,150,150)]">{tipModal.email}</p>}
                {tipModal.phone && <p className="text-xs text-[rgb(150,150,150)]">{tipModal.phone}</p>}
              </div>
              
              <div>
                <label className="text-xs uppercase tracking-wide text-[rgb(150,150,150)] mb-1 block">Tipping Link</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={tipLink}
                  onChange={(e) => setTipLink(e.target.value)}
                  className="border-[rgb(235,225,213)]"
                />
                <p className="text-xs text-[rgb(150,150,150)] mt-1">Paste your tip link (e.g., Stripe, Square, Venmo)</p>
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => { setTipModal(null); setTipLink(''); }} 
                  className="px-4 py-2 text-sm border border-[rgb(235,225,213)] rounded-lg text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTipRequest}
                  disabled={!tipLink}
                  className="px-4 py-2 text-sm bg-[rgb(150,170,155)] text-white rounded-lg hover:bg-[rgb(130,150,135)] disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
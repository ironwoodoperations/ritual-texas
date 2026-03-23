import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Search, ArrowLeft, RefreshCw, LogIn, LogOut, CreditCard,
  Loader2, Link2, CheckCircle2
} from 'lucide-react';
import PageHelpBanner from '@/components/PageHelpBanner';

const HELP_CONTENT = `Live Cloudbeds hotel reservations — view upcoming stays, check guests in/out, and take payments.

CLOUDBEDS (UPCOMING) TAB
• Shows all upcoming and in-house reservations pulled live from Cloudbeds.
• Search by guest name, email, or confirmation ID.
• Click Refresh to pull the latest data if something looks stale.

FILTER TABS
• Upcoming, Past, Cancelled, and All tabs appear above the reservation list. Use Past and Cancelled to look up historical stays or resolve guest disputes.

ACTIONS PER RESERVATION
• Check In — marks the guest as checked in inside Cloudbeds (use on arrival day).
• Check Out — marks the guest as departed. Do this after key return.
• Payment — records a payment against the reservation. Two sources: Cloudbeds/OTA (folio-based or OTA-collected) or Square (card payment processed via Square). Always select the correct source before posting.

NEW RESERVATION TAB
• Creates a reservation directly in Cloudbeds without logging into Cloudbeds separately.
• Select dates → click Check Availability → choose a room → fill in guest info → submit.
• The reservation will appear in Cloudbeds immediately and sync to Today's Itineraries.

CONNECT CLOUDBEDS (top right button)
• Use only if the connection drops. Normally the token auto-refreshes.
• If hotel data is missing, try Admin → Cloudbeds Integration → Refresh Token first.

Pro Tip: When posting a payment, always select the correct source — Cloudbeds/OTA for folio charges and OTA-collected amounts, or Square for card payments processed through the Square terminal.`;
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const blankForm = {
  guestFirstName: '', guestLastName: '', guestEmail: '', guestPhone: '',
  roomTypeID: '', startDate: '', endDate: '', adults: '1', notes: '',
};

export default function AdminBookings() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cloudbeds');
  const [actionLoading, setActionLoading] = useState({});
  const [actionResult, setActionResult] = useState({});
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cardError, setCardError] = useState('');

  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cbStatusFilter, setCbStatusFilter] = useState('upcoming');

  // New Reservation form state
  const [form, setForm] = useState(blankForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formResult, setFormResult] = useState(null);
  const [roomsSearched, setRoomsSearched] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSearchRooms = form.startDate && form.endDate && form.startDate < form.endDate;

  const { data: availabilityData, isLoading: roomsLoading, refetch: searchRooms } = useQuery({
    queryKey: ['available-rooms', form.startDate, form.endDate],
    queryFn: async () => {
      const res = await base44.functions.invoke('cloudbedsGetAvailableRooms', { startDate: form.startDate, endDate: form.endDate });
      return res.data;
    },
    enabled: false,
  });
  const availableRooms = availabilityData?.rooms || [];

  const handleSearchRooms = () => {
    setRoomsSearched(true);
    searchRooms();
    set('roomTypeID', '');
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormResult(null);
    const res = await base44.functions.invoke('cloudbedsCreateReservation', {
      guestFirstName: form.guestFirstName,
      guestLastName: form.guestLastName,
      guestEmail: form.guestEmail,
      guestPhone: form.guestPhone,
      roomTypeID: form.roomTypeID,
      startDate: form.startDate,
      endDate: form.endDate,
      adults: parseInt(form.adults) || 1,
      notes: form.notes,
    });
    if (res.data?.success) {
      setFormResult({ success: true, reservationID: res.data.reservationID });
      setForm(blankForm);
      setRoomsSearched(false);
    } else {
      setFormResult({ success: false, error: res.data?.error || 'Something went wrong' });
    }
    setFormLoading(false);
  };

  const runAction = async (reservationID, action, extra = {}) => {
    setActionLoading(prev => ({ ...prev, [reservationID]: action }));
    setActionResult(prev => ({ ...prev, [reservationID]: null }));
    const res = await base44.functions.invoke('cloudbedsGuestActions', { action, reservationID, ...extra });
    const msg = res.data?.success ? '✓ Done' : (res.data?.error || 'Error');
    setActionResult(prev => ({ ...prev, [reservationID]: msg }));
    if (res.data?.success) refetchCloudbeds();
    setActionLoading(prev => ({ ...prev, [reservationID]: null }));
  };

  const handlePayment = async () => {
    if (!paymentModal || !paymentAmount) return;
    setCardError('');
    setActionLoading(prev => ({ ...prev, [paymentModal.reservationID]: 'payment' }));
    const res = await base44.functions.invoke('cloudbedsProcessPayment', {
      reservationID: paymentModal.reservationID,
      amount: parseFloat(paymentAmount),
      paymentMethod: paymentMethod === 'card' ? 'card' : 'cash',
    });
    if (res.data?.success) {
      setPaymentModal(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      refetchCloudbeds();
      setActionResult(prev => ({ ...prev, [paymentModal.reservationID]: '✓ Payment recorded' }));
    } else {
      setCardError(res.data?.error || 'Payment failed');
    }
    setActionLoading(prev => ({ ...prev, [paymentModal.reservationID]: null }));
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminBookings')));
  }, []);

  const { data: cloudbedsData, isLoading: cloudbedsLoading, refetch: refetchCloudbeds, error: cloudbedsError } = useQuery({
    queryKey: ['cloudbeds-upcoming'],
    queryFn: async () => {
      const res = await base44.functions.invoke('cloudbedsUpcomingReservations', {});
      setLastSyncTime(new Date());
      return res.data;
    },
    enabled: !!user,
    retry: false,
  });

  const todayCb = new Date().toISOString().slice(0, 10);
  const cloudbedsReservations = (cloudbedsData?.reservations || [])
    .filter(r => {
      const q = search.toLowerCase();
      if (q && !(r.guestName?.toLowerCase().includes(q) || r.guestEmail?.toLowerCase().includes(q) || r.reservationID?.includes(q))) return false;
      if (cbStatusFilter === 'upcoming') return r.checkIn >= todayCb;
      if (cbStatusFilter === 'past') return r.checkOut < todayCb;
      if (cbStatusFilter === 'cancelled') return (r.status || '').toLowerCase() === 'cancelled';
      return true; // 'all'
    })
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Bookings</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Manage all reservations</p>
            </div>
          </div>
          <a
            href="/functions/cloudbedsOAuthStart"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-[rgb(107,85,64)] text-[rgb(107,85,64)] rounded-lg hover:bg-[rgb(235,225,213)] transition-colors"
          >
            <Link2 className="w-4 h-4" /> Connect Cloudbeds
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <PageHelpBanner title="Hotel Bookings (Cloudbeds)" content={HELP_CONTENT} accentColor="rgb(107,85,64)" />
        {/* Tabs */}
        <div className="flex gap-1 bg-[rgb(235,225,213)] p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setActiveTab('cloudbeds')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'cloudbeds' ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}
          >
            Cloudbeds (Upcoming)
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'new' ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}
          >
            + New Reservation
          </button>
        </div>

        {/* Cloudbeds Tab */}
        {activeTab === 'cloudbeds' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(45,45,45)]" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, or confirmation ID..."
                  className="pl-10 border-[rgb(235,225,213)]"
                />
              </div>
              <div className="flex items-center gap-3">
                {lastSyncTime && (
                  <span className="text-xs text-[rgb(150,150,150)]">
                    Synced {lastSyncTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                )}
                <button
                  onClick={async () => { setIsSyncing(true); await refetchCloudbeds(); setIsSyncing(false); }}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[rgb(107,85,64)] border border-[rgb(235,225,213)] rounded-md hover:bg-[rgb(235,225,213)] disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {[
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'past', label: 'Past' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'all', label: 'All' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setCbStatusFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${cbStatusFilter === f.key ? 'bg-[rgb(107,85,64)] text-white' : 'border border-[rgb(235,225,213)] text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)]'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="bg-white border border-[rgb(235,225,213)] overflow-hidden rounded-lg">
              {cloudbedsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
                </div>
              ) : cloudbedsError || !cloudbedsData?.success ? (
                <div className="p-6 space-y-3">
                  <p className="text-sm font-semibold text-red-700">⚠️ Could not load Cloudbeds reservations</p>
                  <pre className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 whitespace-pre-wrap break-all overflow-auto max-h-64">
                    {cloudbedsError ? cloudbedsError.message : JSON.stringify(cloudbedsData, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[rgb(235,225,213)]">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Guest</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Room</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Check-In</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Check-Out</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Balance</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Status</th>
                        <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(235,225,213)]">
                      {cloudbedsReservations.length === 0 && (
                        <tr><td colSpan={7} className="text-center p-8 text-[rgb(45,45,45)]">No upcoming reservations found.</td></tr>
                      )}
                      {cloudbedsReservations.map(r => {
                        const loading = actionLoading[r.reservationID];
                        const result = actionResult[r.reservationID];
                        return (
                          <tr key={r.reservationID} className="hover:bg-[rgb(248,246,242)]">
                            <td className="p-4">
                              <p className="font-medium text-[rgb(107,85,64)]">{r.guestName}</p>
                              <p className="text-xs text-[rgb(45,45,45)]">{r.guestEmail}</p>
                              <p className="text-xs font-mono text-[rgb(150,150,150)]">{r.reservationID}</p>
                            </td>
                            <td className="p-4 text-sm text-[rgb(45,45,45)]">
                              <p>{r.roomName || r.roomTypeName || '—'}</p>
                              {r.roomNumber && <p className="text-xs text-[rgb(150,150,150)]">Room {r.roomNumber}</p>}
                            </td>
                            <td className="p-4 text-sm text-[rgb(45,45,45)]">{r.checkIn ? format(new Date(r.checkIn + 'T12:00:00'), 'MMM d, yyyy') : '—'}</td>
                            <td className="p-4 text-sm text-[rgb(45,45,45)]">{r.checkOut ? format(new Date(r.checkOut + 'T12:00:00'), 'MMM d, yyyy') : '—'}</td>
                            <td className="p-4 text-sm text-[rgb(107,85,64)]">{r.balance != null ? `$${Number(r.balance).toFixed(2)}` : '—'}</td>
                            <td className="p-4">
                              <Badge className="bg-green-100 text-green-800 capitalize">{r.status}</Badge>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button disabled={!!loading} onClick={() => runAction(r.reservationID, 'checkin')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)] disabled:opacity-50">
                                  {loading === 'checkin' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />} Check In
                                </button>
                                <button disabled={!!loading} onClick={() => runAction(r.reservationID, 'checkout')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)] disabled:opacity-50">
                                  {loading === 'checkout' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />} Check Out
                                </button>
                                <button disabled={!!loading}
                                  onClick={() => { setPaymentModal({ reservationID: r.reservationID, guestName: r.guestName, balance: r.balance }); setPaymentAmount(r.balance != null ? String(Number(r.balance).toFixed(2)) : ''); }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-[rgb(107,85,64)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)] disabled:opacity-50">
                                  <CreditCard className="w-3 h-3" /> Payment
                                </button>
                              </div>
                              {result && <p className={`text-xs mt-1 ${result.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{result}</p>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* New Reservation Tab */}
        {activeTab === 'new' && (
          <div className="max-w-2xl">
            {formResult?.success && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Reservation created in Cloudbeds!</p>
                  {formResult.reservationID && <p className="text-sm text-green-700 font-mono">ID: {formResult.reservationID}</p>}
                </div>
              </div>
            )}
            {formResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">{formResult.error}</div>
            )}

            <form onSubmit={handleCreateReservation} className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Guest Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">First Name *</Label>
                    <Input value={form.guestFirstName} onChange={e => set('guestFirstName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">Last Name *</Label>
                    <Input value={form.guestLastName} onChange={e => set('guestLastName', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">Email *</Label>
                    <Input type="email" value={form.guestEmail} onChange={e => set('guestEmail', e.target.value)} required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">Phone</Label>
                    <Input type="tel" value={form.guestPhone} onChange={e => set('guestPhone', e.target.value)} className="mt-1" placeholder="903-555-1234" />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm uppercase tracking-widest text-[rgb(150,150,150)] mb-4">Stay Details</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[rgb(107,85,64)] text-xs">Check-In Date *</Label>
                      <Input type="date" value={form.startDate} onChange={e => { set('startDate', e.target.value); setRoomsSearched(false); set('roomTypeID', ''); }} required className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-[rgb(107,85,64)] text-xs">Check-Out Date *</Label>
                      <Input type="date" value={form.endDate} onChange={e => { set('endDate', e.target.value); setRoomsSearched(false); set('roomTypeID', ''); }} required className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-[rgb(107,85,64)] text-xs">Available Room *</Label>
                      <button type="button" onClick={handleSearchRooms} disabled={!canSearchRooms || roomsLoading}
                        className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-[rgb(150,170,155)] text-white disabled:opacity-40">
                        {roomsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        Check Availability
                      </button>
                    </div>
                    {!roomsSearched && <p className="text-xs text-[rgb(150,150,150)] py-2">Select dates above then click Check Availability.</p>}
                    {roomsSearched && availabilityData && !availabilityData.success && <p className="text-xs text-red-500 py-2">{availabilityData.error}</p>}
                    {roomsSearched && availableRooms.length === 0 && !roomsLoading && availabilityData?.success && <p className="text-xs text-[rgb(150,150,150)] py-2">No rooms available for these dates.</p>}
                    {availableRooms.length > 0 && (
                      <div className="grid gap-2">
                        {availableRooms.map(room => (
                          <button key={room.roomTypeID} type="button" onClick={() => set('roomTypeID', room.roomTypeID)}
                            className={`text-left px-4 py-3 rounded-xl border transition-all ${form.roomTypeID === room.roomTypeID ? 'border-[rgb(107,85,64)] bg-[rgb(248,246,242)]' : 'border-[rgb(235,225,213)] bg-white hover:border-[rgb(198,182,165)]'}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[rgb(45,45,45)]">{room.name}</span>
                              {room.price && <span className="text-sm text-[rgb(107,85,64)]">${Number(room.price).toFixed(0)}/stay</span>}
                            </div>
                            {room.maxOccupancy && <span className="text-xs text-[rgb(150,150,150)]">Max {room.maxOccupancy} guests</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="text" value={form.roomTypeID} required onChange={() => {}} className="sr-only" />
                  </div>

                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">Adults</Label>
                    <Select value={form.adults} onValueChange={v => set('adults', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[rgb(107,85,64)] text-xs">Notes / Special Requests</Label>
                    <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1" rows={3} placeholder="Anniversary, dietary needs, arrival time…" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={formLoading} className="w-full bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white py-3">
                {formLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Reservation…</> : 'Create Reservation in Cloudbeds'}
              </Button>
            </form>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <Dialog open={!!paymentModal} onOpenChange={() => { setPaymentModal(null); setPaymentMethod('cash'); setCardError(''); }}>
        <DialogContent className="max-w-sm bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-[rgb(107,85,64)] font-light">Take Payment</DialogTitle>
          </DialogHeader>
          {paymentModal && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-[rgb(45,45,45)]">Guest: <strong>{paymentModal.guestName}</strong></p>
              {paymentModal.balance != null && (
                <p className="text-sm text-[rgb(45,45,45)]">Balance due: <strong className="text-[rgb(107,85,64)]">${Number(paymentModal.balance).toFixed(2)}</strong></p>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setPaymentMethod('cash'); setCardError(''); }}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${paymentMethod === 'cash' ? 'bg-[rgb(107,85,64)] text-white' : 'bg-white border border-[rgb(235,225,213)] text-[rgb(107,85,64)]'}`}>
                  💵 Cash
                </button>
                <button onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${paymentMethod === 'card' ? 'bg-[rgb(107,85,64)] text-white' : 'bg-white border border-[rgb(235,225,213)] text-[rgb(107,85,64)]'}`}>
                  💳 Card
                </button>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-[rgb(150,150,150)] mb-1 block">Amount ($)</label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="border-[rgb(235,225,213)]" />
              </div>
              {paymentMethod === 'cash' && <div className="text-xs text-[rgb(150,150,150)]">Cash payment — recorded in Cloudbeds</div>}
              {paymentMethod === 'card' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800"><strong>Card Payment:</strong> Will be processed through Cloudbeds payment gateway.</p>
                </div>
              )}
              {cardError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-800">{cardError}</p></div>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setPaymentModal(null); setPaymentMethod('cash'); setCardError(''); }} className="px-4 py-2 text-sm border border-[rgb(235,225,213)] rounded-lg text-[rgb(107,85,64)]">Cancel</button>
                <button onClick={handlePayment} disabled={!paymentAmount || !!actionLoading[paymentModal?.reservationID]}
                  className="px-4 py-2 text-sm bg-[rgb(107,85,64)] text-white rounded-lg hover:bg-[rgb(85,65,45)] disabled:opacity-50 flex items-center gap-2">
                  {actionLoading[paymentModal?.reservationID] === 'payment' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Post Payment
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
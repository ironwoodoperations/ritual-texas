import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Search, RefreshCw, LogIn, LogOut, CreditCard, Loader2, Link2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StaffHotelReservations() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('cloudbeds');
  const [actionLoading, setActionLoading] = useState({});
  const [actionResult, setActionResult] = useState({});
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cardError, setCardError] = useState('');
  const qc = useQueryClient();

  const { data: cloudbedsData, isLoading: cloudbedsLoading, refetch: refetchCloudbeds } = useQuery({
    queryKey: ['staff-cloudbeds-upcoming'],
    queryFn: async () => {
      const res = await base44.functions.invoke('cloudbedsUpcomingReservations', {});
      return res.data;
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['staff-local-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => qc.invalidateQueries(['staff-local-bookings']),
  });

  const runAction = async (reservationID, action) => {
    setActionLoading(prev => ({ ...prev, [reservationID]: action }));
    setActionResult(prev => ({ ...prev, [reservationID]: null }));
    try {
      const res = await base44.functions.invoke('cloudbedsGuestActions', { action, reservationID });
      const msg = res.data?.success ? '✓ Done' : (res.data?.error || 'Error');
      setActionResult(prev => ({ ...prev, [reservationID]: msg }));
      if (res.data?.success) refetchCloudbeds();
    } catch {
      setActionResult(prev => ({ ...prev, [reservationID]: 'Error' }));
    } finally {
      setActionLoading(prev => ({ ...prev, [reservationID]: null }));
    }
  };

  const handlePayment = async () => {
    if (!paymentModal || !paymentAmount) return;
    setCardError('');
    setActionLoading(prev => ({ ...prev, [paymentModal.reservationID]: 'payment' }));
    try {
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
    } catch (e) {
      setCardError(e.message || 'Payment error');
    } finally {
      setActionLoading(prev => ({ ...prev, [paymentModal.reservationID]: null }));
    }
  };

  const cloudbedsReservations = (cloudbedsData?.reservations || [])
    .filter(r => {
      const q = search.toLowerCase();
      return !q || r.guestName?.toLowerCase().includes(q) || r.guestEmail?.toLowerCase().includes(q) || r.reservationID?.includes(q);
    })
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  const filteredBookings = bookings.filter(b =>
    b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.confirmation_code?.toLowerCase().includes(search.toLowerCase()) ||
    b.guest_email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    checked_out: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-light text-[rgb(107,85,64)]">Hotel Reservations</h2>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/functions/cloudbedsOAuthStart"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 text-xs border border-[rgb(235,225,213)] text-[rgb(107,85,64)] rounded-lg hover:bg-[rgb(235,225,213)]"
          >
            <Link2 className="w-3 h-3" /> Connect Cloudbeds
          </a>
          <Link
            to={createPageUrl('AdminCreateReservation')}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-[rgb(150,170,155)] text-white rounded-lg hover:bg-[rgb(130,150,135)]"
          >
            <Plus className="w-3 h-3" /> New Reservation
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[rgb(235,225,213)] p-1 rounded-lg w-fit">
        {[['cloudbeds', 'Cloudbeds (Upcoming)'], ['local', 'Local Bookings']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === key ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(45,45,45)]" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID…"
          className="pl-10 border-[rgb(235,225,213)]"
        />
      </div>

      {/* Cloudbeds tab */}
      {activeTab === 'cloudbeds' && (
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg overflow-hidden">
          <div className="flex justify-end p-3 border-b border-[rgb(235,225,213)]">
            <button onClick={() => refetchCloudbeds()} className="flex items-center gap-2 px-3 py-2 text-xs text-[rgb(107,85,64)] border border-[rgb(235,225,213)] rounded-md hover:bg-[rgb(235,225,213)]">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {cloudbedsLoading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" /></div>
          ) : !cloudbedsData?.success ? (
            <div className="p-8 text-center text-[rgb(107,85,64)]">{cloudbedsData?.error || 'Could not load Cloudbeds reservations.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[rgb(235,225,213)]">
                  <tr>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Guest</th>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Room</th>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Check-In</th>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Check-Out</th>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Balance</th>
                    <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(235,225,213)]">
                  {cloudbedsReservations.length === 0 && (
                    <tr><td colSpan={6} className="text-center p-8 text-[rgb(45,45,45)]">No upcoming reservations.</td></tr>
                  )}
                  {cloudbedsReservations.map(r => {
                    const loading = actionLoading[r.reservationID];
                    const result = actionResult[r.reservationID];
                    return (
                      <tr key={r.reservationID} className="hover:bg-[rgb(248,246,242)]">
                        <td className="p-3">
                          <p className="font-medium text-[rgb(107,85,64)]">{r.guestName}</p>
                          <p className="text-xs text-[rgb(45,45,45)]">{r.guestEmail}</p>
                          <p className="text-xs font-mono text-gray-400">{r.reservationID}</p>
                        </td>
                        <td className="p-3 text-[rgb(45,45,45)]">
                          <p>{r.roomName || r.roomTypeName || '—'}</p>
                          {r.roomNumber && <p className="text-xs text-gray-400">Room {r.roomNumber}</p>}
                        </td>
                        <td className="p-3 text-[rgb(45,45,45)]">{r.checkIn ? format(new Date(r.checkIn + 'T12:00:00'), 'MMM d') : '—'}</td>
                        <td className="p-3 text-[rgb(45,45,45)]">{r.checkOut ? format(new Date(r.checkOut + 'T12:00:00'), 'MMM d') : '—'}</td>
                        <td className="p-3 text-[rgb(107,85,64)] font-medium">{r.balance != null ? `$${Number(r.balance).toFixed(2)}` : '—'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              disabled={!!loading}
                              onClick={() => runAction(r.reservationID, 'checkin')}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[rgb(150,170,155)] text-white hover:bg-[rgb(130,150,135)] disabled:opacity-50"
                            >
                              {loading === 'checkin' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                              In
                            </button>
                            <button
                              disabled={!!loading}
                              onClick={() => runAction(r.reservationID, 'checkout')}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)] disabled:opacity-50"
                            >
                              {loading === 'checkout' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                              Out
                            </button>
                            <button
                              disabled={!!loading}
                              onClick={() => { setPaymentModal({ reservationID: r.reservationID, guestName: r.guestName, balance: r.balance }); setPaymentAmount(r.balance != null ? String(Number(r.balance).toFixed(2)) : ''); }}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-[rgb(107,85,64)] text-[rgb(107,85,64)] hover:bg-[rgb(235,225,213)] disabled:opacity-50"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pay
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
      )}

      {/* Local bookings tab */}
      {activeTab === 'local' && (
        <div className="bg-white border border-[rgb(235,225,213)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[rgb(235,225,213)]">
                <tr>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Guest</th>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Room</th>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Dates</th>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Total</th>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Status</th>
                  <th className="text-left p-3 font-medium text-[rgb(107,85,64)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(235,225,213)]">
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-8 text-[rgb(45,45,45)]">No bookings found.</td></tr>
                )}
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-[rgb(248,246,242)]">
                    <td className="p-3">
                      <p className="font-medium text-[rgb(107,85,64)]">{b.guest_name}</p>
                      <p className="text-xs text-gray-400">{b.confirmation_code}</p>
                    </td>
                    <td className="p-3 text-[rgb(45,45,45)]">{b.room_name}</td>
                    <td className="p-3 text-[rgb(45,45,45)]">
                      {format(new Date(b.check_in_date), 'MMM d')} – {format(new Date(b.check_out_date), 'MMM d')}
                    </td>
                    <td className="p-3 text-[rgb(107,85,64)]">${b.grand_total}</td>
                    <td className="p-3">
                      <Badge className={statusColors[b.booking_status]}>{b.booking_status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-3">
                      <select
                        value={b.booking_status}
                        onChange={e => updateBookingMutation.mutate({ id: b.id, data: { booking_status: e.target.value } })}
                        className="text-xs border border-[rgb(235,225,213)] rounded px-2 py-1 bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Dialog open={!!paymentModal} onOpenChange={() => { setPaymentModal(null); setPaymentMethod('cash'); setCardError(''); }}>
        <DialogContent className="max-w-sm bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-[rgb(107,85,64)] font-light">Take Payment</DialogTitle>
          </DialogHeader>
          {paymentModal && (
            <div className="space-y-4 mt-2">
              <p className="text-sm">Guest: <strong>{paymentModal.guestName}</strong></p>
              {paymentModal.balance != null && (
                <p className="text-sm">Balance: <strong className="text-[rgb(107,85,64)]">${Number(paymentModal.balance).toFixed(2)}</strong></p>
              )}
              <div className="flex gap-2">
                {['cash', 'card'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setPaymentMethod(m); setCardError(''); }}
                    className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${paymentMethod === m ? 'bg-[rgb(107,85,64)] text-white' : 'bg-white border border-[rgb(235,225,213)] text-[rgb(107,85,64)]'}`}
                  >
                    {m === 'cash' ? '💵 Cash' : '💳 Card'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-400 mb-1 block">Amount ($)</label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="border-[rgb(235,225,213)]" />
              </div>
              {cardError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{cardError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setPaymentModal(null); setPaymentMethod('cash'); setCardError(''); }} className="px-4 py-2 text-sm border border-[rgb(235,225,213)] rounded-lg text-[rgb(107,85,64)]">Cancel</button>
                <button
                  onClick={handlePayment}
                  disabled={!paymentAmount || !!actionLoading[paymentModal?.reservationID]}
                  className="px-4 py-2 text-sm bg-[rgb(107,85,64)] text-white rounded-lg hover:bg-[rgb(85,65,45)] disabled:opacity-50 flex items-center gap-2"
                >
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
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const blank = {
  guestFirstName: '', guestLastName: '', guestEmail: '', guestPhone: '',
  roomTypeID: '', startDate: '', endDate: '', adults: '1', notes: '',
};

export default function AdminCreateReservation() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [roomsSearched, setRoomsSearched] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminCreateReservation')));
  }, []);

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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
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
        setResult({ success: true, reservationID: res.data.reservationID });
        setForm(blank);
      } else {
        setResult({ success: false, error: res.data?.error || 'Something went wrong' });
      }
    } catch (e) {
      setResult({ success: false, error: e.message || 'Request failed' });
    } finally {
      setLoading(false);
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
          <Link to={createPageUrl('AdminBookings')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">New Reservation</h1>
            <p className="text-sm text-[rgb(150,150,150)]">Create a reservation in Cloudbeds</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {result?.success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Reservation created!</p>
              {result.reservationID && (
                <p className="text-sm text-green-700 font-mono">ID: {result.reservationID}</p>
              )}
            </div>
          </div>
        )}
        {result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            {result.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 space-y-5">
          {/* Guest Info */}
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

          {/* Stay Details */}
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

              {/* Live Room Availability */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[rgb(107,85,64)] text-xs">Available Room *</Label>
                  <button
                    type="button"
                    onClick={handleSearchRooms}
                    disabled={!canSearchRooms || roomsLoading}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-[rgb(150,170,155)] text-white disabled:opacity-40"
                  >
                    {roomsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Check Availability
                  </button>
                </div>

                {!roomsSearched && (
                  <p className="text-xs text-[rgb(150,150,150)] py-2">Select dates above then click Check Availability.</p>
                )}

                {roomsSearched && availabilityData && !availabilityData.success && (
                  <p className="text-xs text-red-500 py-2">{availabilityData.error}</p>
                )}

                {roomsSearched && availableRooms.length === 0 && !roomsLoading && availabilityData?.success && (
                  <p className="text-xs text-[rgb(150,150,150)] py-2">No rooms available for these dates.</p>
                )}

                {availableRooms.length > 0 && (
                  <div className="grid gap-2">
                    {availableRooms.map(room => (
                      <button
                        key={room.roomTypeID}
                        type="button"
                        onClick={() => set('roomTypeID', room.roomTypeID)}
                        className={`text-left px-4 py-3 rounded-xl border transition-all ${form.roomTypeID === room.roomTypeID ? 'border-[rgb(107,85,64)] bg-[rgb(248,246,242)]' : 'border-[rgb(235,225,213)] bg-white hover:border-[rgb(198,182,165)]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[rgb(45,45,45)]">{room.name}</span>
                          {room.price && <span className="text-sm text-[rgb(107,85,64)]">${Number(room.price).toFixed(0)}/stay</span>}
                        </div>
                        {room.maxOccupancy && <span className="text-xs text-[rgb(150,150,150)]">Max {room.maxOccupancy} guests</span>}
                      </button>
                    ))}
                  </div>
                )}
                {/* Hidden required input to enforce selection */}
                <input type="text" value={form.roomTypeID} required onChange={() => {}} className="sr-only" />
              </div>
              <div>
                <Label className="text-[rgb(107,85,64)] text-xs">Adults</Label>
                <Select value={form.adults} onValueChange={v => set('adults', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[rgb(107,85,64)] text-xs">Notes / Special Requests</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="mt-1" rows={3} placeholder="Anniversary, dietary needs, arrival time…" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white py-3"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Reservation…</>
            ) : 'Create Reservation in Cloudbeds'}
          </Button>
        </form>
      </main>
    </div>
  );
}
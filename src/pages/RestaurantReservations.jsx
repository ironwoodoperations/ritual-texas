import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Users, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function RestaurantReservations() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateTimeRequested: '',
    partySize: 2,
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const reservationsUrl = settings.find(s => s.key === 'RESERVATIONS_URL')?.value;

  const createReservation = useMutation({
    mutationFn: (data) => base44.entities.RestaurantReservationRequests.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-requests'] });
      setSubmitted(true);
      setFormData({ name: '', phone: '', email: '', dateTimeRequested: '', partySize: 2, notes: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createReservation.mutate(formData);
  };

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Calendar style={{ width: '64px', height: '64px', color: '#3B4831', margin: '0 auto' }} />
          <h1 style={{ margin: '20px 0 0 0', fontFamily: 'serif', fontSize: '42px', color: '#3B4831' }}>
            Reservations
          </h1>
          <p style={{ marginTop: '12px', color: '#1B1B1B', fontSize: '16px' }}>
            Reserve your table at RITUAL on Main
          </p>
        </div>

        {reservationsUrl ? (
          <div style={{ textAlign: 'center' }}>
            <a href={reservationsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 40px', background: '#C57C5D', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '18px' }}>
              <Calendar className="w-5 h-5" />
              Make a Reservation
            </a>
          </div>
        ) : (
          <>
            <div style={{ background: '#FCF9F4', padding: '24px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', marginBottom: '32px', textAlign: 'center' }}>
              <Phone className="w-6 h-6" style={{ color: '#3B4831', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, color: '#1B1B1B', lineHeight: '1.6' }}>
                <strong>Call to Reserve:</strong><br />
                <a href="tel:9032846880" style={{ color: '#C57C5D', textDecoration: 'none', fontSize: '20px', fontWeight: 700 }}>(903) 284-6880</a>
              </p>
            </div>

            {submitted && (
              <div style={{ background: 'rgba(150,170,155,.15)', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#3B4831', textAlign: 'center' }}>
                Thank you! We've received your reservation request and will contact you shortly to confirm.
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <h2 style={{ margin: '0 0 24px 0', fontFamily: 'serif', fontSize: '24px', color: '#3B4831' }}>
                Request a Reservation
              </h2>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Name *</label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Phone *</label>
                    <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Email</label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Date & Time *</label>
                    <Input type="datetime-local" value={formData.dateTimeRequested} onChange={(e) => setFormData({...formData, dateTimeRequested: e.target.value})} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Party Size *</label>
                    <Input type="number" min="1" value={formData.partySize} onChange={(e) => setFormData({...formData, partySize: parseInt(e.target.value)})} required />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Special Requests</label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="Any special requests or dietary needs?" />
                </div>

                <Button type="submit" style={{ width: '100%', background: '#3B4831', color: '#FCF9F4', padding: '12px', fontSize: '16px', fontWeight: 700 }}>
                  Submit Reservation Request
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
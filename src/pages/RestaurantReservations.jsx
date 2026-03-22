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
  const [submittedData, setSubmittedData] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const reservationsUrl = settings.find(s => s.key === 'RESERVATIONS_URL')?.value;

  const createReservation = useMutation({
    mutationFn: (data) => base44.entities.RestaurantReservationRequests.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reservation-requests'] });
      setSubmitted(true);
      setSubmittedData(variables);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createReservation.mutate(formData);
  };

  if (submitted && submittedData) {
    return (
      <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✓</div>
          <h1 style={{ margin: '0 0 8px 0', fontFamily: 'serif', fontSize: '32px', color: '#3B4831' }}>
            Reservation Request Received
          </h1>
          <p style={{ margin: '16px 0 24px 0', color: '#1B1B1B', fontSize: '16px', lineHeight: '1.6' }}>
            Thank you, <strong>{submittedData.name}</strong>! We've received your request for{' '}
            {submittedData.partySize ? `${submittedData.partySize} guests` : 'your party'}
            {submittedData.dateTimeRequested ? ` on ${submittedData.dateTimeRequested}` : ''}.
          </p>
          <p style={{ margin: '0 0 32px 0', color: '#666', fontSize: '15px', lineHeight: '1.6' }}>
            Our team will confirm your reservation within a few hours. If you need immediate assistance, call us at <a href="tel:9032846880" style={{ color: '#C57C5D', textDecoration: 'none', fontWeight: 700 }}>(903) 284-6880</a>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
            <a href={`mailto:info@ritualtexas.com?subject=Restaurant%20Reservation%20Inquiry`} style={{ padding: '12px 24px', background: '#C57C5D', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
              Email Us
            </a>
            <a href="tel:9032846880" style={{ padding: '12px 24px', background: '#F0E8DD', color: '#3B4831', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: '1px solid rgba(59,72,49,.1)' }}>
              Call (903) 284-6880
            </a>
          </div>
          <button onClick={() => { setSubmitted(false); setSubmittedData(null); setFormData({ name: '', phone: '', email: '', dateTimeRequested: '', partySize: 2, notes: '' }); }} style={{ color: '#888', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Calendar style={{ width: '64px', height: '64px', color: '#3B4831', margin: '0 auto' }} />
          <h1 style={{ margin: '20px 0 0 0', fontFamily: 'serif', fontSize: '42px', color: '#3B4831' }}>
            Reservations
          </h1>
          <p style={{ marginTop: '12px', color: '#1B1B1B', fontSize: '16px', lineHeight: '1.6' }}>
            Reservations are for special events only.<br />
            Walk-ins welcome during regular hours.
          </p>
        </div>

        <div style={{ background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 16px 0', fontFamily: 'serif', fontSize: '28px', color: '#3B4831' }}>
            No Special Events Posted at This Time
          </h2>
          <p style={{ margin: '0 0 24px 0', color: '#1B1B1B', fontSize: '16px', lineHeight: '1.6' }}>
            Check back soon for upcoming special events and private dining opportunities.
          </p>
          <div style={{ background: 'rgba(59,72,49,.05)', padding: '20px', borderRadius: '12px' }}>
            <Phone className="w-6 h-6" style={{ color: '#3B4831', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#1B1B1B', lineHeight: '1.6' }}>
              <strong>Questions about special events?</strong><br />
              Call us at <a href="tel:9032846880" style={{ color: '#C57C5D', textDecoration: 'none', fontWeight: 700 }}>(903) 284-6880</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
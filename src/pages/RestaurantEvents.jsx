import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RestaurantEvents() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateRequested: '',
    partySize: 10,
    eventType: '',
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const createEventLead = useMutation({
    mutationFn: (data) => base44.entities.RestaurantEventLeads.create(data),
    onSuccess: async (newLead) => {
      queryClient.invalidateQueries({ queryKey: ['event-leads'] });
      
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: 'ritualonmain@gmail.com',
        subject: `New Event Inquiry: ${newLead.eventType}`,
        body: `
          New event inquiry received:
          
          Name: ${newLead.name}
          Phone: ${newLead.phone}
          Email: ${newLead.email}
          Date Requested: ${newLead.dateRequested}
          Party Size: ${newLead.partySize}
          Event Type: ${newLead.eventType}
          
          Notes:
          ${newLead.notes || 'None'}
        `
      });
      
      setSubmitted(true);
      setFormData({ name: '', phone: '', email: '', dateRequested: '', partySize: 10, eventType: '', notes: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createEventLead.mutate(formData);
  };

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Sparkles style={{ width: '64px', height: '64px', color: '#3B4831', margin: '0 auto' }} />
          <h1 style={{ margin: '20px 0 0 0', fontFamily: 'serif', fontSize: '42px', color: '#3B4831' }}>
            Events & Private Dining
          </h1>
          <p style={{ marginTop: '12px', color: '#1B1B1B', fontSize: '16px' }}>
            Host your special occasion at RITUAL on Main
          </p>
        </div>

        {/* Event Packages */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ margin: '0 0 24px 0', fontFamily: 'serif', fontSize: '32px', color: '#3B4831', textAlign: 'center' }}>
            Event Options
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <Users className="w-8 h-8" style={{ color: '#C57C5D', marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '22px', color: '#3B4831', fontWeight: 700 }}>Private Dining</h3>
              <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
                Intimate gatherings for up to 20 guests. Customized menus and dedicated service for your special celebration.
              </p>
            </div>

            <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <Sparkles className="w-8 h-8" style={{ color: '#C57C5D', marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '22px', color: '#3B4831', fontWeight: 700 }}>Corporate Events</h3>
              <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
                Team lunches, client dinners, and business gatherings. Professional service in a relaxed atmosphere.
              </p>
            </div>

            <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
              <Sparkles className="w-8 h-8" style={{ color: '#C57C5D', marginBottom: '16px' }} />
              <h3 style={{ margin: 0, fontSize: '22px', color: '#3B4831', fontWeight: 700 }}>Special Occasions</h3>
              <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
                Birthdays, anniversaries, rehearsal dinners. Make your milestone unforgettable at RITUAL.
              </p>
            </div>
          </div>
        </section>

        {/* Inquiry Form */}
        {submitted && (
          <div style={{ background: 'rgba(150,170,155,.15)', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#3B4831', textAlign: 'center' }}>
            Thank you for your inquiry! We'll be in touch within 24 hours to discuss your event.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontFamily: 'serif', fontSize: '28px', color: '#3B4831' }}>
            Event Inquiry
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Name *</label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Phone *</label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Email *</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Event Date *</label>
                <Input type="date" value={formData.dateRequested} onChange={(e) => setFormData({...formData, dateRequested: e.target.value})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Party Size *</label>
                <Input type="number" min="1" value={formData.partySize} onChange={(e) => setFormData({...formData, partySize: parseInt(e.target.value)})} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Event Type *</label>
                <Select value={formData.eventType} onValueChange={(value) => setFormData({...formData, eventType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Private Dining">Private Dining</SelectItem>
                    <SelectItem value="Corporate Event">Corporate Event</SelectItem>
                    <SelectItem value="Wedding">Wedding</SelectItem>
                    <SelectItem value="Birthday">Birthday</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Event Details *</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={4} placeholder="Tell us about your event - preferences, dietary needs, special requests..." required />
            </div>

            <Button type="submit" style={{ width: '100%', background: '#C57C5D', color: '#FCF9F4', padding: '14px', fontSize: '16px', fontWeight: 700 }}>
              Submit Event Inquiry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
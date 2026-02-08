import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function RestaurantContact() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const createContactLead = useMutation({
    mutationFn: (data) => base44.entities.RestaurantContactLeads.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-leads'] });
      setSubmitted(true);
      setFormData({ name: '', phone: '', email: '', message: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createContactLead.mutate(formData);
  };

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 12px 0', fontFamily: 'serif', fontSize: '42px', color: '#3B4831', textAlign: 'center' }}>
          Contact Us
        </h1>
        <p style={{ marginBottom: '40px', textAlign: 'center', color: '#1B1B1B', fontSize: '16px' }}>
          Questions? We'd love to hear from you.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          {/* Location */}
          <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', textAlign: 'center' }}>
            <MapPin style={{ width: '40px', height: '40px', color: '#3B4831', margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>Visit Us</h3>
            <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
              <a href="https://www.google.com/maps/search/?api=1&query=214+S+Main+Street+Jacksonville+TX+75766" target="_blank" rel="noopener noreferrer" style={{ color: '#C57C5D', textDecoration: 'none' }}>
                214 S. Main Street<br />
                Jacksonville, TX 75766
              </a>
            </p>
          </div>

          {/* Phone */}
          <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', textAlign: 'center' }}>
            <Phone style={{ width: '40px', height: '40px', color: '#3B4831', margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>Call Us</h3>
            <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
              <a href="tel:9032846880" style={{ color: '#C57C5D', textDecoration: 'none', fontSize: '18px', fontWeight: 600 }}>
                (903) 284-6880
              </a>
            </p>
          </div>

          {/* Email */}
          <div style={{ background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', textAlign: 'center' }}>
            <Mail style={{ width: '40px', height: '40px', color: '#3B4831', margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0, fontSize: '20px', color: '#3B4831', fontWeight: 700 }}>Email Us</h3>
            <p style={{ marginTop: '12px', color: '#1B1B1B', lineHeight: '1.6' }}>
              <a href="mailto:ritualonmain@gmail.com" style={{ color: '#C57C5D', textDecoration: 'none' }}>
                ritualonmain@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Map Placeholder */}
        <div style={{ background: '#FCF9F4', padding: '24px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ aspectRatio: '16/9', background: 'rgba(59,72,49,.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B4831' }}>
            Map Embed Placeholder
          </div>
        </div>

        {/* Contact Form */}
        {submitted && (
          <div style={{ background: 'rgba(150,170,155,.15)', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#3B4831', textAlign: 'center' }}>
            Thank you for reaching out! We'll get back to you soon.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: '#FCF9F4', padding: '40px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontFamily: 'serif', fontSize: '28px', color: '#3B4831' }}>
            Send Us a Message
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Name *</label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Phone</label>
                <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Email *</label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#1B1B1B' }}>Message *</label>
              <Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows={5} placeholder="How can we help you?" required />
            </div>

            <Button type="submit" style={{ width: '100%', background: '#3B4831', color: '#FCF9F4', padding: '14px', fontSize: '16px', fontWeight: 700 }}>
              Send Message
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
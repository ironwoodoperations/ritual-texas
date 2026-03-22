import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function TreatmentRequestForm({ treatment, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.RestaurantContactLeads.create({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: `Treatment inquiry: ${treatment.name} (${treatment.duration_minutes} min, $${treatment.price})\n\n${form.message || ''}`.trim(),
      status: 'new',
    });
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <h3 style={{ color: '#3B4831', fontFamily: 'serif', fontSize: '22px', margin: '0 0 8px' }}>Request Sent!</h3>
            <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.6' }}>We'll be in touch shortly to discuss {treatment.name}.</p>
            <button onClick={onClose} style={{ marginTop: '20px', background: '#3B4831', color: '#FCF9F4', border: 'none', borderRadius: '12px', padding: '10px 24px', cursor: 'pointer', fontWeight: 700 }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#3B4831', fontFamily: 'serif', fontSize: '22px', margin: '0 0 4px' }}>Request Info</h3>
              <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>{treatment.name} · {treatment.duration_minutes} min · ${treatment.price}</p>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input required placeholder="Your name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.2)', background: '#fff', fontSize: '14px', outline: 'none' }} />
              <input required type="email" placeholder="Email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.2)', background: '#fff', fontSize: '14px', outline: 'none' }} />
              <input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.2)', background: '#fff', fontSize: '14px', outline: 'none' }} />
              <textarea placeholder="Any questions or preferred dates?" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={3} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.2)', background: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.2)', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: '#C57C5D', color: '#FCF9F4', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                  {loading ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
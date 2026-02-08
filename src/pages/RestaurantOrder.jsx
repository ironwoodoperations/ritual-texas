import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Phone } from 'lucide-react';

export default function RestaurantOrder() {
  const { data: settings = [] } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const toastOrderUrl = settings.find(s => s.key === 'TOAST_ORDER_URL')?.value;

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <ShoppingBag style={{ width: '64px', height: '64px', color: '#3B4831', margin: '0 auto' }} />
        <h1 style={{ margin: '20px 0 0 0', fontFamily: 'serif', fontSize: '42px', color: '#3B4831' }}>
          Order Online
        </h1>
        <p style={{ marginTop: '16px', color: '#1B1B1B', fontSize: '18px', lineHeight: '1.6' }}>
          Pick up your favorite dishes from RITUAL on Main. Fresh, local, and ready when you are.
        </p>

        <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          {toastOrderUrl && (
            <a href={toastOrderUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '16px 40px', background: '#C57C5D', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '18px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingBag className="w-5 h-5" />
              Start Order
            </a>
          )}

          <a href="tel:9032846880" style={{ padding: '16px 40px', background: '#3B4831', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '18px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Phone className="w-5 h-5" />
            Call to Order: (903) 284-6880
          </a>
        </div>

        <div style={{ marginTop: '60px', background: '#FCF9F4', padding: '32px', borderRadius: '18px', border: '1px solid rgba(59,72,49,.1)', textAlign: 'left' }}>
          <h2 style={{ margin: 0, fontFamily: 'serif', fontSize: '24px', color: '#3B4831' }}>Order Information</h2>
          <ul style={{ marginTop: '16px', lineHeight: '1.8', color: '#1B1B1B' }}>
            <li>Online orders ready in 15-30 minutes</li>
            <li>Pickup available during business hours</li>
            <li>Call ahead for large orders or catering</li>
            <li>Payment accepted online or at pickup</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
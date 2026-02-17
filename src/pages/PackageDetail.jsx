import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Leaf, ArrowLeft } from 'lucide-react';

export default function PackageDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package-detail', slug],
    queryFn: async () => {
      if (!slug) return null;
      const all = await base44.entities.Package.filter({ slug });
      return all[0] ?? null;
    },
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <div style={{ background: '#F0E8DD', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#3B4831', fontSize: '18px' }}>Loading…</p>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ color: '#3B4831' }}>Package not found</h2>
        <Link to={createPageUrl('Packages')} style={{ color: '#C57C5D', textDecoration: 'none' }}>← Back to Packages</Link>
      </div>
    );
  }

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        position: 'relative',
        minHeight: '420px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        backgroundImage: pkg.hero_image_url
          ? `url(${pkg.hero_image_url})`
          : 'linear-gradient(160deg, #3B4831 0%, #5a6b47 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.1) 60%)' }} />
        <div style={{ position: 'relative', padding: '32px 28px', maxWidth: '900px' }}>
          <Link to={createPageUrl('Packages')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(252,249,244,0.8)', textDecoration: 'none', fontSize: '14px', marginBottom: '16px' }}>
            <ArrowLeft className="w-4 h-4" /> All Packages
          </Link>
          <h1 style={{ margin: '0 0 8px', fontFamily: 'serif', fontSize: '44px', fontWeight: 300, color: '#FCF9F4', letterSpacing: '0.01em' }}>
            {pkg.title}
          </h1>
          {pkg.subtitle && (
            <p style={{ margin: 0, fontSize: '18px', color: 'rgba(252,249,244,0.85)', fontStyle: 'italic' }}>{pkg.subtitle}</p>
          )}
        </div>
      </section>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Price + Description */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '28px', border: '1px solid rgba(59,72,49,.1)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7B5A', fontWeight: 600 }}>Package Price</p>
            <p style={{ margin: 0, fontSize: '42px', fontWeight: 700, color: '#C57C5D' }}>${pkg.price?.toLocaleString()}</p>
          </div>
          {pkg.short_description && (
            <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '28px', border: '1px solid rgba(59,72,49,.1)' }}>
              <p style={{ margin: 0, color: '#1B1B1B', lineHeight: 1.75, fontSize: '16px' }}>{pkg.short_description}</p>
            </div>
          )}
        </div>

        {/* Includes */}
        {pkg.includes?.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ margin: '0 0 20px', fontFamily: 'serif', fontSize: '30px', color: '#3B4831', fontWeight: 400 }}>What's Included</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {pkg.includes.map((item, i) => (
                <div key={i} style={{ background: '#FCF9F4', borderRadius: '14px', padding: '18px', border: '1px solid rgba(59,72,49,.1)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#90A17B', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#1B1B1B', lineHeight: 1.6, fontSize: '15px' }}>{item}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fine Print */}
        {pkg.fine_print && (
          <section style={{ marginBottom: '32px' }}>
            <div style={{ background: '#FCF9F4', borderRadius: '14px', padding: '24px', border: '1px dashed rgba(59,72,49,.25)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3B4831', fontWeight: 700 }}>Good to Know</p>
              <p style={{ margin: 0, color: '#1B1B1B', lineHeight: 1.7, fontSize: '15px' }}>{pkg.fine_print}</p>
            </div>
          </section>
        )}

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #3B4831, #5a6b47)', borderRadius: '18px', padding: '36px', textAlign: 'center' }}>
          <Leaf className="w-8 h-8" style={{ color: 'rgba(252,249,244,0.6)', margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 10px', fontFamily: 'serif', fontSize: '26px', color: '#FCF9F4', fontWeight: 300 }}>Ready to book?</h3>
          <p style={{ margin: '0 0 24px', color: 'rgba(252,249,244,0.8)', fontSize: '15px' }}>
            Call us to reserve this package — our team will arrange every detail.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:9038106695" style={{ padding: '14px 28px', background: '#C57C5D', color: '#FCF9F4', textDecoration: 'none', borderRadius: '999px', fontWeight: 600, fontSize: '15px' }}>
              (903) 810-6695
            </a>
            <Link to={createPageUrl('BookRooms')} style={{ padding: '14px 28px', background: 'rgba(252,249,244,0.15)', color: '#FCF9F4', textDecoration: 'none', borderRadius: '999px', fontWeight: 600, fontSize: '15px', border: '1px solid rgba(252,249,244,0.3)' }}>
              Book Your Stay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
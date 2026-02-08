import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, ExternalLink } from 'lucide-react';

export default function RestaurantMenu() {
  const [activeCategory, setActiveCategory] = useState('Lunch');

  const { data: settings = [] } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['restaurant-menu-items'],
    queryFn: () => base44.entities.RestaurantMenuItems.filter({ isActive: true }),
  });

  const menuSource = settings.find(s => s.key === 'MENU_SOURCE')?.value || 'MANUAL';
  const menuPdfUrl = settings.find(s => s.key === 'MENU_PDF_URL')?.value || 'https://static1.squarespace.com/static/58571ab2bebafb3c0ff83706/t/65a1576ac3a65005bffbfa6c/1705072490251/RITUAL%2BMenu.pdf';
  const toastMenuUrl = settings.find(s => s.key === 'TOAST_MENU_URL')?.value;

  const categories = ['Lunch', 'Bar', 'Dinner', 'Dessert', 'Espresso', 'Drinks'];
  const filteredItems = menuItems
    .filter(item => item.category === activeCategory)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const sections = [...new Set(filteredItems.map(item => item.section))].filter(Boolean);

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '42px', color: '#3B4831', textAlign: 'center' }}>Menu</h1>
        <p style={{ marginTop: '12px', textAlign: 'center', color: '#1B1B1B', fontSize: '16px' }}>
          Fresh, local, and made with love
        </p>

        {/* PDF MODE */}
        {menuSource === 'PDF' && (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <a href={menuPdfUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', background: '#C57C5D', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>
              <FileText className="w-5 h-5" />
              View Menu PDF
            </a>
            <div style={{ marginTop: '32px', background: '#FCF9F4', padding: '20px', borderRadius: '12px' }}>
              <iframe src={menuPdfUrl} style={{ width: '100%', height: '800px', border: 'none' }} title="Menu PDF" />
            </div>
          </div>
        )}

        {/* TOAST MODE */}
        {menuSource === 'TOAST' && toastMenuUrl && (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <a href={toastMenuUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', background: '#3B4831', color: '#FCF9F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 700 }}>
              <ExternalLink className="w-5 h-5" />
              Open Menu
            </a>
          </div>
        )}

        {/* MANUAL MODE */}
        {menuSource === 'MANUAL' && (
          <>
            {/* Category Filters */}
            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '10px 20px',
                    background: activeCategory === cat ? '#3B4831' : 'transparent',
                    color: activeCategory === cat ? '#FCF9F4' : '#3B4831',
                    border: '2px solid #3B4831',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items */}
            <div style={{ marginTop: '40px' }}>
              {sections.length > 0 ? (
                sections.map(section => (
                  <div key={section} style={{ marginBottom: '40px' }}>
                    <h2 style={{ margin: '0 0 20px 0', fontFamily: 'serif', fontSize: '28px', color: '#3B4831', borderBottom: '2px solid rgba(59,72,49,.2)', paddingBottom: '8px' }}>
                      {section}
                    </h2>
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {filteredItems.filter(item => item.section === section).map(item => (
                        <div key={item.id} style={{ background: '#FCF9F4', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59,72,49,.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#3B4831', fontWeight: 700 }}>{item.name}</h3>
                            <span style={{ fontSize: '18px', color: '#C57C5D', fontWeight: 700 }}>${item.price}</span>
                          </div>
                          {item.description && (
                            <p style={{ margin: '8px 0', color: '#1B1B1B', lineHeight: '1.6' }}>{item.description}</p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {item.tags.map(tag => (
                                <span key={tag} style={{ padding: '4px 8px', background: 'rgba(197,124,93,.15)', color: '#C57C5D', fontSize: '12px', borderRadius: '4px', fontWeight: 600 }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#1B1B1B' }}>
                  Menu items coming soon
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
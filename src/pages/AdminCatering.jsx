import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileText, ShoppingCart, ChefHat, Search, Edit, Copy, Archive, Mail, CheckCircle, DollarSign } from 'lucide-react';

const STATUS_COLORS = {
  draft: { bg: '#F5F0E8', text: '#8B7355' },
  sent: { bg: '#E8EDF5', text: '#3B5B8C' },
  accepted: { bg: '#E8F5EE', text: '#2D7A4F' },
  deposit_paid: { bg: '#EEE8F5', text: '#6B3B8C' },
  completed: { bg: '#E8F5E8', text: '#2D5A2D' },
  archived: { bg: '#F0F0F0', text: '#888' }
};

export default function AdminCatering() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState('quotes'); // quotes | menu

  const { data: quotes = [], refetch } = useQuery({
    queryKey: ['catering-quotes'],
    queryFn: () => base44.entities.CateringQuote.list('-created_date', 100)
  });

  const filtered = quotes.filter(q => {
    const matchSearch = !search || q.client_name?.toLowerCase().includes(search.toLowerCase()) || q.event_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDuplicate = async (q) => {
    const { id, created_date, updated_date, pdf_quote_url, pdf_shopping_url, ...rest } = q;
    await base44.entities.CateringQuote.create({
      ...rest,
      quote_number: `COPY-${Date.now()}`,
      status: 'draft',
      event_name: `${rest.event_name} (Copy)`
    });
    refetch();
  };

  const handleArchive = async (id) => {
    await base44.entities.CateringQuote.update(id, { status: 'archived' });
    refetch();
  };

  const handleStatus = async (id, status) => {
    await base44.entities.CateringQuote.update(id, { status });
    refetch();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", overflowX: 'hidden' }}>
      <style>{`
        @media (max-width: 768px) {
          .catering-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .catering-header-btns { flex-wrap: wrap !important; }
          .catering-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .catering-table-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .catering-table { min-width: 600px !important; }
          .catering-pad { padding: 16px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '20px 16px' }}>
        <div className="catering-header" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#C6A85E', fontSize: '12px', letterSpacing: '3px', margin: '0 0 6px' }}>HOTEL RITUAL</p>
            <h1 style={{ color: '#F5F0E8', fontSize: '28px', fontWeight: 300, margin: 0 }}>Catering</h1>
          </div>
          <div className="catering-header-btns" style={{ display: 'flex', gap: '10px' }}>
            <Link
              to={createPageUrl('AdminCateringQuote')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#C6A85E', color: '#0C1C2C', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}
            >
              <Plus size={15} /> New Quote
            </Link>
            <Link
              to={createPageUrl('AdminCateringMenu')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(198,168,94,.15)', color: '#C6A85E', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', textDecoration: 'none', fontSize: '13px' }}
            >
              <ChefHat size={15} /> Menu Manager
            </Link>
          </div>
        </div>
      </div>

      <div className="catering-pad" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats Row */}
        <div className="catering-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Quotes', value: quotes.length, icon: FileText },
            { label: 'Active', value: quotes.filter(q => ['sent','accepted','deposit_paid'].includes(q.status)).length, icon: CheckCircle },
            { label: 'Total Value', value: `$${quotes.reduce((s, q) => s + (q.grand_total || 0), 0).toLocaleString()}`, icon: DollarSign },
            { label: 'Completed', value: quotes.filter(q => q.status === 'completed').length, icon: ShoppingCart }
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ background: 'rgba(245,240,232,.05)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Icon size={16} color="#C6A85E" />
                <span style={{ color: '#9AA8B5', fontSize: '12px', letterSpacing: '1px' }}>{label.toUpperCase()}</span>
              </div>
              <div style={{ color: '#F5F0E8', fontSize: '26px', fontWeight: 300 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9AA8B5' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quotes..."
              style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {['all', 'draft', 'sent', 'accepted', 'deposit_paid', 'completed', 'archived'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: statusFilter === s ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.2)', background: statusFilter === s ? 'rgba(198,168,94,.15)' : 'transparent', color: statusFilter === s ? '#C6A85E' : '#9AA8B5', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Quotes Table */}
        <div className="catering-table-wrap" style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '16px', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9AA8B5' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '16px' }}>No quotes found</p>
              <Link to={createPageUrl('AdminCateringQuote')} style={{ display: 'inline-block', marginTop: '16px', color: '#C6A85E', textDecoration: 'none' }}>Create your first quote →</Link>
            </div>
          ) : (
            <table className="catering-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(198,168,94,.15)' }}>
                  {['Client', 'Event', 'Date', 'Guests', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', fontWeight: 600 }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, i) => {
                  const sc = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
                  return (
                    <tr key={q.id} style={{ borderBottom: '1px solid rgba(198,168,94,.08)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ color: '#F5F0E8', fontWeight: 600 }}>{q.client_name}</div>
                        {q.company && <div style={{ color: '#9AA8B5', fontSize: '12px' }}>{q.company}</div>}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#D4C9B8', fontSize: '14px' }}>{q.event_name || '—'}</td>
                      <td style={{ padding: '16px 20px', color: '#D4C9B8', fontSize: '14px' }}>{q.event_date || '—'}</td>
                      <td style={{ padding: '16px 20px', color: '#D4C9B8', fontSize: '14px' }}>{q.guest_count || '—'}</td>
                      <td style={{ padding: '16px 20px', color: '#C6A85E', fontSize: '14px', fontWeight: 600 }}>${(q.grand_total || 0).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <select
                          value={q.status}
                          onChange={e => handleStatus(q.id, e.target.value)}
                          style={{ padding: '4px 10px', background: sc.bg, color: sc.text, border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {['draft','sent','accepted','deposit_paid','completed','archived'].map(s => (
                            <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link to={createPageUrl(`AdminCateringQuote?id=${q.id}`)} title="Edit" style={{ padding: '6px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '6px', color: '#C6A85E', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            <Edit size={14} />
                          </Link>
                          <button onClick={() => handleDuplicate(q)} title="Duplicate" style={{ padding: '6px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '6px', color: '#C6A85E', cursor: 'pointer' }}>
                            <Copy size={14} />
                          </button>
                          <button onClick={() => handleArchive(q.id)} title="Archive" style={{ padding: '6px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#9AA8B5', cursor: 'pointer' }}>
                            <Archive size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
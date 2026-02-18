import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, ArrowLeft } from 'lucide-react';

const STATUS_COLORS = {
  new: { bg: 'rgba(90,107,71,.15)', color: '#3B4831' },
  contacted: { bg: 'rgba(197,124,93,.15)', color: '#C57C5D' },
  booked: { bg: 'rgba(59,72,49,.2)', color: '#3B4831' },
  declined: { bg: 'rgba(0,0,0,.08)', color: '#888' },
};

export default function AdminPackageInquiries() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: inquiries = [], isLoading, refetch } = useQuery({
    queryKey: ['package-inquiries', filter],
    queryFn: async () => {
      const all = await base44.entities.PackageInquiry.list('-created_date', 200);
      if (filter === 'all') return all;
      return all.filter(i => i.status === filter);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.PackageInquiry.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['package-inquiries'])
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{ background: '#F0E8DD', minHeight: '100vh', padding: '32px 20px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to={createPageUrl('AdminDashboard')} style={{ color: '#3B4831', display: 'flex', padding: '6px' }}><ArrowLeft size={20} /></Link>
            <div>
            <h1 style={{ margin: 0, fontFamily: 'serif', fontSize: '34px', color: '#3B4831' }}>Package Inquiries</h1>
            <p style={{ margin: '4px 0 0', color: '#6B7B5A', fontSize: '14px' }}>All "Request Package" submissions from the website</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(59,72,49,.25)', fontSize: '14px', background: '#FCF9F4', color: '#3B4831' }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="booked">Booked</option>
              <option value="declined">Declined</option>
            </select>
            <button onClick={() => refetch()} style={{ padding: '8px 12px', background: 'none', border: '1px solid rgba(59,72,49,.25)', borderRadius: '10px', cursor: 'pointer' }}>
              <RefreshCw className="w-4 h-4" style={{ color: '#3B4831' }} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: '#3B4831' }}>Loading…</p>
        ) : inquiries.length === 0 ? (
          <div style={{ background: '#FCF9F4', borderRadius: '18px', padding: '40px', textAlign: 'center', border: '1px solid rgba(59,72,49,.1)', color: '#6B7B5A' }}>
            No inquiries found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {inquiries.map(inq => (
              <div key={inq.id} style={{ background: '#FCF9F4', borderRadius: '16px', padding: '20px', border: '1px solid rgba(59,72,49,.1)', boxShadow: '0 4px 16px rgba(0,0,0,.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '17px', color: '#1B1B1B' }}>{inq.full_name}</span>
                      <span style={{ padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, ...STATUS_COLORS[inq.status] }}>
                        {inq.status?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#3B4831' }}>{inq.package_title}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6B7B5A' }}>
                      {inq.email}{inq.phone ? ` • ${inq.phone}` : ''} • {inq.guests} guest{inq.guests !== 1 ? 's' : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                      Submitted: {formatDateTime(inq.created_date)}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <div style={{ fontSize: '13px', color: '#3B4831', fontWeight: 600 }}>
                      {formatDate(inq.preferred_checkin)} → {formatDate(inq.preferred_checkout)}
                    </div>
                    <select
                      value={inq.status || 'new'}
                      onChange={e => updateMutation.mutate({ id: inq.id, status: e.target.value })}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(59,72,49,.25)', fontSize: '13px', background: '#FCF9F4', color: '#3B4831', cursor: 'pointer' }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="booked">Booked</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>

                {inq.message && (
                  <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(59,72,49,.04)', borderRadius: '10px', fontSize: '13px', color: '#1B1B1B', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 700, color: '#3B4831' }}>Notes: </span>{inq.message}
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a href={`mailto:${inq.email}`} style={{ padding: '6px 14px', background: '#3B4831', color: '#FCF9F4', textDecoration: 'none', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                    Email Guest
                  </a>
                  {inq.phone && (
                    <a href={`tel:${inq.phone}`} style={{ padding: '6px 14px', background: 'none', border: '1px solid rgba(59,72,49,.25)', color: '#3B4831', textDecoration: 'none', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
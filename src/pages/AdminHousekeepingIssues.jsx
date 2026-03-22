import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const SEV_COLORS = {
  low: { bg: '#f0f9f0', text: '#2d7a2d' },
  medium: { bg: '#fff8e0', text: '#8c6b00' },
  high: { bg: '#fff0e8', text: '#8c4020' },
  urgent: { bg: '#fff0f0', text: '#8c2020' },
};

const todayStr = new Date().toISOString().slice(0, 10);
const isOverdue = (issue) =>
  issue.status !== 'resolved' &&
  issue.targetDate &&
  issue.targetDate < todayStr;

export default function AdminHousekeepingIssues() {
  const [editingIssue, setEditingIssue] = useState(null);
  const qc = useQueryClient();

  const { data: issues = [] } = useQuery({
    queryKey: ['hk-issues'],
    queryFn: () => base44.entities.HkIssue.list('-created_date', 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...fields }) => base44.entities.HkIssue.update(id, fields),
    onSuccess: () => { qc.invalidateQueries(['hk-issues']); qc.invalidateQueries(['hk-issues-open']); }
  });

  const open = issues.filter(i => i.status === 'open');
  const acked = issues.filter(i => i.status === 'acknowledged');
  const resolved = issues.filter(i => i.status === 'resolved');

  const IssueCard = ({ issue }) => {
    const sc = SEV_COLORS[issue.severity] || SEV_COLORS.medium;
    const overdue = isOverdue(issue);
    const isEditing = editingIssue?.id === issue.id;

    return (
      <div style={{ background: overdue ? 'rgba(240,128,128,.08)' : 'rgba(245,240,232,.05)', border: overdue ? '1px solid rgba(240,128,128,.2)' : '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <span style={{ color: '#F5F0E8', fontWeight: 600, fontSize: '15px', marginRight: '10px' }}>{issue.roomNumber || issue.roomId}</span>
            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: sc.bg, color: sc.text, fontFamily: 'sans-serif' }}>{issue.severity?.toUpperCase()}</span>
            {overdue && (
              <span style={{ padding: '2px 8px', marginLeft: '8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: 'rgba(240,128,128,.2)', color: '#f08080', fontFamily: 'sans-serif' }}>⚠ OVERDUE</span>
            )}
          </div>
          <span style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif' }}>{issue.type?.replace('_', ' ')}</span>
        </div>
        <p style={{ color: '#D4C9B8', fontSize: '14px', margin: '0 0 12px', lineHeight: '1.5' }}>{issue.description}</p>
        
        {/* Assignee + Target Date */}
        {isEditing ? (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={editingIssue.assignee || ''}
              onChange={(e) => setEditingIssue(i => ({ ...i, assignee: e.target.value }))}
              placeholder="Assignee name"
              style={{ flex: 1, minWidth: '140px', padding: '6px 10px', background: 'rgba(245,240,232,.08)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '6px', color: '#F5F0E8', fontSize: '13px', fontFamily: 'sans-serif', outline: 'none' }}
            />
            <input
              type="date"
              value={editingIssue.targetDate || ''}
              onChange={(e) => setEditingIssue(i => ({ ...i, targetDate: e.target.value }))}
              style={{ padding: '6px 10px', background: 'rgba(245,240,232,.08)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '6px', color: '#F5F0E8', fontSize: '13px', fontFamily: 'sans-serif', outline: 'none' }}
            />
            <button
              onClick={() => {
                updateMutation.mutate({ id: issue.id, assignee: editingIssue.assignee, targetDate: editingIssue.targetDate });
                setEditingIssue(null);
              }}
              style={{ padding: '6px 14px', background: 'rgba(198,168,94,.2)', border: '1px solid rgba(198,168,94,.4)', borderRadius: '6px', color: '#C6A85E', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}
            >
              Save
            </button>
            <button
              onClick={() => setEditingIssue(null)}
              style={{ padding: '6px 10px', background: 'transparent', border: '1px solid rgba(245,240,232,.1)', borderRadius: '6px', color: '#9AA8B5', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
            <button
              onClick={() => setEditingIssue({ id: issue.id, assignee: issue.assignee || '', targetDate: issue.targetDate || '' })}
              style={{ color: '#9AA8B5', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}
            >
              {issue.assignee ? `👤 ${issue.assignee}` : '+ Assign'}
            </button>
            <button
              onClick={() => setEditingIssue({ id: issue.id, assignee: issue.assignee || '', targetDate: issue.targetDate || '' })}
              style={{ color: overdue ? '#f08080' : '#9AA8B5', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', padding: 0 }}
            >
              {issue.targetDate ? `📅 Due ${issue.targetDate}` : '+ Target Date'}
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {issue.status === 'open' && (
            <button onClick={() => updateMutation.mutate({ id: issue.id, status: 'acknowledged' })} style={{ padding: '6px 14px', background: 'rgba(198,168,94,.15)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '6px', color: '#C6A85E', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>
              Acknowledge
            </button>
          )}
          {issue.status !== 'resolved' && (
            <button onClick={() => updateMutation.mutate({ id: issue.id, status: 'resolved' })} style={{ padding: '6px 14px', background: 'rgba(76,175,80,.1)', border: '1px solid rgba(76,175,80,.3)', borderRadius: '6px', color: '#4CAF50', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", color: '#F5F0E8' }}>
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '16px 20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to={createPageUrl('AdminHousekeeping')} style={{ color: '#9AA8B5', display: 'flex' }}><ArrowLeft size={20} /></Link>
          <div>
            <h1 style={{ color: '#F5F0E8', fontSize: '22px', fontWeight: 300, margin: 0 }}>Issues</h1>
            {open.length > 0 && <p style={{ color: '#f08080', fontSize: '13px', margin: '2px 0 0', fontFamily: 'sans-serif' }}>{open.length} open</p>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
        {open.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#f08080', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={12} /> OPEN</p>
            {open.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        )}
        {acked.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>ACKNOWLEDGED</p>
            {acked.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        )}
        {resolved.length > 0 && (
          <div>
            <p style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>RESOLVED</p>
            {resolved.map(i => <IssueCard key={i.id} issue={i} />)}
          </div>
        )}
        {issues.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9AA8B5', border: '1px dashed rgba(198,168,94,.2)', borderRadius: '12px' }}>
            <p style={{ fontFamily: 'sans-serif' }}>No issues reported</p>
          </div>
        )}
      </div>
    </div>
  );
}
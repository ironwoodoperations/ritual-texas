import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, Minus, Plus, AlertTriangle, Save } from 'lucide-react';

const CATEGORY_LABELS = {
  strip: '🛏️ Strip & Reset',
  bath: '🚿 Bathroom',
  bed: '🛏️ Bed & Linens',
  dust: '🧹 Dust & Surfaces',
  floors: '🧽 Floors',
  replenish: '🧴 Replenish',
  inspect: '🔍 Inspect',
  trash: '🗑️ Trash',
  final: '✅ Final',
};

export default function AdminHousekeepingTask() {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');
  const qc = useQueryClient();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issue, setIssue] = useState({ type: 'maintenance', severity: 'medium', description: '' });
  const [housekeeperNotes, setHousekeeperNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  const { data: task } = useQuery({
    queryKey: ['hk-task', taskId],
    queryFn: () => base44.entities.HkTask.filter({ id: taskId }).then(r => r[0]),
    enabled: !!taskId,
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['hk-task-items', taskId],
    queryFn: () => base44.entities.HkTaskItem.filter({ taskId }),
    enabled: !!taskId,
  });

  const { data: roomNotes = [] } = useQuery({
    queryKey: ['hk-room-notes', task?.roomId],
    queryFn: () => base44.entities.HkNote.filter({ roomId: task.roomId, isActive: true }),
    enabled: !!task?.roomId,
  });

  useEffect(() => {
    if (task?.housekeeperNotes) setHousekeeperNotes(task.housekeeperNotes);
  }, [task]);

  const updateItemMutation = useMutation({
    mutationFn: async ({ item, updates }) => {
      await base44.entities.HkTaskItem.update(item.id, updates);
      // recalc totals
      const allItems = await base44.entities.HkTaskItem.filter({ taskId });
      const done = allItems.filter(i => i.isDone).length;
      const pct = allItems.length > 0 ? Math.round(done / allItems.length * 100) : 0;
      await base44.entities.HkTask.update(taskId, { completedItems: done, totalItems: allItems.length, completionPercent: pct });
    },
    onSuccess: () => { qc.invalidateQueries(['hk-task-items', taskId]); qc.invalidateQueries(['hk-task', taskId]); qc.invalidateQueries(['hk-tasks']); }
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.HkTask.update(taskId, data),
    onSuccess: () => { qc.invalidateQueries(['hk-task', taskId]); qc.invalidateQueries(['hk-tasks']); }
  });

  const createIssueMutation = useMutation({
    mutationFn: (data) => base44.entities.HkIssue.create({ ...data, roomId: task.roomId, roomNumber: task.roomNumber, taskId, createdByUserId: 'housekeeper' }),
    onSuccess: () => {
      setShowIssueForm(false);
      setIssue({ type: 'maintenance', severity: 'medium', description: '' });
      updateTaskMutation.mutate({ status: 'needs_review' });
      qc.invalidateQueries(['hk-issues-open']);
    }
  });

  const handleToggleItem = (item) => {
    if (task?.status === 'completed') return;
    const now = new Date().toISOString();
    updateItemMutation.mutate({ item, updates: { isDone: !item.isDone, doneAt: !item.isDone ? now : null } });
  };

  const handleQtyChange = (item, delta) => {
    if (task?.status === 'completed') return;
    const newQty = Math.max(0, (item.qtyDone || 0) + delta);
    const isDone = item.qtyExpected ? newQty >= item.qtyExpected : item.isDone;
    updateItemMutation.mutate({ item, updates: { qtyDone: newQty, isDone } });
  };

  const handleStart = () => updateTaskMutation.mutate({ status: 'in_progress', startedAt: new Date().toISOString() });
  const handlePause = () => updateTaskMutation.mutate({ status: 'paused' });
  const handleComplete = () => updateTaskMutation.mutate({ status: 'completed', completedAt: new Date().toISOString() });
  const handleReopen = () => updateTaskMutation.mutate({ status: 'in_progress' });

  const saveNotes = () => {
    updateTaskMutation.mutate({ housekeeperNotes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const requiredItems = items.filter(i => i.required !== false);
  const requiredDone = requiredItems.filter(i => i.isDone).length;
  const canComplete = task?.status !== 'completed' && requiredDone === requiredItems.length && requiredItems.length > 0;
  const pct = task?.completionPercent || 0;

  const S = {
    page: { minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", color: '#F5F0E8', paddingBottom: '100px' },
    input: { width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' },
  };

  if (!task) return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#9AA8B5', fontFamily: 'sans-serif' }}>Loading...</div></div>;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '16px 20px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to={createPageUrl('AdminHousekeeping')} style={{ color: '#9AA8B5', display: 'flex' }}><ArrowLeft size={20} /></Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#F5F0E8', fontWeight: 600, fontSize: '18px' }}>{task.roomNumber}</div>
            <div style={{ color: '#9AA8B5', fontSize: '12px', fontFamily: 'sans-serif' }}>{task.taskType.replace('_', ' ')} · {task.taskDate}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#C6A85E', fontSize: '20px', fontWeight: 700, fontFamily: 'sans-serif' }}>{pct}%</div>
            <div style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif' }}>{task.completedItems || 0}/{task.totalItems || 0} items</div>
          </div>
        </div>
        <div style={{ maxWidth: '700px', margin: '8px auto 0', height: '4px', background: 'rgba(245,240,232,.1)', borderRadius: '2px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4CAF50' : '#C6A85E', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '16px 20px' }}>
        {/* Admin Notes */}
        {(task.adminNotes || roomNotes.length > 0) && (
          <div style={{ background: 'rgba(198,168,94,.08)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 8px', fontFamily: 'sans-serif' }}>📌 ADMIN NOTES & REQUESTS</p>
            {task.adminNotes && <p style={{ color: '#F5F0E8', fontSize: '14px', margin: '0 0 8px', lineHeight: '1.6' }}>{task.adminNotes}</p>}
            {roomNotes.map(n => (
              <p key={n.id} style={{ color: '#F5F0E8', fontSize: '14px', margin: '4px 0', lineHeight: '1.6' }}>• {n.note}</p>
            ))}
          </div>
        )}

        {/* Checklist */}
        {Object.keys(CATEGORY_LABELS).map(cat => {
          const catItems = grouped[cat];
          if (!catItems?.length) return null;
          return (
            <div key={cat} style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
              <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>{CATEGORY_LABELS[cat]}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catItems.sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0)).map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: item.isDone ? 'rgba(76,175,80,.08)' : 'rgba(245,240,232,.03)', border: `1px solid ${item.isDone ? 'rgba(76,175,80,.2)' : 'rgba(198,168,94,.1)'}`, borderRadius: '8px' }}>
                    {item.qtyExpected != null ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => handleQtyChange(item, -1)} disabled={task.status === 'completed'} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(198,168,94,.3)', background: 'transparent', color: '#C6A85E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                          <span style={{ color: item.isDone ? '#4CAF50' : '#F5F0E8', fontFamily: 'sans-serif', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>{item.qtyDone || 0}/{item.qtyExpected}</span>
                          <button onClick={() => handleQtyChange(item, 1)} disabled={task.status === 'completed'} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid rgba(198,168,94,.3)', background: 'transparent', color: '#C6A85E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                        </div>
                        <span style={{ color: item.isDone ? '#9AA8B5' : '#F5F0E8', fontSize: '14px', flex: 1, textDecoration: item.isDone ? 'line-through' : 'none' }}>{item.label}</span>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleToggleItem(item)} disabled={task.status === 'completed'} style={{ background: 'none', border: 'none', cursor: task.status === 'completed' ? 'default' : 'pointer', padding: 0, display: 'flex' }}>
                          {item.isDone ? <CheckCircle2 size={22} color="#4CAF50" /> : <Circle size={22} color="#9AA8B5" />}
                        </button>
                        <span style={{ color: item.isDone ? '#9AA8B5' : '#F5F0E8', fontSize: '14px', flex: 1, textDecoration: item.isDone ? 'line-through' : 'none' }}>{item.label}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Housekeeper Notes */}
        <div style={{ background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '2px', margin: '0 0 10px', fontFamily: 'sans-serif' }}>📝 HOUSEKEEPER NOTES</p>
          <textarea value={housekeeperNotes} onChange={e => setHousekeeperNotes(e.target.value)} placeholder="Add notes about this room..." rows={3} style={{ ...S.input, resize: 'vertical', marginBottom: '8px' }} />
          <button onClick={saveNotes} style={{ padding: '8px 16px', background: notesSaved ? '#4CAF50' : 'rgba(198,168,94,.15)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: notesSaved ? '#fff' : '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={13} /> {notesSaved ? 'Saved!' : 'Save Notes'}
          </button>
        </div>

        {/* Report Issue */}
        {!showIssueForm ? (
          <button onClick={() => setShowIssueForm(true)} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed rgba(220,60,60,.3)', borderRadius: '10px', color: '#f08080', cursor: 'pointer', fontSize: '14px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={16} /> Report an Issue
          </button>
        ) : (
          <div style={{ background: 'rgba(220,60,60,.05)', border: '1px solid rgba(220,60,60,.2)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <p style={{ color: '#f08080', fontSize: '11px', letterSpacing: '2px', margin: '0 0 12px', fontFamily: 'sans-serif' }}>⚠️ REPORT ISSUE</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={issue.type} onChange={e => setIssue(i => ({ ...i, type: e.target.value }))} style={S.input}>
                <option value="maintenance">Maintenance</option>
                <option value="missing_item">Missing Item</option>
                <option value="damage">Damage</option>
                <option value="odor">Odor</option>
                <option value="pest">Pest</option>
                <option value="other">Other</option>
              </select>
              <select value={issue.severity} onChange={e => setIssue(i => ({ ...i, severity: e.target.value }))} style={S.input}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <textarea value={issue.description} onChange={e => setIssue(i => ({ ...i, description: e.target.value }))} placeholder="Describe the issue..." rows={3} style={{ ...S.input, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowIssueForm(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#9AA8B5', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={() => createIssueMutation.mutate(issue)} disabled={!issue.description || createIssueMutation.isPending} style={{ flex: 2, padding: '10px', background: '#dc3c3c', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', opacity: !issue.description ? 0.5 : 1 }}>
                  Submit Issue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0C1C2C', borderTop: '1px solid rgba(198,168,94,.2)', padding: '14px 20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <div style={{ maxWidth: '700px', width: '100%', display: 'flex', gap: '10px' }}>
          {task.status === 'completed' ? (
            <button onClick={handleReopen} style={{ flex: 1, padding: '14px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '10px', color: '#C6A85E', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', fontSize: '15px' }}>
              Reopen Task
            </button>
          ) : (
            <>
              {task.status === 'in_progress' && (
                <button onClick={handlePause} style={{ flex: 1, padding: '14px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '10px', color: '#9AA8B5', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', fontSize: '15px' }}>
                  Pause
                </button>
              )}
              {(task.status === 'pending' || task.status === 'paused') && (
                <button onClick={handleStart} style={{ flex: 1, padding: '14px', background: 'rgba(198,168,94,.15)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '10px', color: '#C6A85E', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', fontSize: '15px' }}>
                  {task.status === 'paused' ? 'Resume' : 'Start'}
                </button>
              )}
              <button onClick={handleComplete} disabled={!canComplete} style={{ flex: 2, padding: '14px', background: canComplete ? '#4CAF50' : 'rgba(245,240,232,.06)', border: 'none', borderRadius: '10px', color: canComplete ? '#fff' : '#666', cursor: canComplete ? 'pointer' : 'not-allowed', fontWeight: 700, fontFamily: 'sans-serif', fontSize: '15px' }}>
                ✓ Complete Room
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, AlertTriangle, ChevronRight, Clock, CheckCircle2, Pause, Play, Wrench, ArrowLeft } from 'lucide-react';

const PRIORITY_COLORS = {
  low: { bg: '#f0f9f0', text: '#2d7a2d', border: '#b8e0b8' },
  normal: { bg: '#f0f4ff', text: '#3b5b8c', border: '#b8cce0' },
  high: { bg: '#fff8e0', text: '#8c6b00', border: '#e0cc88' },
  urgent: { bg: '#fff0f0', text: '#8c2020', border: '#e08888' },
};

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-gray-400" />,
  in_progress: <Play className="w-4 h-4 text-blue-500" />,
  paused: <Pause className="w-4 h-4 text-yellow-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  needs_review: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function AdminHousekeeping() {
  const [tab, setTab] = useState('today');
  const [showAddTask, setShowAddTask] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  // locationKey: "room:roomId" or "space:templateId"
  const [newTask, setNewTask] = useState({ locationKey: '', taskType: 'checkout', priority: 'normal', adminNotes: '', taskDate: today() });
  const [newNote, setNewNote] = useState({ scope: 'hotel', roomId: '', note: '', priority: 'normal' });
  const [newSpace, setNewSpace] = useState({ name: '', description: '' });
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['hk-tasks'],
    queryFn: () => base44.entities.HkTask.list('-taskDate', 200),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['hk-rooms'],
    queryFn: () => base44.entities.HkRoom.list('sortOrder', 50),
  });

  const { data: hotelNotes = [] } = useQuery({
    queryKey: ['hk-notes'],
    queryFn: () => base44.entities.HkNote.filter({ scope: 'hotel', isActive: true }),
  });

  const { data: openIssues = [] } = useQuery({
    queryKey: ['hk-issues-open'],
    queryFn: () => base44.entities.HkIssue.filter({ status: 'open' }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['hk-templates'],
    queryFn: () => base44.entities.HkTemplate.filter({ active: true }),
  });

  const { data: publicSpaces = [] } = useQuery({
    queryKey: ['hk-public-spaces'],
    queryFn: () => base44.entities.HkPublicSpace.list('sortOrder', 50),
  });

  const { data: openingDuties = [] } = useQuery({
    queryKey: ['hk-opening-duties'],
    queryFn: () => base44.entities.HkTask.filter({ taskType: 'opening_duty', taskDate: today(), status: ['pending', 'in_progress'] }),
  });

  const openingDutiesCompleted = openingDuties.every(t => t.status === 'completed');

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      const isSpace = data.locationKey?.startsWith('space:');
      const isRoom = data.locationKey?.startsWith('room:');
      const locationId = data.locationKey?.split(':')[1];

      let roomId = '', roomNumber = '', taskType = data.taskType, template = null;

      if (isSpace) {
        // Public space: use the template directly
        template = templates.find(t => t.id === locationId);
        roomNumber = template?.name || 'Public Space';
        taskType = 'public_space';
        roomId = locationId; // store template id as roomId for reference
      } else if (isRoom) {
        const room = rooms.find(r => r.id === locationId);
        roomId = locationId;
        roomNumber = room?.roomNumber || '';
        template = templates.find(t => t.taskType === taskType);
      }

      const task = await base44.entities.HkTask.create({
        taskDate: data.taskDate,
        taskType,
        priority: data.priority,
        adminNotes: data.adminNotes,
        roomId,
        roomNumber,
        source: 'manual',
      });

      if (template?.items?.length) {
        await Promise.all(template.items.map((item, i) =>
          base44.entities.HkTaskItem.create({ ...item, taskId: task.id, isDone: false, sortOrder: i })
        ));
        await base44.entities.HkTask.update(task.id, { totalItems: template.items.length });
      }
      return task;
    },
    onSuccess: () => { qc.invalidateQueries(['hk-tasks']); setShowAddTask(false); setNewTask({ locationKey: '', taskType: 'checkout', priority: 'normal', adminNotes: '', taskDate: today() }); }
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.HkNote.create({ ...data, createdByUserId: 'admin' }),
    onSuccess: () => { qc.invalidateQueries(['hk-notes']); setShowAddNote(false); setNewNote({ scope: 'hotel', roomId: '', note: '', priority: 'normal' }); }
  });

  const dismissNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.HkNote.update(id, { isActive: false }),
    onSuccess: () => qc.invalidateQueries(['hk-notes'])
  });

  const createSpaceMutation = useMutation({
    mutationFn: (data) => base44.entities.HkPublicSpace.create(data),
    onSuccess: () => { qc.invalidateQueries(['hk-public-spaces']); setShowAddSpace(false); setNewSpace({ name: '', description: '' }); }
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: (id) => base44.entities.HkPublicSpace.delete(id),
    onSuccess: () => qc.invalidateQueries(['hk-public-spaces'])
  });

  // Check if opening duties block access
  const canAccessOtherTasks = openingDutiesCompleted || openingDuties.length === 0;

  const filteredTasks = tasks.filter(t => {
    if (tab === 'today') return t.taskDate === today() && t.status !== 'completed';
    if (tab === 'tomorrow') return t.taskDate === tomorrow();
    if (tab === 'open') return ['pending', 'in_progress', 'paused', 'needs_review'].includes(t.status);
    if (tab === 'completed') return t.status === 'completed';
    return true;
  }).filter(t => {
    // Block non-opening tasks if opening duties incomplete
    if (!canAccessOtherTasks && t.taskType !== 'opening_duty') return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0C1C2C', fontFamily: "'Georgia', serif", color: '#F5F0E8', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0C1C2C 0%, #132336 100%)', borderBottom: '1px solid rgba(198,168,94,.2)', padding: '20px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to={createPageUrl('AdminDashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', textDecoration: 'none', flexShrink: 0 }}>
              <ArrowLeft size={16} />
            </Link>
            <div>
              <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 4px', fontFamily: 'sans-serif' }}>HOTEL RITUAL</p>
              <h1 style={{ color: '#F5F0E8', fontSize: '26px', fontWeight: 300, margin: 0 }}>Housekeeping</h1>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {openIssues.length > 0 && (
              <Link to={createPageUrl('AdminHousekeepingIssues')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(220,60,60,.15)', border: '1px solid rgba(220,60,60,.4)', borderRadius: '8px', color: '#f08080', textDecoration: 'none', fontSize: '13px', fontFamily: 'sans-serif' }}>
                <AlertTriangle size={14} /> {openIssues.length} Open Issue{openIssues.length > 1 ? 's' : ''}
              </Link>
            )}
            <button onClick={async () => { setGenerating(true); try { await base44.functions.invoke('hk_generate_checkout_tasks', {}); qc.invalidateQueries(['hk-tasks']); } finally { setGenerating(false); } }} disabled={generating} style={{ padding: '8px 14px', background: 'rgba(76,175,80,.1)', border: '1px solid rgba(76,175,80,.3)', borderRadius: '8px', color: '#4CAF50', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
              {generating ? '⏳' : '🔄'} Auto-Fill Checkouts
            </button>
            <button onClick={() => setShowAddNote(true)} style={{ padding: '8px 14px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
              + Note
            </button>
            <button onClick={() => setShowAddSpace(true)} style={{ padding: '8px 14px', background: 'rgba(198,168,94,.1)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '8px', color: '#C6A85E', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
              + Public Space
            </button>
            <button onClick={() => setShowAddTask(true)} style={{ padding: '8px 16px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontSize: '13px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Task
            </button>
            <Link to={createPageUrl('AdminHousekeepingSetup')} style={{ padding: '8px 14px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#9AA8B5', textDecoration: 'none', fontSize: '13px', fontFamily: 'sans-serif' }}>
              <Wrench size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        {/* Hotel-wide notes */}
        {hotelNotes.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            {hotelNotes.map(note => {
              const c = PRIORITY_COLORS[note.priority] || PRIORITY_COLORS.normal;
              return (
                <div key={note.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: c.text, fontSize: '11px', fontWeight: 700, letterSpacing: '1px', fontFamily: 'sans-serif', textTransform: 'uppercase', marginRight: '8px' }}>{note.priority}</span>
                    <span style={{ color: '#1B1B1B', fontSize: '14px' }}>{note.note}</span>
                  </div>
                  <button onClick={() => dismissNoteMutation.mutate(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '10px', padding: '4px' }}>
          {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['open', 'All Open'], ['completed', 'Completed']].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: tab === val ? '#C6A85E' : 'transparent', color: tab === val ? '#0C1C2C' : '#9AA8B5', cursor: 'pointer', fontWeight: tab === val ? 700 : 400, fontSize: '13px', fontFamily: 'sans-serif' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Opening duties warning */}
        {openingDuties.length > 0 && !openingDutiesCompleted && (
          <div style={{ background: 'rgba(255,180,0,.1)', border: '1px solid rgba(255,180,0,.4)', borderRadius: '12px', padding: '14px', marginBottom: '16px', color: '#FFB400', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>⚠️</span>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontFamily: 'sans-serif' }}>Complete Opening Duties First</p>
              <p style={{ margin: 0, fontSize: '13px', fontFamily: 'sans-serif', opacity: 0.8 }}>Other tasks are blocked until opening duties are complete.</p>
            </div>
          </div>
        )}

        {/* Public Spaces list */}
        {publicSpaces.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(245,240,232,.04)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '10px' }}>
            <p style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '1px', margin: '0 0 8px', fontFamily: 'sans-serif', fontWeight: 700 }}>PUBLIC SPACES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {publicSpaces.map(s => (
                <span key={s.id} style={{ background: 'rgba(198,168,94,.15)', border: '1px solid rgba(198,168,94,.3)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#C6A85E', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {s.name}
                  <button onClick={() => deleteSpaceMutation.mutate(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B6F47', fontSize: '12px' }}>×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Task cards */}
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9AA8B5', border: '1px dashed rgba(198,168,94,.2)', borderRadius: '12px' }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontFamily: 'sans-serif' }}>No tasks for this view</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTasks.map(task => {
              const pc = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;
              const pct = task.totalItems > 0 ? Math.round((task.completedItems || 0) / task.totalItems * 100) : 0;
              return (
                <Link key={task.id} to={createPageUrl(`AdminHousekeepingTask?id=${task.id}`)} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'rgba(245,240,232,.05)', border: '1px solid rgba(198,168,94,.15)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'background 0.15s' }}>
                    <div style={{ fontSize: '28px', minWidth: '36px', textAlign: 'center' }}>🛏️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#F5F0E8', fontWeight: 600, fontSize: '16px' }}>{task.roomNumber}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, fontFamily: 'sans-serif' }}>
                          {task.priority.toUpperCase()}
                        </span>
                        <span style={{ color: '#9AA8B5', fontSize: '12px', fontFamily: 'sans-serif' }}>{task.taskType.replace('_', ' ')}</span>
                        {task.adminNotes && <span style={{ fontSize: '14px' }} title="Has admin notes">📌</span>}
                        {task.status === 'needs_review' && <span style={{ fontSize: '14px' }}>⚠️</span>}
                      </div>
                      {task.totalItems > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(245,240,232,.1)', borderRadius: '2px' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4CAF50' : '#C6A85E', borderRadius: '2px', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ color: '#9AA8B5', fontSize: '11px', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>{task.completedItems || 0}/{task.totalItems}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {STATUS_ICONS[task.status]}
                      <ChevronRight size={16} color="#9AA8B5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#132336', border: '1px solid rgba(198,168,94,.2)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 20px', fontFamily: 'sans-serif' }}>ADD MANUAL TASK</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {newTask.taskType === 'public_space' && (
                <div>
                  <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>SELECT AREA</label>
                  <select value={newTask.areaTemplateId} onChange={e => setNewTask(t => ({ ...t, areaTemplateId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                    <option value="">Select area...</option>
                    {templates.filter(t => t.taskType === 'public_space').map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} items)</option>
                    ))}
                  </select>
                </div>
              )}
              {newTask.taskType !== 'public_space' && (
                <div>
                  <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>ROOM</label>
                  <select value={newTask.roomId} onChange={e => setNewTask(t => ({ ...t, roomId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                    <option value="">Select room...</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>DATE</label>
                <input type="date" value={newTask.taskDate} onChange={e => setNewTask(t => ({ ...t, taskDate: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              </div>
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>TASK TYPE</label>
                <select value={newTask.taskType} onChange={e => setNewTask(t => ({ ...t, taskType: e.target.value, areaTemplateId: '', roomId: '' }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                  <option value="opening_duty">Opening Duty</option>
                  <option value="closing_duty">Closing Duty</option>
                  <option value="checkout">Checkout Clean</option>
                  <option value="stayover">Stayover Refresh</option>
                  <option value="deep_clean">Deep Clean</option>
                  <option value="public_space">Public Space</option>
                  <option value="manual">Manual / Other</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>PRIORITY</label>
                <select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>ADMIN NOTES</label>
                <textarea value={newTask.adminNotes} onChange={e => setNewTask(t => ({ ...t, adminNotes: e.target.value }))} placeholder="Special requests, guest preferences..." rows={3} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowAddTask(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#9AA8B5', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={() => createTaskMutation.mutate(newTask)} disabled={(newTask.taskType !== 'public_space' && !newTask.roomId) || (newTask.taskType === 'public_space' && !newTask.areaTemplateId) || createTaskMutation.isPending} style={{ flex: 2, padding: '10px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', opacity: ((newTask.taskType !== 'public_space' && !newTask.roomId) || (newTask.taskType === 'public_space' && !newTask.areaTemplateId)) ? 0.5 : 1 }}>
                   {createTaskMutation.isPending ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Public Space Modal */}
      {showAddSpace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#132336', border: '1px solid rgba(198,168,94,.2)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 20px', fontFamily: 'sans-serif' }}>ADD PUBLIC SPACE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>SPACE NAME *</label>
                <input type="text" placeholder="Lobby, Dining Room, Hallway…" value={newSpace.name} onChange={e => setNewSpace(s => ({ ...s, name: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              </div>
              <div>
                <label style={{ color: '#9AA8B5', fontSize: '11px', letterSpacing: '1px', display: 'block', marginBottom: '5px', fontFamily: 'sans-serif' }}>DESCRIPTION</label>
                <textarea value={newSpace.description} onChange={e => setNewSpace(s => ({ ...s, description: e.target.value }))} placeholder="Optional notes…" rows={2} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowAddSpace(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#9AA8B5', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={() => createSpaceMutation.mutate(newSpace)} disabled={!newSpace.name || createSpaceMutation.isPending} style={{ flex: 2, padding: '10px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', opacity: !newSpace.name ? 0.5 : 1 }}>
                  {createSpaceMutation.isPending ? 'Adding…' : 'Add Space'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#132336', border: '1px solid rgba(198,168,94,.2)', borderRadius: '16px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <h3 style={{ color: '#C6A85E', fontSize: '11px', letterSpacing: '3px', margin: '0 0 20px', fontFamily: 'sans-serif' }}>ADD NOTE / REQUEST</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['hotel', 'room'].map(s => (
                  <button key={s} onClick={() => setNewNote(n => ({ ...n, scope: s }))} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: newNote.scope === s ? '1px solid #C6A85E' : '1px solid rgba(198,168,94,.2)', background: newNote.scope === s ? 'rgba(198,168,94,.15)' : 'transparent', color: newNote.scope === s ? '#C6A85E' : '#9AA8B5', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' }}>
                    {s === 'hotel' ? '🏨 Hotel-wide' : '🚪 Specific Room'}
                  </button>
                ))}
              </div>
              {newNote.scope === 'room' && (
                <select value={newNote.roomId} onChange={e => setNewNote(n => ({ ...n, roomId: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                  <option value="">Select room...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                </select>
              )}
              <textarea value={newNote.note} onChange={e => setNewNote(n => ({ ...n, note: e.target.value }))} placeholder="Enter note or special request..." rows={4} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              <select value={newNote.priority} onChange={e => setNewNote(n => ({ ...n, priority: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#F5F0E8', fontSize: '14px', outline: 'none', fontFamily: 'sans-serif' }}>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowAddNote(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(198,168,94,.2)', borderRadius: '8px', color: '#9AA8B5', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cancel</button>
                <button onClick={() => createNoteMutation.mutate(newNote)} disabled={!newNote.note || createNoteMutation.isPending} style={{ flex: 2, padding: '10px', background: '#C6A85E', border: 'none', borderRadius: '8px', color: '#0C1C2C', cursor: 'pointer', fontWeight: 700, fontFamily: 'sans-serif', opacity: !newNote.note ? 0.5 : 1 }}>
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
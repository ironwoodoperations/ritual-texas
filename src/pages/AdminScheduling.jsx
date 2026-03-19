import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Download, RefreshCw, Clock, CheckCircle, AlertCircle, Save, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHelpBanner from '@/components/PageHelpBanner';

const HELP_CONTENT = `Schedule shifts, monitor who's clocked in, and review timesheets for payroll.

WEEKLY SCHEDULE: Build the week's schedule by adding shifts per staff member. Click an empty cell to add, click a shift pill to edit/delete. Use "Copy This Week" to duplicate the schedule to next week.
TODAY'S CLOCK: See who is currently working, who hasn't clocked in yet, and who has already finished. Auto-refreshes every 60 seconds.
TIMESHEETS: Filter by date range and staff. Export to CSV for payroll. Edit entries if a correction is needed.
SETTINGS: Adjust early/late grace periods for clock-in rules.

Pro Tip: Add shifts for the entire week on Monday morning. Staff will see their shift time on the clock-in screen.`;

const ROLE_COLORS = {
  server: 'bg-blue-100 text-blue-800',
  chef: 'bg-amber-100 text-amber-800',
  kitchen_staff: 'bg-orange-100 text-orange-800',
  housekeeping: 'bg-teal-100 text-teal-800',
  hotel_host: 'bg-indigo-100 text-indigo-800',
  hotel_service_provider: 'bg-purple-100 text-purple-800',
  manager: 'bg-rose-100 text-rose-800',
  general_manager: 'bg-violet-100 text-violet-800',
};
const SHIFT_PILL_COLORS = {
  server: 'bg-blue-200 text-blue-900',
  chef: 'bg-amber-200 text-amber-900',
  kitchen_staff: 'bg-orange-200 text-orange-900',
  housekeeping: 'bg-teal-200 text-teal-900',
  hotel_host: 'bg-indigo-200 text-indigo-900',
  hotel_service_provider: 'bg-purple-200 text-purple-900',
  manager: 'bg-rose-200 text-rose-900',
  general_manager: 'bg-violet-200 text-violet-900',
};
const ALL_ROLES = ['server','chef','kitchen_staff','housekeeping','hotel_host','hotel_service_provider','manager','general_manager'];

function fmt12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function fmtIso(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'h:mm a');
}
function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}
function elapsedMins(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}
function fmtMins(m) {
  if (!m && m !== 0) return '—';
  return `${Math.floor(m/60)}h ${m%60}m`;
}
function toHours(mins) {
  return mins ? (mins/60).toFixed(2) : '0.00';
}

// ── Shift Modal ────────────────────────────────────────────────────────────────
function ShiftModal({ open, onClose, shift, prefillDate, prefillStaffPinId, staff }) {
  const qc = useQueryClient();
  const isEdit = !!shift;
  const [form, setForm] = useState({
    staff_pin_id: '', shift_date: '', scheduled_start: '09:00', scheduled_end: '17:00', notes: '',
  });
  useEffect(() => {
    if (shift) {
      setForm({ staff_pin_id: shift.staff_pin_id, shift_date: shift.shift_date, scheduled_start: shift.scheduled_start, scheduled_end: shift.scheduled_end, notes: shift.notes || '' });
    } else {
      setForm(f => ({ ...f, shift_date: prefillDate || getTodayStr(), staff_pin_id: prefillStaffPinId || '' }));
    }
  }, [shift, prefillDate, prefillStaffPinId, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedStaff = staff.find(s => s.id === form.staff_pin_id);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const s = staff.find(x => x.id === form.staff_pin_id);
      const data = { ...form, staff_name: s?.name || '', role: s?.role || '' };
      return isEdit ? base44.entities.StaffShift.update(shift.id, data) : base44.entities.StaffShift.create(data);
    },
    onSuccess: () => { qc.invalidateQueries(['shifts']); onClose(); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.StaffShift.delete(shift.id),
    onSuccess: () => { qc.invalidateQueries(['shifts']); onClose(); },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[rgb(248,246,242)]">
        <DialogHeader><DialogTitle className="text-[rgb(107,85,64)] font-light">{isEdit ? 'Edit Shift' : 'Add Shift'}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Staff Member</label>
            <Select value={form.staff_pin_id} onValueChange={v => set('staff_pin_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
              <SelectContent>
                {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.role?.replace(/_/g,' ')})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Date</label>
            <Input type="date" value={form.shift_date} onChange={e => set('shift_date', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Start</label>
              <Input type="time" value={form.scheduled_start} onChange={e => set('scheduled_start', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">End</label>
              <Input type="time" value={form.scheduled_end} onChange={e => set('scheduled_end', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Notes</label>
            <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
          <div className="flex gap-2 justify-end">
            {isEdit && (
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.staff_pin_id || !form.shift_date}
              className="bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)]">
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 1: Weekly Schedule ─────────────────────────────────────────────────────
function WeeklySchedule({ staff }) {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    return startOfWeek(d, { weekStartsOn: 1 });
  });
  const [modal, setModal] = useState(null); // null | { shift?, date?, staffPinId? }
  const [roleFilter, setRoleFilter] = useState('all');
  const [copyConfirm, setCopyConfirm] = useState(false);
  const qc = useQueryClient();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', weekStartStr],
    queryFn: () => base44.entities.StaffShift.filter({ shift_date: { $gte: weekStartStr, $lte: weekEndStr } }),
  });

  const filteredStaff = roleFilter === 'all' ? staff : staff.filter(s => s.role === roleFilter);

  const copyWeekMutation = useMutation({
    mutationFn: async () => {
      const nextWeekShifts = shifts.map(s => ({
        ...s,
        id: undefined,
        shift_date: format(addDays(parseISO(s.shift_date), 7), 'yyyy-MM-dd'),
      }));
      await base44.entities.StaffShift.bulkCreate(nextWeekShifts);
    },
    onSuccess: () => { qc.invalidateQueries(['shifts']); setCopyConfirm(false); },
  });

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(d => addDays(d, -7))} className="p-2 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)]"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-[rgb(107,85,64)] font-medium whitespace-nowrap">
            {format(weekStart,'MMM d')} – {format(addDays(weekStart,6),'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))} className="p-2 border border-[rgb(235,225,213)] rounded-lg hover:bg-[rgb(248,246,242)]"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g,' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setModal({})} className="bg-[rgb(150,170,155)] text-white hover:bg-[rgb(120,145,125)] ml-auto">
          <Plus className="w-4 h-4 mr-1" /> Add Shift
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCopyConfirm(true)}>
          <Copy className="w-4 h-4 mr-1" /> Copy Week →
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs text-[rgb(150,150,150)] font-medium w-32">Staff</th>
              {weekDays.map(d => (
                <th key={d.toISOString()} className="text-center p-2 text-xs font-medium text-[rgb(107,85,64)]">
                  <div>{format(d,'EEE')}</div>
                  <div className={`text-lg font-light ${format(d,'yyyy-MM-dd') === getTodayStr() ? 'text-[rgb(150,170,155)]' : ''}`}>{format(d,'d')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(s => (
              <tr key={s.id} className="border-t border-[rgb(235,225,213)]">
                <td className="p-2">
                  <p className="text-xs font-medium text-[rgb(45,45,45)]">{s.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-600'}`}>{s.role?.replace(/_/g,' ')}</span>
                </td>
                {weekDays.map(d => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const dayShifts = shifts.filter(sh => sh.shift_date === dateStr && sh.staff_pin_id === s.id);
                  return (
                    <td key={d.toISOString()} className="p-1 align-top min-w-[80px]">
                      <button
                        onClick={() => setModal({ date: dateStr, staffPinId: s.id })}
                        className="w-full min-h-[40px] rounded-lg border border-dashed border-[rgb(198,182,165)] hover:border-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all flex flex-col gap-1 p-1"
                      >
                        {dayShifts.map(sh => (
                          <span
                            key={sh.id}
                            onClick={e => { e.stopPropagation(); setModal({ shift: sh }); }}
                            className={`block text-xs px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${SHIFT_PILL_COLORS[sh.role] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {fmt12(sh.scheduled_start).replace(' AM','a').replace(' PM','p')}–{fmt12(sh.scheduled_end).replace(' AM','a').replace(' PM','p')}
                          </span>
                        ))}
                        {dayShifts.length === 0 && <span className="text-[10px] text-[rgb(198,182,165)]">+</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredStaff.length === 0 && (
              <tr><td colSpan={8} className="text-center p-8 text-[rgb(150,150,150)] text-sm">No staff found. Add staff in Staff Controls.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Shift modal */}
      {modal !== null && (
        <ShiftModal
          open={true}
          onClose={() => setModal(null)}
          shift={modal.shift}
          prefillDate={modal.date}
          prefillStaffPinId={modal.staffPinId}
          staff={staff}
        />
      )}

      {/* Copy confirm */}
      <Dialog open={copyConfirm} onOpenChange={setCopyConfirm}>
        <DialogContent className="max-w-sm bg-[rgb(248,246,242)]">
          <DialogHeader><DialogTitle className="text-[rgb(107,85,64)] font-light">Copy This Week?</DialogTitle></DialogHeader>
          <p className="text-sm text-[rgb(45,45,45)]">This will duplicate all {shifts.length} shifts from this week to next week. Existing next-week shifts will not be deleted.</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setCopyConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={() => copyWeekMutation.mutate()} disabled={copyWeekMutation.isPending}
              className="bg-[rgb(107,85,64)] text-white">
              {copyWeekMutation.isPending ? 'Copying…' : 'Copy Week'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 2: Today's Clock Status ────────────────────────────────────────────────
function TodayClockStatus({ staff }) {
  const todayStr = getTodayStr();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: todayShifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['today-shifts', todayStr],
    queryFn: () => base44.entities.StaffShift.filter({ shift_date: todayStr }),
    refetchInterval: 60000,
  });
  const { data: todayEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['today-entries', todayStr],
    queryFn: () => base44.entities.StaffTimeEntry.filter({ clock_in_date: todayStr }),
    refetchInterval: 60000,
  });

  const clockedIn = todayEntries.filter(e => e.status === 'clocked_in');
  const clockedOut = todayEntries.filter(e => e.status === 'clocked_out');
  const clockedInPinIds = new Set(clockedIn.map(e => e.staff_pin_id));
  const clockedOutPinIds = new Set(clockedOut.map(e => e.staff_pin_id));
  const notYet = todayShifts.filter(s => !clockedInPinIds.has(s.staff_pin_id) && !clockedOutPinIds.has(s.staff_pin_id));

  const clockOutMutation = useMutation({
    mutationFn: async (entry) => {
      const clockOut = new Date().toISOString();
      const total = Math.round((Date.now() - new Date(entry.clock_in_time).getTime()) / 60000);
      return base44.entities.StaffTimeEntry.update(entry.id, { clock_out_time: clockOut, total_minutes: total, status: 'clocked_out' });
    },
    onSuccess: () => { qc.invalidateQueries(['today-entries', todayStr]); },
  });

  const now = new Date();
  const curHHMM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { refetchShifts(); refetchEntries(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Currently working */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] font-semibold mb-3">Currently Working ({clockedIn.length})</p>
        {clockedIn.length === 0 ? <p className="text-sm text-[rgb(150,150,150)]">Nobody clocked in yet today.</p> : (
          <div className="grid gap-3">
            {clockedIn.map(e => {
              const shift = todayShifts.find(s => s.staff_pin_id === e.staff_pin_id);
              return (
                <div key={e.id} className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{e.staff_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[e.role] || 'bg-gray-100'}`}>{e.role?.replace(/_/g,' ')}</span>
                  </div>
                  <div className="text-sm text-[rgb(45,45,45)]">
                    <p>In: {fmtIso(e.clock_in_time)}</p>
                    <p className="text-[rgb(150,170,155)]">{fmtMins(elapsedMins(e.clock_in_time))} elapsed</p>
                    {shift && <p className="text-[rgb(150,150,150)]">Ends: {fmt12(shift.scheduled_end)}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => clockOutMutation.mutate(e)} disabled={clockOutMutation.isPending}
                    className="border-[rgb(196,155,145)] text-[rgb(196,155,145)] hover:bg-[rgb(196,155,145)] hover:text-white">
                    Clock Out
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Not yet clocked in */}
      {notYet.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold mb-3">Not Yet Clocked In ({notYet.length})</p>
          <div className="grid gap-3">
            {notYet.map(s => {
              const isLate = curHHMM > s.scheduled_start;
              return (
                <div key={s.id} className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-[rgb(107,85,64)]">{s.staff_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] || 'bg-gray-100'}`}>{s.role?.replace(/_/g,' ')}</span>
                  </div>
                  <div className="text-sm text-[rgb(45,45,45)]">
                    <p>{fmt12(s.scheduled_start)} – {fmt12(s.scheduled_end)}</p>
                  </div>
                  <Badge className={isLate ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                    {isLate ? 'Late' : 'Expected'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clocked out */}
      {clockedOut.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[rgb(150,150,150)] font-semibold mb-3">Clocked Out Today ({clockedOut.length})</p>
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
            {clockedOut.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b border-[rgb(235,225,213)] last:border-0">
                <p className="text-sm font-medium text-[rgb(45,45,45)]">{e.staff_name}</p>
                <p className="text-xs text-[rgb(150,150,150)]">{fmtIso(e.clock_in_time)} – {fmtIso(e.clock_out_time)}</p>
                <p className="text-sm text-[rgb(107,85,64)]">{fmtMins(e.total_minutes)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Timesheets ──────────────────────────────────────────────────────────
function Timesheets({ staff }) {
  const todayStr = getTodayStr();
  const weekAgo = format(addDays(new Date(), -6), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(todayStr);
  const [staffFilter, setStaffFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['timesheets', startDate, endDate],
    queryFn: () => base44.entities.StaffTimeEntry.filter({ clock_in_date: { $gte: startDate, $lte: endDate } }, 'clock_in_date', 500),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-ts', startDate, endDate],
    queryFn: () => base44.entities.StaffShift.filter({ shift_date: { $gte: startDate, $lte: endDate } }),
  });

  const filtered = staffFilter === 'all' ? entries : entries.filter(e => e.staff_pin_id === staffFilter);

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.StaffTimeEntry.update(editModal.id, {
      clock_in_time: editForm.clock_in_time,
      clock_out_time: editForm.clock_out_time,
      total_minutes: editForm.clock_in_time && editForm.clock_out_time
        ? Math.round((new Date(editForm.clock_out_time) - new Date(editForm.clock_in_time)) / 60000)
        : editModal.total_minutes,
      notes: editForm.notes,
      manager_edited: true,
      manager_edit_note: editForm.manager_edit_note,
    }),
    onSuccess: () => { qc.invalidateQueries(['timesheets']); setEditModal(null); },
  });

  function exportCSV() {
    const headers = ['Name','Role','Date','Clock In','Clock Out','Hours','Status'];
    const lines = [headers.join(','), ...filtered.map(r => [
      r.staff_name, r.role, r.clock_in_date,
      r.clock_in_time ? format(new Date(r.clock_in_time),'h:mm a') : '',
      r.clock_out_time ? format(new Date(r.clock_out_time),'h:mm a') : '',
      toHours(r.total_minutes),
      r.status,
    ].join(','))];
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='ritual_timesheets.csv'; a.click();
  }

  // Totals per staff
  const totalsByStaff = {};
  filtered.forEach(e => {
    if (!totalsByStaff[e.staff_name]) totalsByStaff[e.staff_name] = 0;
    totalsByStaff[e.staff_name] += e.total_minutes || 0;
  });
  const grandTotal = Object.values(totalsByStaff).reduce((a,b) => a+b, 0);

  const getScheduled = (entry) => {
    const s = shifts.find(sh => sh.shift_date === entry.clock_in_date && sh.staff_pin_id === entry.staff_pin_id);
    return s ? `${fmt12(s.scheduled_start)}–${fmt12(s.scheduled_end)}` : '—';
  };
  const isLate = (entry) => {
    const s = shifts.find(sh => sh.shift_date === entry.clock_in_date && sh.staff_pin_id === entry.staff_pin_id);
    if (!s || !entry.clock_in_time) return false;
    const clockInHHMM = format(new Date(entry.clock_in_time), 'HH:mm');
    const scheduledMins = parseInt(s.scheduled_start.split(':')[0])*60 + parseInt(s.scheduled_start.split(':')[1]);
    const actualMins = parseInt(clockInHHMM.split(':')[0])*60 + parseInt(clockInHHMM.split(':')[1]);
    return actualMins > scheduledMins + 15;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[rgb(150,150,150)] block mb-1">From</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] block mb-1">To</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-[rgb(150,150,150)] block mb-1">Staff</label>
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="ml-auto">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[rgb(235,225,213)]">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Name</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Date</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Scheduled</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">In</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Out</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Hours</th>
                <th className="text-left p-3 text-xs font-medium text-[rgb(107,85,64)]">Flags</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(235,225,213)]">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center p-8 text-[rgb(150,150,150)]">No entries in this range.</td></tr>
              )}
              {filtered.map(e => {
                const late = isLate(e);
                const overtime = (e.total_minutes || 0) > 480;
                return (
                  <tr key={e.id} className="hover:bg-[rgb(248,246,242)]">
                    <td className="p-3">
                      <p className="font-medium text-[rgb(45,45,45)]">{e.staff_name}</p>
                      <p className="text-xs text-[rgb(150,150,150)] capitalize">{e.role?.replace(/_/g,' ')}</p>
                      {e.manager_edited && <Badge className="bg-blue-100 text-blue-700 text-xs mt-0.5">Edited</Badge>}
                    </td>
                    <td className="p-3 text-[rgb(45,45,45)]">{e.clock_in_date}</td>
                    <td className="p-3 text-[rgb(45,45,45)]">{getScheduled(e)}</td>
                    <td className="p-3 text-[rgb(45,45,45)]">{e.clock_in_time ? format(new Date(e.clock_in_time),'h:mm a') : '—'}</td>
                    <td className="p-3 text-[rgb(45,45,45)]">{e.clock_out_time ? format(new Date(e.clock_out_time),'h:mm a') : '—'}</td>
                    <td className="p-3 text-[rgb(107,85,64)] font-medium">{toHours(e.total_minutes)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {late && <Badge className="bg-orange-100 text-orange-700 text-xs">Late</Badge>}
                        {overtime && <Badge className="bg-blue-100 text-blue-700 text-xs">OT</Badge>}
                        {e.status === 'clocked_in' && <Badge className="bg-red-100 text-red-700 text-xs">Open</Badge>}
                      </div>
                    </td>
                    <td className="p-3">
                      <button onClick={() => { setEditModal(e); setEditForm({ clock_in_time: e.clock_in_time, clock_out_time: e.clock_out_time || '', notes: e.notes || '', manager_edit_note: '' }); }}
                        className="p-1 hover:bg-[rgb(235,225,213)] rounded">
                        <Pencil className="w-3.5 h-3.5 text-[rgb(150,150,150)]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Totals */}
        {filtered.length > 0 && (
          <div className="border-t border-[rgb(235,225,213)] p-4 bg-[rgb(248,246,242)]">
            <div className="flex flex-wrap gap-4 text-sm">
              {Object.entries(totalsByStaff).map(([name, mins]) => (
                <span key={name} className="text-[rgb(45,45,45)]"><strong className="text-[rgb(107,85,64)]">{name}</strong>: {toHours(mins)}h</span>
              ))}
              <span className="ml-auto font-semibold text-[rgb(107,85,64)]">Total: {toHours(grandTotal)}h</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-sm bg-[rgb(248,246,242)]">
          <DialogHeader><DialogTitle className="text-[rgb(107,85,64)] font-light">Edit Entry — {editModal?.staff_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Clock In</label>
              <Input type="datetime-local" value={editForm.clock_in_time?.slice(0,16)} onChange={e => setEditForm(f => ({...f, clock_in_time: new Date(e.target.value).toISOString()}))} />
            </div>
            <div>
              <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Clock Out</label>
              <Input type="datetime-local" value={editForm.clock_out_time?.slice(0,16)} onChange={e => setEditForm(f => ({...f, clock_out_time: new Date(e.target.value).toISOString()}))} />
            </div>
            <div>
              <label className="text-xs text-[rgb(150,150,150)] uppercase tracking-wide block mb-1">Reason for Edit *</label>
              <Input value={editForm.manager_edit_note} onChange={e => setEditForm(f => ({...f, manager_edit_note: e.target.value}))} placeholder="Explain the correction…" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditModal(null)}>Cancel</Button>
              <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !editForm.manager_edit_note}
                className="bg-[rgb(107,85,64)] text-white">
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab 4: Settings ────────────────────────────────────────────────────────────
function ScheduleSettings() {
  const qc = useQueryClient();
  const { data: siteSettings = [] } = useQuery({
    queryKey: ['site-settings-scheduling'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const [earlyGrace, setEarlyGrace] = useState('15');
  const [lateBlock, setLateBlock] = useState('30');
  const [otThreshold, setOtThreshold] = useState('8');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (siteSettings.length > 0) {
      setEarlyGrace(siteSettings.find(s => s.key === 'CLOCK_EARLY_GRACE')?.value ?? '15');
      setLateBlock(siteSettings.find(s => s.key === 'CLOCK_LATE_BLOCK')?.value ?? '30');
      setOtThreshold(siteSettings.find(s => s.key === 'CLOCK_OT_THRESHOLD')?.value ?? '8');
    }
  }, [siteSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upsert = async (key, value) => {
        const existing = siteSettings.find(s => s.key === key);
        if (existing) return base44.entities.SiteSettings.update(existing.id, { value });
        return base44.entities.SiteSettings.create({ key, value });
      };
      await Promise.all([
        upsert('CLOCK_EARLY_GRACE', earlyGrace),
        upsert('CLOCK_LATE_BLOCK', lateBlock),
        upsert('CLOCK_OT_THRESHOLD', otThreshold),
      ]);
    },
    onSuccess: () => { qc.invalidateQueries(['site-settings-scheduling']); setSaved(true); setTimeout(() => setSaved(false), 3000); },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 space-y-5">
        <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] font-semibold">Grace Period Settings</p>
        <div>
          <label className="text-sm font-medium text-[rgb(45,45,45)] block mb-1">Early clock-in grace period (minutes)</label>
          <p className="text-xs text-[rgb(150,150,150)] mb-2">Staff can clock in this many minutes before their shift</p>
          <Input type="number" value={earlyGrace} onChange={e => setEarlyGrace(e.target.value)} className="w-28" min={0} max={120} />
        </div>
        <div>
          <label className="text-sm font-medium text-[rgb(45,45,45)] block mb-1">Late clock-in cutoff (minutes)</label>
          <p className="text-xs text-[rgb(150,150,150)] mb-2">Block clock-in if more than this many minutes after shift end</p>
          <Input type="number" value={lateBlock} onChange={e => setLateBlock(e.target.value)} className="w-28" min={0} max={240} />
        </div>
        <div>
          <label className="text-sm font-medium text-[rgb(45,45,45)] block mb-1">Daily overtime threshold (hours)</label>
          <p className="text-xs text-[rgb(150,150,150)] mb-2">Flag shifts over this many hours per day</p>
          <Input type="number" value={otThreshold} onChange={e => setOtThreshold(e.target.value)} className="w-28" min={1} max={24} />
        </div>
      </div>

      <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6 space-y-4 opacity-60">
        <p className="text-xs uppercase tracking-widest text-[rgb(107,85,64)] font-semibold">Notifications <span className="text-[rgb(150,150,150)] normal-case">(coming soon)</span></p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[rgb(45,45,45)]">Alert manager when staff clocks in late</p>
          <Badge className="bg-gray-100 text-gray-500">Coming Soon</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-[rgb(45,45,45)]">Alert manager when shift ends with no clock-out</p>
          <Badge className="bg-gray-100 text-gray-500">Coming Soon</Badge>
        </div>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
        className="bg-[rgb(107,85,64)] text-white hover:bg-[rgb(85,65,45)]">
        {saveMutation.isPending ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
      </Button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminScheduling() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('schedule');

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') window.location.href = createPageUrl('Home');
    }).catch(() => base44.auth.redirectToLogin(createPageUrl('AdminScheduling')));
  }, []);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-pins-scheduling'],
    queryFn: () => base44.entities.StaffPin.filter({ is_active: true }),
    enabled: !!user,
  });

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
      <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
    </div>
  );

  const TABS = [
    { key: 'schedule', label: 'Weekly Schedule' },
    { key: 'today', label: "Today's Clock" },
    { key: 'timesheets', label: 'Timesheets' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Staff Scheduling & Time Clock</h1>
            <p className="text-sm text-[rgb(150,150,150)]">{staff.length} active staff members</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <PageHelpBanner title="Staff Scheduling & Time Clock" content={HELP_CONTENT} accentColor="rgb(107,85,64)" />

        {/* Tabs */}
        <div className="flex gap-1 bg-[rgb(235,225,213)] p-1 rounded-xl w-fit mb-6 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-[rgb(107,85,64)] shadow-sm' : 'text-[rgb(107,85,64)] hover:bg-white/50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && <WeeklySchedule staff={staff} />}
        {tab === 'today' && <TodayClockStatus staff={staff} />}
        {tab === 'timesheets' && <Timesheets staff={staff} />}
        {tab === 'settings' && <ScheduleSettings />}
      </main>
    </div>
  );
}
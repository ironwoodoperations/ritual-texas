import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { format, formatDistanceStrict } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}
function getCurrentTimeHHMM() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fmt12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function fmtIso(iso) {
  if (!iso) return '';
  return format(new Date(iso), 'h:mm a');
}
function elapsedStr(isoStart) {
  if (!isoStart) return '';
  const mins = Math.floor((Date.now() - new Date(isoStart).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function StaffTimeClock({ session, standalone = false }) {
  const [now, setNow] = useState(new Date());
  const [actionMsg, setActionMsg] = useState('');
  const [managerOverride, setManagerOverride] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStr = getTodayStr();

  // Load settings for grace periods
  const { data: siteSettings = [] } = useQuery({
    queryKey: ['site-settings-clock'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });
  const earlyGrace = parseInt(siteSettings.find(s => s.key === 'CLOCK_EARLY_GRACE')?.value ?? '15');
  const lateBlock = parseInt(siteSettings.find(s => s.key === 'CLOCK_LATE_BLOCK')?.value ?? '30');

  // Find my StaffPin
  const { data: pins = [] } = useQuery({
    queryKey: ['staff-pins-clock'],
    queryFn: () => base44.entities.StaffPin.list(),
    enabled: !!session,
  });
  const myPin = pins.find(p => p.name === session?.name && (p.is_active ?? true) === true);

  // Today's shift
  const { data: todayShifts = [] } = useQuery({
    queryKey: ['my-shifts-today', todayStr, myPin?.id],
    queryFn: () => base44.entities.StaffShift.filter({ shift_date: todayStr, staff_pin_id: myPin.id }),
    enabled: !!myPin,
  });
  const myShift = todayShifts[0] || null;

  // Today's time entries
  const { data: myEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['my-time-entries', myPin?.id],
    queryFn: () => base44.entities.StaffTimeEntry.filter({ staff_pin_id: myPin.id }, '-clock_in_time', 20),
    enabled: !!myPin,
  });
  const openEntry = myEntries.find(e => e.status === 'clocked_in' && !e.clock_out_time);
  const todayEntries = myEntries.filter(e => e.clock_in_date === todayStr);
  const completedToday = todayEntries.filter(e => e.status === 'clocked_out');

  // Clock-in logic
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const curTime = getCurrentTimeHHMM();
      const curMins = timeToMinutes(curTime);

       if (!myShift && !managerOverride) {
         throw new Error('You are not scheduled to work today. Please see a manager.');
       }
      const startMins = timeToMinutes(myShift.scheduled_start);
      const endMins = timeToMinutes(myShift.scheduled_end);

      if (curMins < startMins - earlyGrace) {
        throw new Error(`Your shift doesn't start until ${fmt12(myShift.scheduled_start)}. You can clock in up to ${earlyGrace} minutes early.`);
      }
      if (curMins > endMins + lateBlock) {
        throw new Error(`Your scheduled shift ended at ${fmt12(myShift.scheduled_end)}. Please see a manager to clock in late.`);
      }

      return base44.entities.StaffTimeEntry.create({
        staff_pin_id: myPin.id,
        staff_name: session.name,
        role: session.role,
        shift_id: myShift?.id || null,
        clock_in_time: new Date().toISOString(),
        clock_in_date: todayStr,
        status: 'clocked_in',
        notes: managerOverride && !myShift ? 'Manager override — no shift scheduled' : undefined,
      });
    },
    onSuccess: () => { setActionMsg(''); queryClient.invalidateQueries(['my-time-entries', myPin?.id]); },
    onError: (e) => setActionMsg(e.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!openEntry) throw new Error('No open entry found.');
      const clockOut = new Date().toISOString();
      const totalMinutes = Math.round((Date.now() - new Date(openEntry.clock_in_time).getTime()) / 60000);
      return base44.entities.StaffTimeEntry.update(openEntry.id, {
        clock_out_time: clockOut,
        total_minutes: totalMinutes,
        status: 'clocked_out',
      });
    },
    onSuccess: () => { setActionMsg(''); queryClient.invalidateQueries(['my-time-entries', myPin?.id]); },
    onError: (e) => setActionMsg(e.message),
  });

  // Determine state
  let clockState = 'blocked';
  let blockReason = '';

  if (managerOverride && !openEntry && completedToday.length === 0) {
    clockState = 'ready';
  } else if (openEntry) {
    clockState = 'clocked_in';
  } else if (completedToday.length > 0 && !openEntry) {
    clockState = 'done';
  } else if (myShift) {
    const curMins = timeToMinutes(getCurrentTimeHHMM());
    const startMins = timeToMinutes(myShift.scheduled_start);
    const endMins = timeToMinutes(myShift.scheduled_end);
    if (curMins < startMins - earlyGrace) {
      clockState = 'blocked';
      blockReason = `Your shift doesn't start until ${fmt12(myShift.scheduled_start)}. You can clock in up to ${earlyGrace} minutes early.`;
    } else if (curMins > endMins + lateBlock) {
      clockState = 'blocked';
      blockReason = `Your scheduled shift ended at ${fmt12(myShift.scheduled_end)}. Please see a manager to clock in late.`;
    } else {
      clockState = 'ready';
    }
  } else {
    clockState = 'blocked';
    blockReason = 'You are not scheduled to work today. Please see a manager.';
  }

  const historyEntries = myEntries.filter(e => e.status === 'clocked_out').slice(0, 5);

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {standalone && (
        <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <Link to={createPageUrl('StaffDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Clock className="w-5 h-5 text-[rgb(150,170,155)]" />
            <h1 className="text-xl font-light text-[rgb(107,85,64)]">Time Clock</h1>
          </div>
        </header>
      )}

      <div className="max-w-xl mx-auto p-6 space-y-6">
        {/* Staff info + live clock */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium text-[rgb(107,85,64)]">{session?.name}</p>
              <p className="text-sm text-[rgb(150,150,150)] capitalize">{session?.role?.replace(/_/g, ' ')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light text-[rgb(107,85,64)] tabular-nums">{format(now, 'h:mm:ss a')}</p>
              <p className="text-xs text-[rgb(150,150,150)]">{format(now, 'EEEE, MMMM d')}</p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {actionMsg && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm">{actionMsg}</div>
        )}

        {/* Main clock card */}
        {clockState === 'ready' && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto">
              <Clock className="w-9 h-9 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-light text-[rgb(107,85,64)]">Ready to Clock In</p>
              <p className="text-sm text-[rgb(150,150,150)] mt-1">Your shift: {fmt12(myShift.scheduled_start)} – {fmt12(myShift.scheduled_end)}</p>
            </div>
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending}
              className="w-full py-4 rounded-xl bg-[rgb(150,170,155)] text-white text-lg font-medium hover:bg-[rgb(120,145,125)] transition-all disabled:opacity-50"
            >
              {clockInMutation.isPending ? 'Clocking In…' : 'CLOCK IN'}
            </button>
          </div>
        )}

        {clockState === 'clocked_in' && openEntry && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-[rgb(235,245,240)] border-2 border-[rgb(150,170,155)] flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-[rgb(150,170,155)]" />
            </div>
            <div>
              <p className="text-xl font-light text-[rgb(107,85,64)]">Currently Clocked In</p>
              <p className="text-sm text-[rgb(150,150,150)] mt-1">Clocked in at {fmtIso(openEntry.clock_in_time)}</p>
              <p className="text-3xl font-light text-[rgb(107,85,64)] mt-3 tabular-nums">{elapsedStr(openEntry.clock_in_time)}</p>
              <p className="text-xs text-[rgb(150,150,150)] mt-1">elapsed</p>
              {myShift && <p className="text-sm text-[rgb(150,150,150)] mt-2">Shift ends at {fmt12(myShift.scheduled_end)}</p>}
            </div>
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="w-full py-4 rounded-xl bg-[rgb(196,155,145)] text-white text-lg font-medium hover:bg-[rgb(170,125,115)] transition-all disabled:opacity-50"
            >
              {clockOutMutation.isPending ? 'Clocking Out…' : 'CLOCK OUT'}
            </button>
          </div>
        )}

        {clockState === 'done' && completedToday[0] && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-light text-[rgb(107,85,64)]">Shift Complete</p>
              <p className="text-sm text-[rgb(150,150,150)] mt-1">
                Clocked in at {fmtIso(completedToday[0].clock_in_time)} · out at {fmtIso(completedToday[0].clock_out_time)}
              </p>
              {completedToday[0].total_minutes != null && (
                <p className="text-lg text-[rgb(107,85,64)] mt-2">
                  Total: {Math.floor(completedToday[0].total_minutes / 60)}h {completedToday[0].total_minutes % 60}m
                </p>
              )}
            </div>
          </div>
        )}

        {clockState === 'blocked' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto">
              <AlertCircle className="w-9 h-9 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-light text-amber-800">{blockReason}</p>
              <p className="text-sm text-amber-600 mt-3">Please see a manager if you believe this is an error.</p>
              {!myShift && !managerOverride && (
                <button
                  onClick={() => {
                    const pin = window.prompt('Manager PIN required to override:');
                    const managerPin = (pins || []).find(p =>
                      String(p.pin).trim() === String(pin || '').trim() &&
                      (p.role === 'manager' || p.role === 'general_manager' || (p.roles || '').includes('manager'))
                    );
                    if (managerPin) {
                      setManagerOverride(true);
                    } else if (pin) {
                      alert('Invalid manager PIN.');
                    }
                  }}
                  className="text-xs text-amber-700 underline hover:text-amber-900 cursor-pointer bg-transparent border-none mt-3"
                >
                  Manager override
                </button>
              )}
            </div>
          </div>
        )}

        {/* Recent history */}
        {historyEntries.length > 0 && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
            <p className="px-5 py-3 text-xs uppercase tracking-widest text-[rgb(150,150,150)] border-b border-[rgb(235,225,213)]">Recent Entries</p>
            {historyEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b border-[rgb(235,225,213)] last:border-0">
                <div>
                  <p className="text-sm text-[rgb(45,45,45)]">{e.clock_in_date}</p>
                  <p className="text-xs text-[rgb(150,150,150)]">{fmtIso(e.clock_in_time)} – {fmtIso(e.clock_out_time)}</p>
                </div>
                {e.total_minutes != null && (
                  <span className="text-sm text-[rgb(107,85,64)]">{Math.floor(e.total_minutes / 60)}h {e.total_minutes % 60}m</span>
                )}
              </div>
            ))}
          </div>
        )}
        {!myPin && pins.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm text-center">
            Your staff record was not found. Please ask a manager to check your staff pin setup.
          </div>
        )}
      </div>
    </div>
  );
}
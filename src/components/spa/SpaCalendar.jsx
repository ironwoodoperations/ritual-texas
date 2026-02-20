import React, { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const toISODate = (d) => d.toISOString().slice(0, 10);

export default function SpaCalendar({ selectedDate, onSelectDate }) {
  const today = toISODate(new Date());

  // Derive current calendar month from selectedDate
  const [calYear, setCalYear] = useState(() => new Date(selectedDate + 'T12:00:00').getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date(selectedDate + 'T12:00:00').getMonth());
  const [countsByDate, setCountsByDate] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch counts for the displayed month
  useEffect(() => {
    const fetchMonth = async () => {
      setLoading(true);
      try {
        const startISO = new Date(calYear, calMonth, 1).toISOString();
        const endISO = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();
        const resp = await base44.functions.invoke('adminSpaBookingsLookup', {
          startISO,
          endISO,
          staffName: 'ALL',
          status: 'ALL',
        });
        const data = resp.data;
        if (data?.success) {
          const counts = {};
          (data.bookings || []).forEach(b => {
            const d = b.startAt?.slice(0, 10);
            if (d) counts[d] = (counts[d] || 0) + 1;
          });
          setCountsByDate(counts);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMonth();
  }, [calYear, calMonth]);

  const days = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calYear, calMonth]);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span style={{ fontWeight: '600', fontSize: '15px' }}>
          {monthLabel}
          {loading && <span className="ml-2 text-xs text-gray-400">loading…</span>}
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#999', padding: '4px 0', textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;
          const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = countsByDate[iso] || 0;
          const isSelected = iso === selectedDate;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              onClick={() => onSelectDate(iso)}
              style={{
                borderRadius: '6px',
                padding: '6px 2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                cursor: 'pointer',
                background: isSelected ? '#3B4831' : isToday ? '#f0f7f0' : 'transparent',
                border: isSelected ? '2px solid #3B4831' : isToday ? '1px solid #a7c4a0' : '1px solid transparent',
                color: isSelected ? 'white' : '#1a1a1a',
                transition: 'all 0.1s',
              }}
              className="hover:bg-gray-100"
            >
              <span style={{ fontSize: '13px', fontWeight: isToday ? '700' : '400', lineHeight: 1 }}>
                {day}
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  background: isSelected ? 'rgba(255,255,255,0.3)' : '#C4A55C',
                  color: isSelected ? 'white' : 'white',
                  borderRadius: '9999px',
                  padding: '1px 5px',
                  lineHeight: 1.4,
                  minWidth: '18px',
                  textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
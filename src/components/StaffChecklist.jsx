import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CHECKLIST_TEMPLATES = {
  FOH: [
    "Unlock & Lights On",
    "Sweep Dining Room",
    "Wipe Tables",
    "Roll Silverware",
    "Confirm Special",
    "Confirm Soup",
    "Restock Stations",
    "Closing Sanitize",
    "Mop Floors",
    "Lock Doors",
  ],
  KitchenOpen: [
    "Turn on Equipment",
    "Check Fridge Temps",
    "Cold Prep Complete",
    "Hot Line Prep Complete",
    "Lunch Special Ready",
    "Soup Labeled",
  ],
  KitchenClose: [
    "Turn Off Equipment",
    "Filter Fryer",
    "Label Leftovers",
    "Clean Flat Top",
    "Mop Floors",
    "Food Safety Check",
  ],
  Bar: [
    "Stock Beer",
    "Cut Garnishes",
    "Fill Ice Wells",
    "Polish Glassware",
    "Sanitize Bar",
    "Count Drawer",
    "Lock Liquor",
  ],
};

const DEPT_LABELS = {
  FOH: 'Front of House',
  KitchenOpen: 'Kitchen – Open',
  KitchenClose: 'Kitchen – Close',
  Bar: 'Bar',
};

const DEPT_COLORS = {
  FOH: 'bg-blue-100 text-blue-800',
  KitchenOpen: 'bg-orange-100 text-orange-800',
  KitchenClose: 'bg-red-100 text-red-800',
  Bar: 'bg-purple-100 text-purple-800',
};

async function ensureChecklist(department, today) {
  const existing = await base44.entities.DailyChecklist.filter({ department, date: today });
  if (!existing.length) {
    return base44.entities.DailyChecklist.create({
      department,
      date: today,
      items: CHECKLIST_TEMPLATES[department].map(label => ({ label, done: false })),
      completed: false,
    });
  }
  return existing[0];
}

function DeptChecklist({ department, today, staffName }) {
  const qc = useQueryClient();

  const { data: list, isLoading } = useQuery({
    queryKey: ['checklist', department, today],
    queryFn: async () => {
      const rows = await base44.entities.DailyChecklist.filter({ department, date: today });
      if (rows.length) return rows[0];
      return base44.entities.DailyChecklist.create({
        department,
        date: today,
        items: CHECKLIST_TEMPLATES[department].map(label => ({ label, done: false })),
        completed: false,
      });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, items }) => {
      const allDone = items.every(i => i.done);
      return base44.entities.DailyChecklist.update(id, { items, completed: allDone });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', department, today] }),
  });

  const toggleItem = (idx) => {
    if (!list) return;
    const items = list.items.map((item, i) =>
      i === idx
        ? { ...item, done: !item.done, doneBy: !item.done ? staffName : '', doneAt: !item.done ? new Date().toISOString() : '' }
        : item
    );
    update.mutate({ id: list.id, items });
  };

  if (isLoading) return <div className="p-6 text-center text-[rgb(45,45,45)]">Loading…</div>;
  if (!list) return null;

  const doneCount = (list.items || []).filter(i => i.done).length;
  const total = (list.items || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[rgb(235,225,213)]">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[rgb(150,170,155)]" />
          <div>
            <p className="font-medium text-[rgb(107,85,64)]">{DEPT_LABELS[department]}</p>
            <p className="text-xs text-[rgb(45,45,45)]">{doneCount}/{total} complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {list.completed && <Badge className="bg-green-100 text-green-800">✓ Complete</Badge>}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${DEPT_COLORS[department]}`}>{department}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[rgb(235,225,213)]">
        <div
          className="h-full bg-[rgb(150,170,155)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      <ul className="divide-y divide-[rgb(235,225,213)]">
        {(list.items || []).map((item, idx) => (
          <li key={idx}>
            <button
              onClick={() => toggleItem(idx)}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[rgb(248,246,242)] transition-colors text-left"
            >
              {item.done
                ? <CheckCircle2 className="w-5 h-5 text-[rgb(150,170,155)] flex-shrink-0" />
                : <Circle className="w-5 h-5 text-[rgb(198,182,165)] flex-shrink-0" />
              }
              <span className={`flex-1 text-sm ${item.done ? 'line-through text-[rgb(198,182,165)]' : 'text-[rgb(45,45,45)]'}`}>
                {item.label}
              </span>
              {item.done && item.doneBy && (
                <span className="text-xs text-[rgb(198,182,165)] whitespace-nowrap">{item.doneBy}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StaffChecklist({ session }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const staffName = session?.name || 'Staff';
  const role = session?.role || 'staff';

  // Which departments to show based on role
  const depts = role === 'chef' || role === 'manager'
    ? ['FOH', 'KitchenOpen', 'KitchenClose', 'Bar']
    : role === 'staff'
    ? ['FOH', 'Bar']
    : ['FOH', 'KitchenOpen', 'KitchenClose', 'Bar'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[rgb(107,85,64)]">Daily Checklists</h2>
        <p className="text-sm text-[rgb(45,45,45)]">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>
      {depts.map(dept => (
        <DeptChecklist key={dept} department={dept} today={today} staffName={staffName} />
      ))}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Templates from official Ritual Texas SOPs ───────────────────────────────

const CHECKLIST_TEMPLATES = {
  FOH_Open: [
    "Unlock & lights/music on",
    "Sweep dining room",
    "Wipe tables/chairs",
    "Fold napkins (par set)",
    "Roll silverware",
    "Stock stations",
    "Brew tea/coffee",
    "Fill ice bins",
    "Confirm daily special",
    "Confirm soup of the day",
    "Final walkthrough",
  ],
  FOH_Close: [
    "Sanitize tables",
    "Sweep & mop floors",
    "Restock to par",
    "Empty trash",
    "Clean restrooms",
    "Reset tables",
    "Check doors",
    "Turn off music/lights",
    "Lock doors & set alarm",
    "Manager initial / sign-off",
  ],
  KitchenClose: [
    "Turn off grill/fryers",
    "Filter fryer oil",
    "Store & label leftovers",
    "Ice bath cooling (if needed)",
    "Scrape flat top",
    "Clean fryer baskets",
    "Empty trash",
    "Mop floors",
    "Chef sign-off",
  ],
  KitchenFoodSafety: [
    "Label: Item / Date / Use By / Initials",
    "No food on floor",
    "Covered storage only",
    "FIFO rotation confirmed",
    "Fridges ≤41°F verified",
    "Freezers 0°F verified",
    "Weekly deep clean log updated",
  ],
  Bar_Open: [
    "Unlock liquor",
    "Stock beer coolers",
    "Fill ice wells",
    "Cut garnishes",
    "Polish glassware",
    "Batch house cocktails",
    "Check wine levels",
  ],
  Bar_Close: [
    "Dump ice wells",
    "Wash mats/tools",
    "Sanitize bar top",
    "Count cash drawer",
    "Log liquor levels",
    "Lock liquor",
    "Turn off taps/lights",
    "Manager initial / sign-off",
  ],
};

const DEPT_META = {
  FOH_Open:          { label: 'FOH – Opening',           time: '60–75 min', color: 'bg-blue-100 text-blue-800',    header: 'bg-blue-50' },
  FOH_Close:         { label: 'FOH – Closing',            time: '60 min',    color: 'bg-blue-100 text-blue-800',    header: 'bg-blue-50' },
  KitchenClose:      { label: 'Kitchen – Closing',        time: '75–90 min', color: 'bg-orange-100 text-orange-800', header: 'bg-orange-50' },
  KitchenFoodSafety: { label: 'Kitchen – Food Safety',    time: 'daily',     color: 'bg-red-100 text-red-800',      header: 'bg-red-50' },
  Bar_Open:          { label: 'Bar – Opening',            time: '45–60 min', color: 'bg-purple-100 text-purple-800', header: 'bg-purple-50' },
  Bar_Close:         { label: 'Bar – Closing',            time: '45 min',    color: 'bg-purple-100 text-purple-800', header: 'bg-purple-50' },
};

// Departments visible by role
const ROLE_DEPTS = {
  manager: ['FOH_Open', 'FOH_Close', 'KitchenClose', 'KitchenFoodSafety', 'Bar_Open', 'Bar_Close'],
  chef:    ['KitchenClose', 'KitchenFoodSafety', 'FOH_Open', 'FOH_Close', 'Bar_Open', 'Bar_Close'],
  staff:   ['FOH_Open', 'FOH_Close', 'Bar_Open', 'Bar_Close'],
};

// ─── Single department checklist card ────────────────────────────────────────

function DeptChecklist({ department, today, staffName }) {
  const qc = useQueryClient();
  const meta = DEPT_META[department];
  const [collapsed, setCollapsed] = useState(false);

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
        ? {
            ...item,
            done: !item.done,
            doneBy: !item.done ? staffName : '',
            doneAt: !item.done ? new Date().toISOString() : '',
          }
        : item
    );
    update.mutate({ id: list.id, items });
  };

  if (isLoading) return <div className="p-4 text-center text-sm text-[rgb(45,45,45)]">Loading…</div>;
  if (!list) return null;

  const doneCount = (list.items || []).filter(i => i.done).length;
  const total = (list.items || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full px-5 py-4 flex items-center justify-between border-b border-[rgb(235,225,213)] ${meta.header} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-[rgb(107,85,64)]" />
          <div className="text-left">
            <p className="font-medium text-[rgb(107,85,64)]">{meta.label}</p>
            <p className="text-xs text-[rgb(45,45,45)]">{doneCount}/{total} complete · {meta.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {list.completed && <Badge className="bg-green-100 text-green-800 text-xs">✓ Done</Badge>}
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${meta.color}`}>{pct}%</span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-[rgb(107,85,64)]" /> : <ChevronUp className="w-4 h-4 text-[rgb(107,85,64)]" />}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1.5 bg-[rgb(235,225,213)]">
        <div
          className="h-full bg-[rgb(150,170,155)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      {!collapsed && (
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
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function StaffChecklist({ session }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const staffName = session?.name || 'Staff';
  const role = session?.role || 'staff';

  const depts = ROLE_DEPTS[role] || ROLE_DEPTS.staff;

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
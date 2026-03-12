import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CHECKLIST_TEMPLATES, DEPT_META, ALL_DEPTS } from '@/components/checklistDefaults';

// Departments visible by role
const ROLE_DEPTS = {
  manager:                ALL_DEPTS,
  chef:                   ['Kitchen_Open', 'KitchenClose', 'KitchenFoodSafety', 'FOH_Open', 'FOH_Close', 'Bar_Open', 'Bar_Close'],
  kitchen_staff:          ['Kitchen_Open', 'KitchenClose', 'KitchenFoodSafety'],
  server:                 ['FOH_Open', 'FOH_Close', 'Bar_Open', 'Bar_Close'],
  hotel_host:             ['FOH_Open', 'FOH_Close'],
  hotel_service_provider: ['FOH_Open', 'FOH_Close'],
  housekeeping:           ['FOH_Open', 'FOH_Close'],
};

// ─── Single department checklist card ────────────────────────────────────────
function DeptChecklist({ department, today, staffName, templateOverride }) {
  const qc = useQueryClient();
  const meta = DEPT_META[department];
  const [collapsed, setCollapsed] = useState(true);

  const { data: list, isLoading } = useQuery({
    queryKey: ['checklist', department, today],
    queryFn: async () => {
      const rows = await base44.entities.DailyChecklist.filter({ department, date: today });
      if (rows.length) return rows[0];
      // Build items from template (admin-customized if available, else hardcoded defaults)
      const activeItems = templateOverride
        ? (templateOverride.items || []).filter(i => i.active !== false).map(i => ({ label: i.label, done: false }))
        : (CHECKLIST_TEMPLATES[department] || []).map(label => ({ label, done: false }));
      return base44.entities.DailyChecklist.create({ department, date: today, items: activeItems, completed: false });
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

  if (isLoading) return <div className="p-4 text-center text-sm text-[rgb(45,45,45)]">Loading…</div>;
  if (!list) return null;

  const doneCount = (list.items || []).filter(i => i.done).length;
  const total = (list.items || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white border border-[rgb(235,225,213)] rounded-xl overflow-hidden">
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
      <div className="h-1.5 bg-[rgb(235,225,213)]">
        <div className="h-full bg-[rgb(150,170,155)] transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
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
  const roles = session?.roles
    ? session.roles.split(',').map(r => r.trim()).filter(Boolean)
    : [session?.role || 'server'];

  // Union of all depts across all roles
  const depts = [...new Set(
    roles.flatMap(role => ROLE_DEPTS[role] || ROLE_DEPTS.server)
  )];

  // Load admin-customized templates
  const { data: allTemplates = [] } = useQuery({
    queryKey: ['checklist-dept-templates'],
    queryFn: () => base44.entities.ChecklistDeptTemplate.list(),
  });
  const templateMap = Object.fromEntries(allTemplates.map(t => [t.department, t]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-light text-[rgb(107,85,64)]">Daily Checklists</h2>
        <p className="text-sm text-[rgb(45,45,45)]">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>
      {depts.map(dept => (
        <DeptChecklist
          key={dept}
          department={dept}
          today={today}
          staffName={staffName}
          templateOverride={templateMap[dept] || null}
        />
      ))}
    </div>
  );
}
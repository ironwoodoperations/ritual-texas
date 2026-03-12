import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';
import { CHECKLIST_TEMPLATES, DEPT_META, ALL_DEPTS } from '@/lib/checklistDefaults';

export default function AdminChecklistSetup() {
  const qc = useQueryClient();
  const [dept, setDept] = useState(null);
  const [editItems, setEditItems] = useState(null);
  const [saved, setSaved] = useState(false);

  const { data: allTemplates = [] } = useQuery({
    queryKey: ['checklist-dept-templates'],
    queryFn: () => base44.entities.ChecklistDeptTemplate.list(),
  });

  const templateMap = Object.fromEntries(allTemplates.map(t => [t.department, t]));

  const saveMutation = useMutation({
    mutationFn: ({ deptId, items }) => {
      const existing = templateMap[deptId];
      if (existing?.id) return base44.entities.ChecklistDeptTemplate.update(existing.id, { items });
      return base44.entities.ChecklistDeptTemplate.create({ department: deptId, items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist-dept-templates'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // When dept selection changes, load items from DB or fall back to defaults
  useEffect(() => {
    if (!dept) { setEditItems(null); return; }
    const t = templateMap[dept];
    if (t) {
      setEditItems(t.items || []);
    } else {
      // Pre-load from hardcoded defaults so admin can see and edit them
      const defaults = CHECKLIST_TEMPLATES[dept] || [];
      setEditItems(defaults.map(label => ({ label, active: true })));
    }
  }, [dept, allTemplates.length]);

  const save = () => {
    if (!dept || editItems === null) return;
    saveMutation.mutate({ deptId: dept, items: editItems });
  };

  const toggleActive = (idx) => {
    setEditItems(items => items.map((item, i) => i === idx ? { ...item, active: item.active === false ? true : false } : item));
  };

  const updateLabel = (idx, label) => {
    setEditItems(items => items.map((item, i) => i === idx ? { ...item, label } : item));
  };

  const removeItem = (idx) => {
    setEditItems(items => items.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setEditItems(items => [...(items || []), { label: '', active: true }]);
  };

  const activeCount = editItems ? editItems.filter(i => i.active !== false).length : 0;

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('StaffControls')} className="p-2 rounded-xl hover:bg-[rgb(248,246,242)]">
              <ArrowLeft className="w-4 h-4 text-[rgb(107,85,64)]" />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-[rgb(107,85,64)]">Checklist Templates</h1>
              <p className="text-xs text-[rgb(150,150,150)]">Manage opening & closing duty items</p>
            </div>
          </div>
          {dept && editItems !== null && (
            <button
              onClick={save}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 md:grid md:grid-cols-3 md:gap-6">
        {/* Dept list */}
        <div className="mb-6 md:mb-0 space-y-2">
          <p className="text-xs font-semibold tracking-widest text-[rgb(107,85,64)] uppercase mb-3">Departments</p>
          {ALL_DEPTS.map(d => {
            const meta = DEPT_META[d];
            const stored = templateMap[d];
            const isActive = dept === d;
            return (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-[rgb(107,85,64)] bg-[rgb(107,85,64)] text-white'
                    : 'border-[rgb(235,225,213)] bg-white text-[rgb(45,45,45)] hover:border-[rgb(198,182,165)]'
                }`}
              >
                <div className="text-sm font-medium">{meta?.label || d}</div>
                <div className={`text-xs mt-0.5 ${isActive ? 'text-white/70' : 'text-[rgb(150,150,150)]'}`}>
                  {stored
                    ? `${stored.items?.filter(i => i.active !== false).length || 0} active / ${stored.items?.length || 0} total`
                    : `${(CHECKLIST_TEMPLATES[d] || []).length} default items`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Item editor */}
        <div className="md:col-span-2">
          {!dept ? (
            <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-12 text-center text-[rgb(150,150,150)]">
              <p className="text-sm">Select a department to manage its checklist items</p>
              <p className="text-xs mt-2">Toggle items on/off, add custom items, or delete ones you don't need</p>
            </div>
          ) : (
            <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[rgb(235,225,213)] flex items-center justify-between bg-[rgb(248,246,242)]">
                <div>
                  <h2 className="font-medium text-[rgb(107,85,64)]">{DEPT_META[dept]?.label || dept}</h2>
                  <p className="text-xs text-[rgb(150,150,150)] mt-0.5">
                    {activeCount} active · {editItems?.length || 0} total items
                    {!templateMap[dept] && <span className="ml-2 text-amber-600">· Unsaved (loaded from defaults)</span>}
                  </p>
                </div>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgb(150,170,155)] text-[rgb(80,120,90)] text-sm hover:bg-[rgb(245,250,246)] transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="divide-y divide-[rgb(235,225,213)] max-h-[60vh] overflow-y-auto">
                {(editItems || []).map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                      item.active === false ? 'bg-[rgb(250,248,245)] opacity-50' : 'hover:bg-[rgb(250,248,245)]'
                    }`}
                  >
                    <button
                      onClick={() => toggleActive(idx)}
                      title={item.active !== false ? 'Disable item' : 'Re-enable item'}
                      className="shrink-0 p-1 rounded hover:bg-[rgb(235,225,213)] transition-colors"
                    >
                      {item.active !== false
                        ? <Eye className="w-4 h-4 text-[rgb(150,170,155)]" />
                        : <EyeOff className="w-4 h-4 text-[rgb(150,150,150)]" />
                      }
                    </button>
                    <input
                      value={item.label}
                      onChange={e => updateLabel(idx, e.target.value)}
                      className="flex-1 text-sm bg-transparent border-0 focus:outline-none text-[rgb(45,45,45)] placeholder-[rgb(190,180,170)]"
                      placeholder="Item description..."
                    />
                    <button
                      onClick={() => { if (confirm('Delete this item?')) removeItem(idx); }}
                      className="shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {editItems?.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-[rgb(150,150,150)]">
                    No items — click "Add Item" to start.
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-[rgb(235,225,213)] bg-[rgb(248,246,242)] text-xs text-[rgb(150,150,150)]">
                <Eye className="w-3 h-3 inline mr-1" /> = item is shown to staff &nbsp;·&nbsp;
                <EyeOff className="w-3 h-3 inline mr-1" /> = item hidden (disabled)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
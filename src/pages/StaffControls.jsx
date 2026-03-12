import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Users, Pencil, Check, X } from 'lucide-react';
import { DEFAULT_MODULES, ALL_ROLES, ROLE_COLORS, ROLE_DESCRIPTIONS } from '@/components/staffAccess';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Helper: get array of roles from a pin record
function getPinRoles(p) {
  if (p.roles) return p.roles.split(',').map(r => r.trim()).filter(Boolean);
  if (p.role) return [p.role];
  return ['server'];
}

// Helper: set roles back to the pin format
function buildRolesStr(arr) {
  return arr.join(',');
}

// ── Editable PIN row ──────────────────────────────────────────────────────────
function PinRow({ p, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: p.name || '', pin: p.pin || '', role: p.role || 'server', is_active: p.is_active ?? true });
  const [err, setErr] = useState('');

  const save = () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!/^\d{4}$/.test(form.pin)) { setErr('PIN must be exactly 4 digits.'); return; }
    setErr('');
    onSave(p.id, form);
    setEditing(false);
  };

  const cancel = () => {
    setForm({ name: p.name || '', pin: p.pin || '', role: p.role || 'server', is_active: p.is_active ?? true });
    setErr('');
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-[rgb(248,246,242)]">
        <td className="px-4 py-3">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Staff name" className="h-8 text-sm" />
        </td>
        <td className="px-4 py-3">
          <Input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/[^\d]/g, '').slice(0, 4) }))} placeholder="4 digits" inputMode="numeric" maxLength={4} className="h-8 text-sm w-24" />
        </td>
        <td className="px-4 py-3">
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="border border-input rounded-md px-2 py-1 text-sm bg-white h-8">
            {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </td>
        <td className="px-4 py-3">
          <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white h-8 px-3"><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" onClick={cancel} className="h-8 px-3"><X className="w-4 h-4" /></Button>
          </div>
          {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-[rgb(235,225,213)] hover:bg-[rgb(248,246,242)] transition-colors">
      <td className="px-4 py-3 font-medium text-[rgb(107,85,64)]">{p.name || '—'}</td>
      <td className="px-4 py-3 font-mono text-sm text-[rgb(45,45,45)]">••••</td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[p.role] || 'bg-gray-100 text-gray-700'}`}>
          {(p.role || 'server').replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <Switch checked={p.is_active ?? true} onCheckedChange={v => onSave(p.id, { ...p, is_active: v })} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-8 px-3"><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
          <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete PIN for ${p.name}?`)) onDelete(p.id); }} className="h-8 px-3 border-red-200 hover:bg-red-50 text-red-600">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddPinRow({ onAdd }) {
  const [form, setForm] = useState({ name: '', pin: '', role: 'server' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!/^\d{4}$/.test(form.pin)) { setErr('PIN must be exactly 4 digits.'); return; }
    setErr('');
    onAdd({ ...form, is_active: true });
    setForm({ name: '', pin: '', role: 'server' });
  };

  return (
    <tr className="border-t-2 border-[rgb(150,170,155)] bg-[rgb(248,252,250)]">
      <td className="px-4 py-3">
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Staff name *" className="h-8 text-sm" />
      </td>
      <td className="px-4 py-3">
        <Input value={form.pin} onChange={e => { setForm(f => ({ ...f, pin: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })); setErr(''); }} placeholder="4 digits *" inputMode="numeric" maxLength={4} className="h-8 text-sm w-24" />
      </td>
      <td className="px-4 py-3">
        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="border border-input rounded-md px-2 py-1 text-sm bg-white h-8">
          {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-[rgb(45,45,45)]">Active by default</td>
      <td className="px-4 py-3">
        <div>
          <Button onClick={submit} className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white h-8 px-4 text-sm">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
          {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
        </div>
      </td>
    </tr>
  );
}

// ── Module permission row with checkboxes per role ────────────────────────────
function ModulePermRow({ d, row, onUpsert }) {
  const staff_visible = row?.staff_visible ?? d.defaultVisible;
  const allowed_roles_str = row?.allowed_roles ?? d.defaultRoles;

  const currentRoles = allowed_roles_str
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);

  const toggleRole = (role) => {
    let next;
    if (currentRoles.includes(role)) {
      next = currentRoles.filter(r => r !== role);
    } else {
      next = [...currentRoles, role];
    }
    onUpsert({ key: d.key, label: d.label, staff_visible, allowed_roles: next.join(',') });
  };

  const toggleVisible = (v) => {
    onUpsert({ key: d.key, label: d.label, staff_visible: v, allowed_roles: allowed_roles_str });
  };

  return (
    <div className="p-4 rounded-lg border border-[rgb(235,225,213)] bg-white">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-[rgb(107,85,64)]">{d.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[rgb(45,45,45)]">Visible</span>
          <Switch checked={!!staff_visible} onCheckedChange={toggleVisible} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_ROLES.map(role => {
          const checked = currentRoles.includes(role);
          return (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                checked
                  ? `${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'} border-transparent`
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              }`}
            >
              {role.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffControls() {
  const qc = useQueryClient();

  const { data: pins = [] } = useQuery({
    queryKey: ['staffPins'],
    queryFn: () => base44.entities.StaffPin.list(),
  });

  const { data: moduleRows = [] } = useQuery({
    queryKey: ['staffModules'],
    queryFn: () => base44.entities.StaffModuleSetting.list(),
  });

  const moduleMap = useMemo(() => {
    const m = new Map();
    (moduleRows || []).forEach(r => r?.key && m.set(r.key, r));
    return m;
  }, [moduleRows]);

  const upsertModule = useMutation({
    mutationFn: async (row) => {
      const existing = moduleMap.get(row.key);
      if (existing?.id) return base44.entities.StaffModuleSetting.update(existing.id, row);
      return base44.entities.StaffModuleSetting.create(row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffModules'] }),
  });

  const createPin = useMutation({
    mutationFn: (row) => base44.entities.StaffPin.create(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffPins'] }),
  });

  const updatePin = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffPin.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffPins'] }),
  });

  const deletePin = useMutation({
    mutationFn: (id) => base44.entities.StaffPin.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staffPins'] }),
  });

  // Seed default module settings if missing
  useEffect(() => {
    (async () => {
      try {
        for (const d of DEFAULT_MODULES) {
          if (!moduleMap.get(d.key)) {
            await base44.entities.StaffModuleSetting.create({
              key: d.key, label: d.label,
              staff_visible: d.defaultVisible,
              allowed_roles: d.defaultRoles,
            });
          }
        }
        qc.invalidateQueries({ queryKey: ['staffModules'] });
      } catch {}
    })();
  }, [moduleMap.size]);

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link to={createPageUrl('AdminDashboard')} className="text-sm text-[rgb(150,170,155)] hover:underline mb-1 block">← Admin Dashboard</Link>
            <h1 className="text-3xl font-light text-[rgb(107,85,64)] flex items-center gap-3">
              <Users className="w-7 h-7 text-[rgb(150,170,155)]" />
              Staff Controls
            </h1>
            <p className="text-sm text-[rgb(45,45,45)] mt-1">Manage staff PINs, roles, and module permissions.</p>
          </div>
          <Link to={createPageUrl('StaffDashboard')} className="text-sm px-4 py-2 bg-[rgb(150,170,155)] text-white rounded hover:bg-[rgb(130,150,135)] transition-colors">
            Preview Staff View →
          </Link>
        </div>

        {/* ── PIN Management ── */}
        <Card className="border-[rgb(235,225,213)]">
          <CardHeader>
            <CardTitle className="text-[rgb(107,85,64)]">Staff Members & PINs</CardTitle>
            <p className="text-sm text-[rgb(45,45,45)]">Each staff member gets a name, a 4-digit PIN, and a role. Roles control which modules they can see.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[rgb(235,225,213)] text-left">
                  <th className="px-4 py-3 font-medium text-[rgb(107,85,64)]">Staff Name</th>
                  <th className="px-4 py-3 font-medium text-[rgb(107,85,64)]">PIN</th>
                  <th className="px-4 py-3 font-medium text-[rgb(107,85,64)]">Role</th>
                  <th className="px-4 py-3 font-medium text-[rgb(107,85,64)]">Active</th>
                  <th className="px-4 py-3 font-medium text-[rgb(107,85,64)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pins.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[rgb(45,45,45)]">No staff yet — add one below.</td></tr>
                )}
                {pins.map(p => (
                  <PinRow key={p.id} p={p} onSave={(id, data) => updatePin.mutate({ id, data })} onDelete={(id) => deletePin.mutate(id)} />
                ))}
                <AddPinRow onAdd={(row) => createPin.mutate(row)} />
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Role Descriptions ── */}
        <Card className="border-[rgb(235,225,213)]">
          <CardHeader>
            <CardTitle className="text-[rgb(107,85,64)]">Role Reference</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_ROLES.map(role => (
              <div key={role} className="p-4 rounded-lg border border-[rgb(235,225,213)] bg-white">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
                  {role.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-[rgb(45,45,45)] mt-2">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Module Permissions ── */}
        <Card className="border-[rgb(235,225,213)]">
          <CardHeader>
            <CardTitle className="text-[rgb(107,85,64)]">Module Permissions</CardTitle>
            <p className="text-sm text-[rgb(45,45,45)]">Toggle visibility and click role badges to grant/revoke access per module.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEFAULT_MODULES.map(d => (
              <ModulePermRow
                key={d.key}
                d={d}
                row={moduleMap.get(d.key)}
                onUpsert={(row) => upsertModule.mutate(row)}
              />
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
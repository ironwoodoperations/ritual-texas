import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Users } from 'lucide-react';
import { DEFAULT_MODULES } from '@/components/staffAccess';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

  const [newPin, setNewPin] = useState('');
  const [newPinRole, setNewPinRole] = useState('staff');
  const [newPinName, setNewPinName] = useState('');
  const [pinError, setPinError] = useState('');

  // Seed default module settings if missing
  useEffect(() => {
    (async () => {
      try {
        for (const d of DEFAULT_MODULES) {
          if (!moduleMap.get(d.key)) {
            await base44.entities.StaffModuleSetting.create({
              key: d.key,
              label: d.label,
              staff_visible: d.defaultVisible,
              allowed_roles: d.defaultRoles,
            });
          }
        }
        qc.invalidateQueries({ queryKey: ['staffModules'] });
      } catch {}
    })();
  }, [moduleMap.size]);

  const onAddPin = () => {
    if (!/^\d{4}$/.test(newPin)) { setPinError('PIN must be exactly 4 digits.'); return; }
    setPinError('');
    createPin.mutate({
      pin: newPin,
      role: newPinRole || 'staff',
      name: newPinName || (newPinRole || 'staff').toUpperCase(),
      is_active: true,
    });
    setNewPin(''); setNewPinName(''); setNewPinRole('staff');
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to={createPageUrl('AdminDashboard')} className="text-sm text-[rgb(150,170,155)] hover:underline mb-1 block">
              ← Admin Dashboard
            </Link>
            <h1 className="text-3xl font-light text-[rgb(107,85,64)] flex items-center gap-3">
              <Users className="w-7 h-7 text-[rgb(150,170,155)]" />
              Staff Controls
            </h1>
            <p className="text-sm text-[rgb(45,45,45)] mt-1">
              Control what staff see at <strong>/StaffDashboard</strong> and manage 4-digit PINs.
            </p>
          </div>
          <a
            href={createPageUrl('StaffDashboard')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 bg-[rgb(150,170,155)] text-white rounded hover:bg-[rgb(130,150,135)] transition-colors"
          >
            Preview Staff View →
          </a>
        </div>

        {/* Modules */}
        <Card className="border-[rgb(235,225,213)]">
          <CardHeader>
            <CardTitle className="text-[rgb(107,85,64)]">Staff Modules</CardTitle>
            <p className="text-sm text-[rgb(45,45,45)]">Toggle which sections are visible and which roles can access them.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {DEFAULT_MODULES.map(d => {
              const row = moduleMap.get(d.key);
              const staff_visible = row?.staff_visible ?? d.defaultVisible;
              const allowed_roles = row?.allowed_roles ?? d.defaultRoles;
              return (
                <div key={d.key} className="p-4 rounded-lg border border-[rgb(235,225,213)] bg-white space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[rgb(107,85,64)]">{d.label}</div>
                      <div className="text-xs text-[rgb(45,45,45)]">Key: <code>{d.key}</code></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[rgb(45,45,45)]">Visible</span>
                      <Switch
                        checked={!!staff_visible}
                        onCheckedChange={(v) => upsertModule.mutate({ key: d.key, label: d.label, staff_visible: v, allowed_roles })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-[rgb(45,45,45)]">Allowed Roles (comma-separated)</Label>
                    <Input
                      className="mt-1"
                      value={allowed_roles}
                      onChange={(e) => upsertModule.mutate({ key: d.key, label: d.label, staff_visible, allowed_roles: e.target.value })}
                      placeholder="staff,chef,manager"
                    />
                    <p className="text-xs text-[rgb(45,45,45)] mt-1">Default: <em>{d.defaultRoles}</em></p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* PIN Management */}
        <Card className="border-[rgb(235,225,213)]">
          <CardHeader>
            <CardTitle className="text-[rgb(107,85,64)]">PIN Management</CardTitle>
            <p className="text-sm text-[rgb(45,45,45)]">Create 4-digit PINs for staff access. No email needed.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add PIN */}
            <div className="p-4 rounded-lg border border-[rgb(235,225,213)] bg-white">
              <p className="text-sm font-medium text-[rgb(107,85,64)] mb-3">Add New PIN</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">4-digit PIN</Label>
                  <Input
                    value={newPin}
                    onChange={(e) => { setNewPin(e.target.value.replace(/[^\d]/g, '').slice(0, 4)); setPinError(''); }}
                    placeholder="1234"
                    inputMode="numeric"
                    maxLength={4}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Input
                    value={newPinRole}
                    onChange={(e) => setNewPinRole(e.target.value)}
                    placeholder="staff / chef / manager"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Staff Name</Label>
                  <Input
                    value={newPinName}
                    onChange={(e) => setNewPinName(e.target.value)}
                    placeholder="e.g. Maria, Kitchen AM"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
                    onClick={onAddPin}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add PIN
                  </Button>
                </div>
              </div>
              {pinError && <p className="text-red-600 text-sm mt-2">{pinError}</p>}
            </div>

            {/* PIN List */}
            <div className="space-y-2">
              {pins.length === 0 && (
                <p className="text-[rgb(45,45,45)] text-sm py-2">No PINs yet. Add one above.</p>
              )}
              {pins.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[rgb(235,225,213)] bg-white">
                  <div>
                    <div className="font-medium text-[rgb(107,85,64)]">
                      {p.name || 'PIN'} <span className="text-[rgb(45,45,45)] font-normal">({p.role || 'staff'})</span>
                    </div>
                    <div className="text-xs text-[rgb(45,45,45)]">PIN: ••••</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[rgb(45,45,45)]">Active</span>
                      <Switch
                        checked={(p.is_active ?? true) === true}
                        onCheckedChange={(v) => updatePin.mutate({ id: p.id, data: { is_active: v } })}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-red-200 hover:bg-red-50"
                      onClick={() => deletePin.mutate(p.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
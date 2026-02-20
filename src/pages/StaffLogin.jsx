import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Leaf } from 'lucide-react';
import { setStaffSession, verifyPin } from '@/components/staffAccess';

export default function StaffLogin() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();

  const pinOk = /^\d{4}$/.test(pin);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pinOk) { setError('Enter a 4-digit PIN.'); return; }
    setLoading(true);
    setError('');
    try {
      const verified = await verifyPin(pin);
      if (!verified) {
        setError('Invalid PIN. Ask a manager for the correct code.');
        setLoading(false);
        return;
      }
      setStaffSession({
        role: verified.role,
        name: verified.name,
        exp: Date.now() + (12 * 60 * 60 * 1000),
      });
      nav('/StaffDashboard');
    } catch (err) {
      console.error(err);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'rgb(248,246,242)' }}>
      <Card className="w-full max-w-sm border border-[rgb(235,225,213)]" style={{ backgroundColor: 'white' }}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-[rgb(150,170,155)] flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl font-light tracking-wide" style={{ color: 'rgb(107,85,64)' }}>
            RITUAL Staff Access
          </CardTitle>
          <p className="text-sm text-[rgb(107,85,64)]/60 mt-1">Enter your 4-digit PIN</p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/[^\d]/g, '')); setError(''); }}
              placeholder="• • • •"
              className="text-center text-2xl tracking-widest h-14"
              autoFocus
            />
            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            <Button
              className="w-full h-12 text-white"
              style={{ backgroundColor: 'rgb(150,170,155)' }}
              disabled={!pinOk || loading}
            >
              {loading ? 'Checking…' : 'Enter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
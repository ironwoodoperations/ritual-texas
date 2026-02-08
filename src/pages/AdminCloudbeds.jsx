import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react';

export default function AdminCloudbeds() {
  const [lookupConfirmation, setLookupConfirmation] = useState('');
  const [lookupContact, setLookupContact] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['cloudbeds-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const accessToken = settings.find(s => s.key === 'CLOUDBEDS_ACCESS_TOKEN')?.value;
  const refreshToken = settings.find(s => s.key === 'CLOUDBEDS_REFRESH_TOKEN')?.value;
  const tokenExpiry = settings.find(s => s.key === 'CLOUDBEDS_TOKEN_EXPIRY')?.value;

  const isAuthorized = !!accessToken && !!refreshToken;

  const handleAuthorize = () => {
    window.open('https://hotel-ritual-experience-automation-a6e982ce.base44.app/functions/cloudbedsOAuthStart', '_blank');
  };

  const testLookup = async () => {
    try {
      const result = await base44.functions.invoke('cloudbedsReservationsLookup', {
        confirmation: lookupConfirmation,
        contact: lookupContact
      });
      setLookupResult(result.data);
    } catch (error) {
      setLookupResult({ error: error.message });
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Cloudbeds Integration</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>Manage your Cloudbeds API connection</p>

      {/* Authorization Status */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          {isAuthorized ? (
            <CheckCircle className="w-6 h-6" style={{ color: '#10b981' }} />
          ) : (
            <XCircle className="w-6 h-6" style={{ color: '#ef4444' }} />
          )}
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            {isAuthorized ? 'Connected to Cloudbeds' : 'Not Connected'}
          </h2>
        </div>

        {isAuthorized ? (
          <div style={{ color: '#666' }}>
            <p>✅ Access Token: Active</p>
            <p>✅ Refresh Token: Active</p>
            {tokenExpiry && <p>Token expires: {new Date(tokenExpiry).toLocaleString()}</p>}
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Click the button below to authorize this app with your Cloudbeds account.
            </p>
            <Button onClick={handleAuthorize} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExternalLink className="w-4 h-4" />
              Authorize with Cloudbeds
            </Button>
          </div>
        )}
      </div>

      {/* Test Lookup */}
      {isAuthorized && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Test Reservation Lookup</h2>
          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            <Input
              placeholder="Confirmation Code"
              value={lookupConfirmation}
              onChange={(e) => setLookupConfirmation(e.target.value)}
            />
            <Input
              placeholder="Guest Email or Phone"
              value={lookupContact}
              onChange={(e) => setLookupContact(e.target.value)}
            />
            <Button onClick={testLookup}>Test Lookup</Button>
          </div>

          {lookupResult && (
            <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
                {JSON.stringify(lookupResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
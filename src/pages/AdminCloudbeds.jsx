import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import PageHelpBanner from '@/components/PageHelpBanner';

const HELP_CONTENT = `Cloudbeds is Ritual's Hotel Property Management System — every room reservation lives here.

CONNECTION STATUS
• Green checkmark = Connected. Data flows live to the dashboard (arrivals, departures, in-house counts).
• Red X = Not connected. The Day in 60 Seconds panel will show no hotel data until reconnected.

IF THE TOKEN EXPIRES (happens every 8 hours automatically, or if connection drops)
1. Try "Refresh Token" first — this silently renews the connection without re-authorizing.
2. If Refresh fails, click "Reconnect Cloudbeds" — this sends you through the OAuth flow again.
3. After reconnecting, return to the Admin Dashboard and confirm the hotel panel shows live data.

TEST RESERVATION LOOKUP
• Use this to verify the Cloudbeds connection is working — enter a confirmation code or guest email to pull their reservation directly.

Pro Tip: The Cloudbeds token refresh runs automatically every few hours. If hotel data disappears from the dashboard mid-day, come here first and click Refresh Token.`;

export default function AdminCloudbeds() {
  const [lookupConfirmation, setLookupConfirmation] = useState('');
  const [lookupContact, setLookupContact] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['cloudbeds-settings'],
    queryFn: () => base44.entities.SiteSettings.list(),
  });

  const accessToken = settings.find(s => s.key === 'CLOUDBEDS_ACCESS_TOKEN')?.value;
  const refreshToken = settings.find(s => s.key === 'CLOUDBEDS_REFRESH_TOKEN')?.value;
  const tokenExpiry = settings.find(s => s.key === 'CLOUDBEDS_TOKEN_EXPIRES_AT')?.value;
  const isAuthorized = !!accessToken && !!refreshToken;

  const handleConnect = () => {
    window.location.href = '/functions/cloudbedsOAuthStart';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await base44.functions.invoke('refreshCloudbedsToken', {});
      if (res.data?.success) {
        setRefreshMsg('✅ Token refreshed successfully.');
        queryClient.invalidateQueries(['cloudbeds-settings']);
      } else {
        setRefreshMsg(`❌ ${res.data?.error || 'Refresh failed'}`);
      }
    } catch (e) {
      setRefreshMsg(`❌ ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const testLookup = async () => {
    setLookupResult({ status: 'loading...' });
    try {
      const result = await base44.functions.invoke('cloudbedsReservationsLookup', {
        confirmation: lookupConfirmation,
        contact: lookupContact,
      });
      setLookupResult({ httpStatus: result.status, data: result.data });
    } catch (error) {
      setLookupResult({ error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-light text-[rgb(107,85,64)]">Cloudbeds Integration</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <PageHelpBanner title="Cloudbeds Integration" content={HELP_CONTENT} accentColor="rgb(107,85,64)" />

        {/* Status Card */}
        <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {isAuthorized
              ? <CheckCircle className="w-6 h-6 text-green-500" />
              : <XCircle className="w-6 h-6 text-red-400" />
            }
            <h2 className="text-lg font-medium text-[rgb(45,45,45)]">
              {isAuthorized ? 'Connected to Cloudbeds' : 'Not Connected'}
            </h2>
          </div>

          {isAuthorized ? (
            <div className="space-y-2 text-sm text-[rgb(120,120,120)] mb-5">
              <p>✅ Access Token: Active</p>
              <p>✅ Refresh Token: Active</p>
              {tokenExpiry && <p>Expires: {new Date(tokenExpiry).toLocaleString()}</p>}
            </div>
          ) : (
            <p className="text-sm text-[rgb(120,120,120)] mb-5">
              Click below to authorize this app with your Cloudbeds account.
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button onClick={handleConnect} className="flex items-center gap-2 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white">
              <ExternalLink className="w-4 h-4" />
              {isAuthorized ? 'Reconnect Cloudbeds' : 'Connect Cloudbeds'}
            </Button>

            {isAuthorized && (
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="flex items-center gap-2 border-[rgb(235,225,213)]">
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Token
              </Button>
            )}
          </div>

          {refreshMsg && (
            <p className={`mt-3 text-sm ${refreshMsg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{refreshMsg}</p>
          )}
        </div>

        {/* Test Lookup */}
        {isAuthorized && (
          <div className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-6">
            <h2 className="text-lg font-medium text-[rgb(45,45,45)] mb-4">Test Reservation Lookup</h2>
            <div className="space-y-3 mb-4">
              <Input placeholder="Confirmation Code" value={lookupConfirmation} onChange={e => setLookupConfirmation(e.target.value)} />
              <Input placeholder="Guest Email or Phone" value={lookupContact} onChange={e => setLookupContact(e.target.value)} />
              <Button onClick={testLookup} className="w-full bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white">Test Lookup</Button>
            </div>
            {lookupResult && (
              <pre className="bg-[rgb(248,246,242)] rounded-xl p-4 text-xs text-[rgb(45,45,45)] whitespace-pre-wrap break-all border border-[rgb(235,225,213)]">
                {JSON.stringify(lookupResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
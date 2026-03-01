import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const date = body.date || '2026-02-24';

    const clientId = Deno.env.get('TOAST_CLIENT_ID');
    const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
    const authUrl = Deno.env.get('TOAST_AUTH_URL');
    const apiBase = Deno.env.get('TOAST_API_BASE');
    const restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');

    // Auth
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAccessType: 'TOAST_MACHINE_CLIENT', clientId, clientSecret }),
    });
    const authData = await authRes.json();
    const token = authData?.token?.accessToken || authData?.access_token || authData?.accessToken;

    if (!token) {
      return Response.json({ ok: false, error: 'No token', authData });
    }

    const startDate = `${date}T00:00:00.000-0600`;
    const endDate = `${date}T23:59:59.999-0600`;

    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': restaurantGuid,
    };

    const results = {};

    // Test all plausible endpoints
    const endpoints = [
      { key: 'ordersBulk', url: `${apiBase}/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=10&page=1` },
      { key: 'laborTimeEntries', url: `${apiBase}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}` },
      { key: 'laborShifts', url: `${apiBase}/labor/v1/shifts?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}` },
      { key: 'analyticsSales', url: `${apiBase}/analytics/v2/reports/sales?restaurantGuid=${restaurantGuid}&businessDate=${date}` },
      { key: 'cashMgmtDeposits', url: `${apiBase}/cashmgmt/v1/deposits?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}` },
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, { headers });
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
      // Truncate large arrays for readability
      if (Array.isArray(parsed)) parsed = { count: parsed.length, sample: parsed.slice(0, 2) };
      results[ep.key] = { status: res.status, body: parsed };
    }

    return Response.json({ token: 'obtained', restaurantGuid, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
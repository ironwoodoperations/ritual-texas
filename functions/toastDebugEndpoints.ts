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
    const token = authData.access_token;

    const results = {};

    // Try various Toast reporting endpoints
    const endpoints = [
      `/reporting/v1/orders?restaurantGuid=${restaurantGuid}&startDate=${date}&endDate=${date}`,
      `/orders/v2/ordersBulk?restaurantGuid=${restaurantGuid}&startDate=${date}T00:00:00.000-0600&endDate=${date}T23:59:59.999-0600`,
      `/analytics/v2/reports/sales?restaurantGuid=${restaurantGuid}&businessDate=${date}`,
      `/cashmgmt/v1/shifts?restaurantGuid=${restaurantGuid}&startDate=${date}&endDate=${date}`,
      `/labor/v1/timeEntries?restaurantGuid=${restaurantGuid}&startDate=${date}&endDate=${date}`,
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${apiBase}${ep}`, {
        headers: { Authorization: `Bearer ${token}`, 'Toast-Restaurant-External-ID': restaurantGuid },
      });
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      results[ep] = { status: res.status, body: parsed };
    }

    return Response.json({ token: token ? 'obtained' : 'missing', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().slice(0, 10);

    const clientId = Deno.env.get('TOAST_CLIENT_ID');
    const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
    const authUrl = Deno.env.get('TOAST_AUTH_URL');
    const apiBase = (Deno.env.get('TOAST_API_BASE') || '').replace(/\/$/, '');
    const restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');

    // Authenticate
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAccessType: 'TOAST_MACHINE_CLIENT', clientId, clientSecret }),
    });
    const authData = await authRes.json();
    const token = authData?.token?.accessToken || authData?.access_token || authData?.accessToken;
    if (!token) return Response.json({ error: 'Auth failed', authData });

    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': restaurantGuid,
      'Content-Type': 'application/json',
    };

    const yyyymmdd = date.replace(/-/g, '');
    const startDate = `${date}T00:00:00.000-06:00`;
    const endDate = `${date}T23:59:59.999-06:00`;
    const results = {};

    async function probe(key, url) {
      const r = await fetch(url, { headers });
      const text = await r.text();
      let body;
      try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
      if (Array.isArray(body)) {
        results[key] = { status: r.status, count: body.length, sample: body[0] };
      } else {
        results[key] = { status: r.status, body };
      }
    }

    await Promise.all([
      // Orders
      probe('ordersBulk', `${apiBase}/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=10`),
      // Labor time entries
      probe('laborTimeEntries', `${apiBase}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
      // Cash shifts
      probe('cashShifts', `${apiBase}/cashmgmt/v1/shifts?businessDate=${yyyymmdd}`),
      // Restaurant info
      probe('restaurantInfo', `${apiBase}/restaurants/v1/restaurants/${restaurantGuid}`),
    ]);

    return Response.json({ date, results });
  } catch (e) {
    return Response.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
});
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

    // Auth - try both with and without restaurantGuid
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

    // Try with restaurantGuid in header only, and also as query param
    const headersHeaderOnly = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': restaurantGuid,
    };

    const results = {};

    // ordersBulk with restaurantGuid as query param
    const u1 = `${apiBase}/orders/v2/ordersBulk?restaurantGuid=${restaurantGuid}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=5`;
    const r1 = await fetch(u1, { headers: headersHeaderOnly });
    const t1 = await r1.text();
    let p1; try { p1 = JSON.parse(t1); } catch { p1 = t1.slice(0,500); }
    if (Array.isArray(p1)) p1 = { count: p1.length, sample: p1.slice(0,1) };
    results['ordersBulk_withGuidParam'] = { status: r1.status, body: p1 };

    // laborTimeEntries with restaurantGuid as query param
    const u2 = `${apiBase}/labor/v1/timeEntries?restaurantGuid=${restaurantGuid}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const r2 = await fetch(u2, { headers: headersHeaderOnly });
    const t2 = await r2.text();
    let p2; try { p2 = JSON.parse(t2); } catch { p2 = t2.slice(0,500); }
    if (Array.isArray(p2)) p2 = { count: p2.length, sample: p2.slice(0,1) };
    results['laborTimeEntries_withGuidParam'] = { status: r2.status, body: p2 };

    // Check what scopes the token actually has
    const u3 = `${apiBase}/authentication/v1/authentication/token`;
    const r3 = await fetch(u3, { headers: headersHeaderOnly });
    const t3 = await r3.text();
    let p3; try { p3 = JSON.parse(t3); } catch { p3 = t3.slice(0,500); }
    results['tokenInfo'] = { status: r3.status, body: p3 };

    // Try restaurants endpoint to verify access
    const u4 = `${apiBase}/restaurants/v1/groups`;
    const r4 = await fetch(u4, { headers: headersHeaderOnly });
    const t4 = await r4.text();
    let p4; try { p4 = JSON.parse(t4); } catch { p4 = t4.slice(0,500); }
    results['restaurantGroups'] = { status: r4.status, body: p4 };

    return Response.json({ token: 'obtained', restaurantGuid, authDataKeys: Object.keys(authData), tokenFragment: token.slice(0,40), results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
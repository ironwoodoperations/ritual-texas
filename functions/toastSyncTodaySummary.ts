import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clientId = Deno.env.get('TOAST_CLIENT_ID');
    const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
    const authUrl = Deno.env.get('TOAST_AUTH_URL');
    const apiBase = Deno.env.get('TOAST_API_BASE');
    const restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const basic = btoa(`${clientId}:${clientSecret}`);

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAccessType: 'TOAST_MACHINE_CLIENT', grantType: 'client_credentials' }),
    });

    if (!authRes.ok) {
      const txt = await authRes.text();
      return Response.json({ ok: false, error: `Toast auth failed: ${authRes.status} ${txt}` }, { status: 400 });
    }

    const authData = await authRes.json();
    const token = authData.access_token;

    const summaryRes = await fetch(
      `${apiBase}/analytics/v2/reports/sales?restaurantGuid=${restaurantGuid}&businessDate=${todayStr}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!summaryRes.ok) {
      const txt = await summaryRes.text();
      return Response.json({ ok: false, error: `Toast sales fetch failed: ${summaryRes.status} ${txt}` }, { status: 400 });
    }

    const salesData = await summaryRes.json();

    const netSales = salesData?.netSales ?? 0;
    const laborTotalCost = salesData?.laborTotalCost ?? 0;
    const laborHours = salesData?.laborHours ?? 0;
    const salesPerLaborHour = laborHours > 0 ? netSales / laborHours : 0;

    // Upsert: find existing row for today, update or create
    const existing = await base44.asServiceRole.entities.ToastDailySummary.filter({ businessDate: todayStr });

    if (existing?.length > 0) {
      await base44.asServiceRole.entities.ToastDailySummary.update(existing[0].id, {
        netSales, laborTotalCost, laborHours, salesPerLaborHour,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.ToastDailySummary.create({
        businessDate: todayStr, netSales, laborTotalCost, laborHours, salesPerLaborHour,
        updatedAt: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, netSales, laborTotalCost, laborHours, salesPerLaborHour });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
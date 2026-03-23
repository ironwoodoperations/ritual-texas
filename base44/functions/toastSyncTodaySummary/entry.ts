import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const clientId = Deno.env.get('TOAST_CLIENT_ID');
    const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
    const authUrl = Deno.env.get('TOAST_AUTH_URL');
    const apiBase = Deno.env.get('TOAST_API_BASE');
    const restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');

    let dateStr = body.date;
    if (!dateStr) {
      const today = new Date();
      dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }

    // Auth
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAccessType: 'TOAST_MACHINE_CLIENT', clientId, clientSecret }),
    });
    if (!authRes.ok) {
      const txt = await authRes.text();
      return Response.json({ ok: false, error: `Toast auth failed: ${authRes.status} ${txt}` }, { status: 400 });
    }

    const authData = await authRes.json();
    const token = authData?.token?.accessToken || authData?.access_token || authData?.accessToken;
    if (!token) {
      return Response.json({ ok: false, error: `No token in auth response: ${JSON.stringify(authData)}` }, { status: 400 });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': restaurantGuid,
    };

    // Use Central Time (UTC-6) for business day window
    const startDate = `${dateStr}T00:00:00.000-0600`;
    const endDate = `${dateStr}T23:59:59.999-0600`;

    // Fetch orders in bulk (paginated)
    let page = 1;
    let allOrders = [];
    while (true) {
      const ordersRes = await fetch(
        `${apiBase}/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=100&page=${page}`,
        { headers }
      );
      if (!ordersRes.ok) {
        const txt = await ordersRes.text();
        return Response.json({ ok: false, error: `Orders fetch failed (page ${page}): ${ordersRes.status} ${txt}` }, { status: 400 });
      }
      const data = await ordersRes.json();
      const orders = Array.isArray(data) ? data : (data.orders || []);
      allOrders = allOrders.concat(orders);
      if (orders.length < 100) break;
      page++;
    }

    // Calculate net sales from orders
    let netSales = 0;
    for (const order of allOrders) {
      // Skip voided orders
      if (order.voided) continue;
      const checks = order.checks || [];
      for (const check of checks) {
        if (check.voided) continue;
        netSales += check.totalAmount || 0;
      }
    }

    // Fetch labor time entries
    const laborRes = await fetch(
      `${apiBase}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { headers }
    );

    let laborTotalCost = 0;
    let laborHours = 0;
    if (laborRes.ok) {
      const laborData = await laborRes.json();
      const entries = Array.isArray(laborData) ? laborData : (laborData.timeEntries || []);
      for (const entry of entries) {
        if (entry.regularHours) laborHours += entry.regularHours;
        if (entry.overtimeHours) laborHours += entry.overtimeHours;
        if (entry.regularPay) laborTotalCost += entry.regularPay;
        if (entry.overtimePay) laborTotalCost += entry.overtimePay;
      }
    }

    const salesPerLaborHour = laborHours > 0 ? netSales / laborHours : 0;

    // Upsert
    const existing = await base44.asServiceRole.entities.ToastDailySummary.filter({ businessDate: dateStr });
    if (existing?.length > 0) {
      await base44.asServiceRole.entities.ToastDailySummary.update(existing[0].id, {
        netSales, laborTotalCost, laborHours, salesPerLaborHour,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await base44.asServiceRole.entities.ToastDailySummary.create({
        businessDate: dateStr, netSales, laborTotalCost, laborHours, salesPerLaborHour,
        updatedAt: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true, date: dateStr, netSales, laborTotalCost, laborHours, salesPerLaborHour, orderCount: allOrders.length });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
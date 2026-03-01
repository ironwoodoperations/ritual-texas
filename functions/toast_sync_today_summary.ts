import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function mustEnv(k) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret: ${k}`);
  return v;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function getToastToken() {
  const clientId = mustEnv("TOAST_CLIENT_ID");
  const clientSecret = mustEnv("TOAST_CLIENT_SECRET");
  const authUrl = mustEnv("TOAST_AUTH_URL");

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAccessType: "TOAST_MACHINE_CLIENT", clientId, clientSecret }),
  });

  if (!res.ok) throw new Error(`Toast auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const token = data?.token?.accessToken || data?.access_token || data?.accessToken;
  if (!token) throw new Error(`No token in auth response: ${JSON.stringify(Object.keys(data))}`);
  return token;
}

function safeNum(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json().catch(() => ({}));
    const API_BASE = mustEnv("TOAST_API_BASE").replace(/\/$/, "");
    const restaurantGuid = mustEnv("TOAST_RESTAURANT_GUID");
    const token = await getToastToken();

    const iso = body.date || todayISO();
    const yyyymmdd = Number(iso.replace(/-/g, ""));

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": restaurantGuid,
      "Content-Type": "application/json",
    };

    // ── Try Analytics v2 first ──────────────────────────────────────────────
    let netSales = 0;
    let grossSales = 0;
    let ordersCount = 0;
    let guestCount = 0;
    let laborTotalCost = 0;
    let laborTotalHours = 0;
    let rawMetrics = null;
    let rawLabor = null;
    let method = "unknown";

    // Attempt 1: ERA analytics async report
    const metricsPostRes = await fetch(`${API_BASE}/era/v1/metrics`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        startBusinessDate: yyyymmdd,
        endBusinessDate: yyyymmdd,
        restaurantIds: [restaurantGuid],
        excludedRestaurantIds: [],
        groupBy: [],
      }),
    });

    if (metricsPostRes.ok) {
      const metricsGuid = await metricsPostRes.json();

      // Poll up to 3 times with 2s delay
      let metricsData = null;
      for (let i = 0; i < 3; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 2000));
        const getRes = await fetch(`${API_BASE}/era/v1/metrics/${metricsGuid}`, { headers: authHeaders });
        if (getRes.status === 202) continue; // still processing
        if (getRes.ok) { metricsData = await getRes.json(); break; }
      }

      if (metricsData && metricsData._status !== "pending") {
        netSales = safeNum(metricsData?.netSalesAmount ?? metricsData?.netSales ?? 0);
        grossSales = safeNum(metricsData?.grossSalesAmount ?? metricsData?.grossSales ?? 0);
        ordersCount = safeNum(metricsData?.ordersCount ?? 0);
        guestCount = safeNum(metricsData?.guestCount ?? 0);
        rawMetrics = metricsData;
        method = "era_metrics";
      }
    }

    // Labor via ERA
    const laborPostRes = await fetch(`${API_BASE}/era/v1/labor/day`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        startBusinessDate: yyyymmdd,
        endBusinessDate: yyyymmdd,
        restaurantIds: [restaurantGuid],
        excludedRestaurantIds: [],
        groupBy: [],
      }),
    });

    if (laborPostRes.ok) {
      const laborGuid = await laborPostRes.json();
      let laborData = null;
      for (let i = 0; i < 3; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 2000));
        const getRes = await fetch(`${API_BASE}/era/v1/labor/${laborGuid}`, { headers: authHeaders });
        if (getRes.status === 202) continue;
        if (getRes.ok) { laborData = await getRes.json(); break; }
      }
      if (laborData && laborData._status !== "pending") {
        laborTotalHours = safeNum(laborData?.totalHours ?? 0);
        laborTotalCost = safeNum(laborData?.totalCost ?? laborData?.totalLaborCost ?? 0);
        rawLabor = laborData;
      }
    }

    // Attempt 2: Fallback — orders bulk if ERA gave nothing
    if (netSales === 0 && method === "unknown") {
      const startDate = `${iso}T00:00:00.000-0600`;
      const endDate = `${iso}T23:59:59.999-0600`;
      let page = 1;
      let allOrders = [];
      while (true) {
        const ordersRes = await fetch(
          `${API_BASE}/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=100&page=${page}`,
          { headers: authHeaders }
        );
        if (!ordersRes.ok) break;
        const data = await ordersRes.json();
        const orders = Array.isArray(data) ? data : (data.orders || []);
        allOrders = allOrders.concat(orders);
        if (orders.length < 100) break;
        page++;
      }
      for (const order of allOrders) {
        if (order.voided) continue;
        for (const check of (order.checks || [])) {
          if (check.voided) continue;
          netSales += safeNum(check.totalAmount);
        }
      }
      ordersCount = allOrders.length;
      method = "orders_bulk_fallback";
    }

    // Attempt 3: Fallback labor — time entries
    if (laborTotalCost === 0) {
      const startDate = `${iso}T00:00:00.000-0600`;
      const endDate = `${iso}T23:59:59.999-0600`;
      const laborRes = await fetch(
        `${API_BASE}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        { headers: authHeaders }
      );
      if (laborRes.ok) {
        const laborData = await laborRes.json();
        const entries = Array.isArray(laborData) ? laborData : (laborData.timeEntries || []);
        for (const entry of entries) {
          laborTotalHours += safeNum(entry.regularHours) + safeNum(entry.overtimeHours);
          laborTotalCost += safeNum(entry.regularPay) + safeNum(entry.overtimePay);
        }
        if (entries.length > 0) rawLabor = { entries: entries.length };
      }
    }

    const salesPerLaborHour = laborTotalHours > 0 ? Number((netSales / laborTotalHours).toFixed(2)) : 0;
    const pending = rawMetrics === null && method === "unknown";

    // Upsert
    const existing = await base44.asServiceRole.entities.ToastDailySummary.filter({ businessDate: iso });
    const payload = {
      businessDate: iso,
      netSales, grossSales, ordersCount, guestCount,
      laborTotalHours, laborTotalCost, salesPerLaborHour,
      updatedAt: new Date().toISOString(),
    };
    if (existing?.[0]?.id) {
      await base44.asServiceRole.entities.ToastDailySummary.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.ToastDailySummary.create(payload);
    }

    return Response.json({ ok: true, businessDate: iso, netSales, laborTotalCost, salesPerLaborHour, ordersCount, method, pending });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
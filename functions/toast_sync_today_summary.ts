import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function mustEnv(k) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret: ${k}`);
  return v;
}

function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, yyyymmdd: Number(`${yyyy}${mm}${dd}`) };
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
  if (!token) throw new Error(`No token in auth response`);
  return token;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json().catch(() => ({}));
    const API_BASE = mustEnv("TOAST_API_BASE").replace(/\/$/, "");
    const restaurantGuid = mustEnv("TOAST_RESTAURANT_GUID");
    const token = await getToastToken();

    let { iso, yyyymmdd } = todayYYYYMMDD();
    if (body.date) {
      iso = body.date;
      yyyymmdd = Number(iso.replace(/-/g, ""));
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Toast-Restaurant-External-ID": restaurantGuid,
    };

    // POST metrics
    const metricsPostRes = await fetch(`${API_BASE}/era/v1/metrics`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startBusinessDate: yyyymmdd,
        endBusinessDate: yyyymmdd,
        restaurantIds: [restaurantGuid],
        excludedRestaurantIds: [],
        groupBy: [],
      }),
    });

    if (!metricsPostRes.ok) {
      const txt = await metricsPostRes.text();
      throw new Error(`Metrics POST failed: ${metricsPostRes.status} ${txt}`);
    }

    const metricsGuid = await metricsPostRes.json();

    // POST labor
    const laborPostRes = await fetch(`${API_BASE}/era/v1/labor/day`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startBusinessDate: yyyymmdd,
        endBusinessDate: yyyymmdd,
        restaurantIds: [restaurantGuid],
        excludedRestaurantIds: [],
        groupBy: [],
      }),
    });

    if (!laborPostRes.ok) {
      const txt = await laborPostRes.text();
      throw new Error(`Labor POST failed: ${laborPostRes.status} ${txt}`);
    }

    const laborGuid = await laborPostRes.json();

    // GET metrics result
    const metricsGetRes = await fetch(`${API_BASE}/era/v1/metrics/${metricsGuid}`, { headers: { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": restaurantGuid } });
    const metricsData = metricsGetRes.status === 202 ? { _status: "pending" } : await metricsGetRes.json();

    // GET labor result
    const laborGetRes = await fetch(`${API_BASE}/era/v1/labor/${laborGuid}`, { headers: { Authorization: `Bearer ${token}`, "Toast-Restaurant-External-ID": restaurantGuid } });
    const laborData = laborGetRes.status === 202 ? { _status: "pending" } : await laborGetRes.json();

    const pending = metricsData?._status === "pending" || laborData?._status === "pending";

    const netSales = pending ? null : Number(metricsData?.netSalesAmount ?? 0);
    const grossSales = pending ? null : Number(metricsData?.grossSalesAmount ?? 0);
    const ordersCount = pending ? null : Number(metricsData?.ordersCount ?? 0);
    const guestCount = pending ? null : Number(metricsData?.guestCount ?? 0);
    const laborTotalHours = pending ? null : Number(laborData?.totalHours ?? 0);
    const laborTotalCost = pending ? null : Number(laborData?.totalCost ?? 0);
    const salesPerLaborHour = netSales != null && laborTotalHours && laborTotalHours > 0
      ? Number((netSales / laborTotalHours).toFixed(2)) : null;

    const existing = await base44.asServiceRole.entities.ToastDailySummary.filter({ businessDate: iso });
    const payload = { businessDate: iso, netSales, grossSales, ordersCount, guestCount, laborTotalHours, laborTotalCost, salesPerLaborHour, updatedAt: new Date().toISOString() };

    if (existing?.[0]?.id) {
      await base44.asServiceRole.entities.ToastDailySummary.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.ToastDailySummary.create(payload);
    }

    return Response.json({ ok: true, businessDate: iso, pending, netSales, laborTotalCost, salesPerLaborHour });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
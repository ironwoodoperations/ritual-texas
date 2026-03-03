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
    // Toast date format for cash management / reports API: YYYYMMDD integer
    const yyyymmdd = iso.replace(/-/g, "");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Toast-Restaurant-External-ID": restaurantGuid,
      "Content-Type": "application/json",
    };

    let netSales = 0;
    let laborTotalCost = 0;
    let laborTotalHours = 0;
    let method = "none";
    let debugInfo = {};

    // ── Attempt 1: Restaurant Cashflow / Sales Summary endpoint ──────────────
    const cashflowRes = await fetch(
      `${API_BASE}/cashmgmt/v1/shifts?businessDate=${yyyymmdd}`,
      { headers: authHeaders }
    );
    debugInfo.cashflowStatus = cashflowRes.status;

    if (cashflowRes.ok) {
      const shifts = await cashflowRes.json();
      debugInfo.shiftsCount = Array.isArray(shifts) ? shifts.length : 'not array';
      // each shift has netSales
      if (Array.isArray(shifts)) {
        for (const shift of shifts) {
          netSales += safeNum(shift.netSales ?? shift.netAmount ?? 0);
        }
        method = "cashflow_shifts";
      }
    }

    // ── Attempt 2: Orders v2 ordersBulk — sum netAmount from checks ──────────
    if (netSales === 0) {
      // Use CST offset (UTC-6) since restaurant is in Texas
      const startDate = `${iso}T00:00:00.000-06:00`;
      const endDate = `${iso}T23:59:59.999-06:00`;
      let page = 1;
      let allOrders = [];

      while (true) {
        const ordersRes = await fetch(
          `${API_BASE}/orders/v2/ordersBulk?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&pageSize=100&page=${page}`,
          { headers: authHeaders }
        );
        debugInfo.ordersBulkStatus = ordersRes.status;
        if (!ordersRes.ok) break;
        const data = await ordersRes.json();
        const orders = Array.isArray(data) ? data : (data.orders || []);
        allOrders = allOrders.concat(orders);
        if (orders.length < 100) break;
        page++;
      }

      debugInfo.ordersCount = allOrders.length;

      for (const order of allOrders) {
        if (order.voided || order.deleted) continue;
        for (const check of (order.checks || [])) {
          if (check.voided || check.deleted) continue;
          // netAmount = totalAmount minus tax. We want net sales = totalAmount - tax
          // But for sales reporting, use: totalAmount (which IS the net sales in Toast's definition)
          // Toast "net sales" = gross - discounts (before tax)
          // check.netAmount exists in some API versions
          const amount = safeNum(check.netAmount ?? check.totalAmount ?? 0);
          netSales += amount;
        }
      }

      if (allOrders.length > 0) method = "orders_bulk";
    }

    // ── Attempt 3: Try the reporting/v1 daily summary if still 0 ─────────────
    if (netSales === 0) {
      const summaryRes = await fetch(
        `${API_BASE}/reporting/v1/cashDrawer?businessDate=${yyyymmdd}`,
        { headers: authHeaders }
      );
      debugInfo.summaryStatus = summaryRes.status;
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        debugInfo.summaryKeys = Object.keys(summary);
        netSales = safeNum(summary.netSales ?? summary.netSalesAmount ?? 0);
        if (netSales > 0) method = "reporting_cashDrawer";
      }
    }

    // ── Labor: time entries ───────────────────────────────────────────────────
    const startDate = `${iso}T00:00:00.000-06:00`;
    const endDate = `${iso}T23:59:59.999-06:00`;
    const laborRes = await fetch(
      `${API_BASE}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { headers: authHeaders }
    );
    debugInfo.laborStatus = laborRes.status;

    if (laborRes.ok) {
      const laborData = await laborRes.json();
      const entries = Array.isArray(laborData) ? laborData : (laborData.timeEntries || []);
      debugInfo.laborEntries = entries.length;
      for (const entry of entries) {
        const inTime = entry.inDate ? new Date(entry.inDate) : null;
        const outTime = entry.outDate ? new Date(entry.outDate) : null;
        if (inTime && outTime) {
          const hrs = (outTime - inTime) / 3600000;
          laborTotalHours += hrs;
        } else {
          laborTotalHours += safeNum(entry.regularHours) + safeNum(entry.overtimeHours);
        }
        laborTotalCost += safeNum(entry.regularPay ?? entry.hourlyWage) + safeNum(entry.overtimePay ?? 0);
      }
    }

    const salesPerLaborHour = laborTotalHours > 0 ? Number((netSales / laborTotalHours).toFixed(2)) : 0;

    // Upsert
    const existing = await base44.asServiceRole.entities.ToastDailySummary.filter({ businessDate: iso });
    const payload = {
      businessDate: iso,
      netSales,
      laborTotalCost,
      laborHours: laborTotalHours,
      salesPerLaborHour,
      updatedAt: new Date().toISOString(),
    };
    if (existing?.[0]?.id) {
      await base44.asServiceRole.entities.ToastDailySummary.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.ToastDailySummary.create(payload);
    }

    return Response.json({ ok: true, businessDate: iso, netSales, laborTotalCost, laborHours: laborTotalHours, salesPerLaborHour, method, debug: debugInfo });
  } catch (e) {
    return Response.json({ ok: false, error: e.message, stack: e.stack }, { status: 500 });
  }
});
import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return await resp.json();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    const tests = {};
    tests["credentials"] = { company, adminLogin: !!adminLogin, adminPassword: !!adminPassword, apiKey: !!apiKey };

    // Try the ADMIN API - different URL https://user-api.simplybook.me/admin
    // Admin API uses: getToken(company, user, password) on the LOGIN endpoint
    // Try with credentials as login, password
    const r1 = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, adminLogin, adminPassword]);
    tests["adminLogin_3args"] = r1?.result ? "GOT TOKEN: " + String(r1.result).substring(0, 20) : r1?.error;

    // Try lowercase 'admin' as user
    const r2 = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, "admin", adminPassword]);
    tests["adminLogin_adminuser"] = r2?.result ? "GOT TOKEN" : r2?.error;

    // Sometimes admin login uses the secret key as password
    const secretKey = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";
    const r3 = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, adminLogin, secretKey]);
    tests["adminLogin_secretAsPass"] = r3?.result ? "GOT TOKEN" : r3?.error;

    // Try the REST v2 admin API for creating bookings
    // POST https://user-api.simplybook.me/admin/booking
    const userTokenResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const userToken = userTokenResp?.result;
    if (userToken) {
      const services = (await sbRPC("https://user-api.simplybook.me", "getEventList", [], { "X-Company-Login": company, "X-Token": userToken }))?.result || {};
      const units = (await sbRPC("https://user-api.simplybook.me", "getUnitList", [], { "X-Company-Login": company, "X-Token": userToken }))?.result || {};
      const svcId = Object.keys(services)[0];
      const unitId = Object.keys(units)[0];
      tests["svcId"] = svcId;
      tests["unitId"] = unitId;

      // Try REST API for booking
      const restResp = await fetch(`https://user-api.simplybook.me/admin/booking`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Company-Login": company,
          "X-Token": userToken,
        },
        body: JSON.stringify({
          event_id: svcId,
          unit_id: unitId,
          start_date: "2026-03-10",
          start_time: "10:00:00",
          client: { name: "Test Guest", email: "test@example.com" }
        }),
      });
      tests["restAdmin_booking_status"] = restResp.status;
      const restBody = await restResp.text();
      tests["restAdmin_booking_body"] = restBody.substring(0, 300);
    }

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
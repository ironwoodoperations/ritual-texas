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

    // Admin login should use https://user-api.simplybook.me/admin/login
    // NOT the /login endpoint
    const r1 = await sbRPC("https://user-api.simplybook.me/admin/login", "getToken", [company, adminLogin, adminPassword]);
    tests["adminLogin_adminendpoint"] = r1?.result ? "GOT TOKEN: " + String(r1.result).substring(0, 20) : r1?.error;

    const adminToken = r1?.result;
    if (adminToken) {
      const adminHeaders = { "X-Company-Login": company, "X-Token": adminToken };
      
      // Test createClient on admin URL
      const r2 = await sbRPC("https://user-api.simplybook.me/admin", "getClientList", [null, null, 0, 3], adminHeaders);
      tests["admin_getClientList"] = r2?.error ? r2.error : "OK: " + JSON.stringify(r2?.result || {}).substring(0, 200);

      // Test createClient
      const r3 = await sbRPC("https://user-api.simplybook.me/admin", "createClient", [{ name: "Test", email: "test@example.com" }], adminHeaders);
      tests["admin_createClient"] = r3?.error ? r3.error : "OK: clientId=" + (r3?.result?.id || r3?.result);

      // Get services and units
      const userTokenResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
      const userToken = userTokenResp?.result;
      if (userToken) {
        const sHeaders = { "X-Company-Login": company, "X-Token": userToken };
        const services = (await sbRPC("https://user-api.simplybook.me", "getEventList", [], sHeaders))?.result || {};
        const units = (await sbRPC("https://user-api.simplybook.me", "getUnitList", [], sHeaders))?.result || {};
        const svcId = Object.keys(services)[0];
        const unitId = Object.keys(units)[0];

        // Try book on admin endpoint
        const r4 = await sbRPC("https://user-api.simplybook.me/admin", "book", [
          svcId, unitId, "2026-03-10 10:00:00", null,
          { name: "Test Guest", email: "test@example.com" }
        ], adminHeaders);
        tests["admin_book"] = r4?.error ? r4.error : "BOOKED: " + JSON.stringify(r4?.result || {});
      }
    }

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
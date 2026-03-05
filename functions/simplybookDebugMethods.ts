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

    // Try admin API login with correct URL
    const adminLoginResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, adminLogin, adminPassword]);
    const tests = {};
    tests["adminLogin_userapi"] = adminLoginResp?.result ? "GOT TOKEN: " + String(adminLoginResp.result).substring(0, 20) : adminLoginResp?.error;

    // Try 3-arg login on login endpoint
    // The admin API requires SIMPLYBOOK_SECRET_KEY often
    const secretKey = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";
    const r2 = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, adminLogin, adminPassword, secretKey]);
    tests["adminLogin_withSecret"] = r2?.result ? "GOT TOKEN: " + String(r2.result).substring(0, 20) : r2?.error;

    // Regular user API token
    const userLoginResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const token = userLoginResp?.result;
    tests["userToken"] = token ? "GOT TOKEN" : userLoginResp?.error;

    if (token) {
      const sbHeaders = { "X-Company-Login": company, "X-Token": token };
      // Discover what methods exist - try getServiceList (alias)
      const r3 = await sbRPC("https://user-api.simplybook.me", "getServiceList", [], sbHeaders);
      tests["getServiceList"] = r3?.error ? r3.error : "OK: " + JSON.stringify(r3?.result || r3).substring(0, 100);

      // Try making a booking with 'book' (we know this returns -32068 = needs client auth, not -32601 = not found)
      // So 'book' IS a valid method. The issue is client auth. Let's try bookByAdmin
      const r4 = await sbRPC("https://user-api.simplybook.me", "bookByAdmin", ["1", "1", "2026-03-10 10:00:00", null, { name: "Test", email: "t@t.com" }], sbHeaders);
      tests["bookByAdmin"] = r4?.error ? r4.error : r4?.result;

      // Check if there's a client plugin
      const r5 = await sbRPC("https://user-api.simplybook.me", "isPluginActivated", ["client_login"], sbHeaders);
      tests["plugin_client_login"] = r5?.error ? r5.error : r5?.result;

      const r6 = await sbRPC("https://user-api.simplybook.me", "getBookingRegistrationInfo", [null, null, null, null, { name: "Test", email: "t@t.com" }], sbHeaders);
      tests["getBookingRegistrationInfo"] = r6?.error ? r6.error : "OK: " + JSON.stringify(r6?.result || r6).substring(0, 200);
    }

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
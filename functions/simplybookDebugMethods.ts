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

    // Admin API token (different from user API)
    const loginResp = await sbRPC("https://user-api.simplybook.me/admin/login", "getToken", [company, adminLogin, adminPassword]);
    const token = loginResp?.result;
    if (!token) return Response.json({ error: "No admin token", loginResp });

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };
    const adminUrl = "https://user-api.simplybook.me/admin";

    const tests = {};

    // Test client methods on admin API
    const r1 = await sbRPC(adminUrl, "getClientList", [null, null, 0, 1], sbHeaders);
    tests["getClientList"] = r1?.result ? "OK: " + JSON.stringify(r1.result).substring(0, 200) : r1?.error;

    // Test createClient
    const r2 = await sbRPC(adminUrl, "createClient", [{ name: "Test Debug", email: "debugtest@example.com" }], sbHeaders);
    tests["createClient"] = r2?.result ? "OK: " + JSON.stringify(r2.result).substring(0, 200) : r2?.error;

    // Test book on admin
    const r3 = await sbRPC(adminUrl, "book", ["1", "1", "2026-03-10 10:00:00", "1", {}], sbHeaders);
    tests["book_admin"] = r3?.result ? "OK" : r3?.error;

    return Response.json({ adminToken: token.substring(0, 10) + "...", tests });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
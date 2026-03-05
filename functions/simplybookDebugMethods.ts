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

    const tokenResp = await sbRPC("https://user-api.simplybook.me/login", "getUserToken", [company, adminLogin, adminPassword]);
    const adminToken = tokenResp?.result;
    if (!adminToken) return Response.json({ error: "No admin token", tokenResp });

    const adminHeaders = { "X-Company-Login": company, "X-User-Token": adminToken };
    const adminUrl = "https://user-api.simplybook.me/admin/";
    const tests = {};

    // client ID 2 exists. Try book with different client ID formats
    // book(event_id, unit_id, start_datetime, client_id)
    // Try numeric vs string
    const r1 = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", 2], adminHeaders);
    tests["book_clientInt"] = r1?.error ? r1.error : "OK: " + JSON.stringify(r1?.result || r1).substring(0, 300);

    const r2 = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", "2"], adminHeaders);
    tests["book_clientString"] = r2?.error ? r2.error : "OK: " + JSON.stringify(r2?.result || r2).substring(0, 300);

    // Try with client_id = 1 (real client SCOTT DEVORE)
    const r3 = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", "1"], adminHeaders);
    tests["book_client1"] = r3?.error ? r3.error : "OK: " + JSON.stringify(r3?.result || r3).substring(0, 300);

    // Try addBook instead
    const r4 = await sbRPC(adminUrl, "addBook", ["2", "2", "2026-03-15 10:00:00", "1"], adminHeaders);
    tests["addBook"] = r4?.error ? r4.error : "OK: " + JSON.stringify(r4?.result || r4).substring(0, 300);

    // book with extra params
    const r5 = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", 1, {}], adminHeaders);
    tests["book_withEmptyExtra"] = r5?.error ? r5.error : "OK: " + JSON.stringify(r5?.result || r5).substring(0, 300);

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
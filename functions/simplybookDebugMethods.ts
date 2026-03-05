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

    // Try getClientList with various param formats
    const r1 = await sbRPC(adminUrl, "getClientList", [], adminHeaders);
    tests["getClientList_noargs_raw"] = r1?.error ? r1.error : "OK: " + JSON.stringify(r1?.result || r1).substring(0, 300);

    const r2 = await sbRPC(adminUrl, "getClientList", [null, null, 0, 5], adminHeaders);
    tests["getClientList_paged_raw"] = r2?.error ? r2.error : "OK: " + JSON.stringify(r2?.result || r2).substring(0, 300);

    const r3 = await sbRPC(adminUrl, "getClientList", [{ search_string: "test@example.com" }, null, 0, 5], adminHeaders);
    tests["getClientList_emailSearch_raw"] = r3?.error ? r3.error : "OK: " + JSON.stringify(r3?.result || r3).substring(0, 300);

    // Try getClient (singular) with email
    const r4 = await sbRPC(adminUrl, "getClient", [null, "test@example.com"], adminHeaders);
    tests["getClient_byEmail"] = r4?.error ? r4.error : "OK: " + JSON.stringify(r4?.result || r4).substring(0, 300);

    // Try addClient and capture the full error response
    const r5 = await sbRPC(adminUrl, "addClient", [{ name: "Test Guest", email: "test@example.com", phone: "5550000000" }], adminHeaders);
    tests["addClient_full"] = r5?.error ? r5.error : "OK: " + JSON.stringify(r5?.result || r5).substring(0, 300);

    // The addClient error data field should contain the existing client ID
    if (r5?.error?.data) {
      tests["addClient_error_data"] = r5.error.data;
    }

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
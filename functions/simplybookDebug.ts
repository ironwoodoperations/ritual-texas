import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    // Admin token
    const adminTokenResp = await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
    });
    const adminTokenJson = await adminTokenResp.json();
    const adminToken = adminTokenJson?.result;

    const adminHeaders = { "Content-Type": "application/json", "X-Company-Login": company, "X-User-Token": adminToken };

    // Try different booking method names on the admin endpoint
    const methodsToTry = ["book", "addBooking", "createBooking", "makeBooking", "bookAppointment"];
    const results = {};

    for (const method of methodsToTry) {
      const r = await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method,
          params: ["2", "2", "2026-03-10 10:00:00", "1", null],
        }),
      });
      const j = await r.json();
      results[method] = j?.error ? `Error ${j.error.code}: ${j.error.message}` : JSON.stringify(j?.result);
    }

    return Response.json({ adminToken: !!adminToken, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
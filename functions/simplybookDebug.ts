import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    const adminToken = (await (await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
    })).json())?.result;

    const adminHeaders = { "Content-Type": "application/json", "X-Company-Login": company, "X-User-Token": adminToken };

    // Try ALL potential admin booking methods
    const methodsToProbe = [
      ["book", ["2", "2", "2026-03-10 10:00:00", "1"]],
      ["book", [2, 2, "2026-03-10 10:00:00", 1]],
      ["addBooking", ["2", "2", "2026-03-10 10:00:00", "1"]],
      ["createAppointment", ["2", "2", "2026-03-10 10:00:00", "1"]],
    ];

    const results = {};
    for (const [method, params] of methodsToProbe) {
      const key = `${method}(${JSON.stringify(params)})`;
      const r = await (await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      })).json();
      results[key] = r?.error ? `Error ${r.error.code}: ${r.error.message}` : JSON.stringify(r?.result).slice(0, 200);
    }

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
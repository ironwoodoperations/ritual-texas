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

    // Get client login token for client id "1"
    const clientToken = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getClientToken", params: ["1"] }),
    })).json();

    // Try getOrCreateClient
    const getOrCreate = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getOrCreateClient", params: [{ name: "SCOTT DEVORE", email: "csdevore@outlook.com" }] }),
    })).json();

    // Try booking with client login token
    let bookWithToken = null;
    if (clientToken?.result) {
      bookWithToken = await (await fetch("https://user-api.simplybook.me", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-Login": company, "X-Token": clientToken.result },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "book", params: ["2", "2", "2026-03-10 10:00:00", null, { name: "SCOTT DEVORE", email: "csdevore@outlook.com" }] }),
      })).json();
    }

    return Response.json({ clientToken, getOrCreate, bookWithToken });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
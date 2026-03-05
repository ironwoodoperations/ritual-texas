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

    // Get all clients to see real IDs
    const clientList = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getClientList", params: [null, null, null, 1, 10] }),
    })).json();

    // Try getClientById
    const getClient = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getClientById", params: ["3"] }),
    })).json();

    // Try book with client_id from getClientList
    const clients = clientList?.result || [];
    const firstClientId = Array.isArray(clients) && clients[0]?.id;

    let bookResult = null;
    if (firstClientId) {
      bookResult = await (await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "book", params: ["2", "2", "2026-03-10 10:00:00", String(firstClientId), null] }),
      })).json();
    }

    return Response.json({ clientList: clientList?.result, getClient, firstClientId, bookResult });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
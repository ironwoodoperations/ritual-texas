import { createClientFromRequest } from "npm:@base44/sdk@0.8.20";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";

    const adminTokenResp = await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
    });
    const adminToken = (await adminTokenResp.json())?.result;
    const adminHeaders = { "Content-Type": "application/json", "X-Company-Login": company, "X-User-Token": adminToken };

    // Try to get client list to find a real client ID
    const clResp = await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getClientList", params: [null, null, null, 1, 5] }),
    });
    const clJson = await clResp.json();

    // Try addClient with minimal data
    const addResp = await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "addClient", params: [{ name: "Debug Test Client", phone: "9035551234" }] }),
    });
    const addJson = await addResp.json();

    return Response.json({ adminToken: !!adminToken, clientList: clJson, addClient: addJson });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
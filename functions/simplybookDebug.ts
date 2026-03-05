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

    // 1. User token
    const userTokenResp = await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getToken", params: [company, apiKey] }),
    });
    const userTokenJson = await userTokenResp.json();
    const userToken = userTokenJson?.result;

    // 2. Admin token
    const adminTokenResp = await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
    });
    const adminTokenJson = await adminTokenResp.json();
    const adminToken = adminTokenJson?.result;

    // 3. Get event list with user token
    const eventsResp = await fetch("https://user-api.simplybook.me", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Company-Login": company, "X-Token": userToken },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEventList", params: [] }),
    });
    const eventsJson = await eventsResp.json();

    // 4. Try getClientList via admin
    let clientListResult = null;
    if (adminToken) {
      const clResp = await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Company-Login": company, "X-User-Token": adminToken },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getClientList", params: [] }),
      });
      clientListResult = await clResp.json();
    }

    return Response.json({
      userToken: userToken ? "OK" : userTokenJson?.error,
      adminToken: adminToken ? "OK" : adminTokenJson?.error,
      services: eventsJson,
      clientList: clientListResult,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
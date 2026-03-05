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

    // User token (public API)
    const userToken = (await (await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getToken", params: [company, apiKey] }),
    })).json())?.result;

    // Admin token
    const adminToken = (await (await fetch("https://user-api.simplybook.me/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getUserToken", params: [company, adminLogin, adminPassword] }),
    })).json())?.result;

    const adminHeaders = { "Content-Type": "application/json", "X-Company-Login": company, "X-User-Token": adminToken };
    const userHeaders = { "Content-Type": "application/json", "X-Company-Login": company, "X-Token": userToken };

    // Try addClient with email on admin
    const addWithEmailResp = await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "addClient", params: [{ name: "Hotel RITUAL Guest", email: "guest@hotelritual.com", phone: "9035550000" }] }),
    });
    const addWithEmail = await addWithEmailResp.json();

    // Try book using user token (public booking)
    const userBookResp = await fetch("https://user-api.simplybook.me", {
      method: "POST",
      headers: userHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "book",
        params: ["2", "2", "2026-03-10 10:00:00", null, { name: "Test Admin Book", email: "test@hotelritual.com", phone: "9035550001" }],
      }),
    });
    const userBook = await userBookResp.json();

    return Response.json({ addWithEmail, userBook });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
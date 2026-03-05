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

    // Create a fresh client and capture the full response
    const addClient = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "addClient", params: [{ name: "Debug Book Test", email: "debugbook@hotelritual.com", phone: "9035550099" }] }),
    })).json();

    const newClientId = addClient?.result;
    
    // Immediately try to book with that ID
    let bookResult = null;
    if (newClientId) {
      bookResult = await (await fetch("https://user-api.simplybook.me/admin/", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "book", params: [2, 2, "2026-03-10 10:00:00", parseInt(newClientId)] }),
      })).json();
    }

    // Also try getBookingList to see what methods exist 
    const bookingList = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "getBookingList", params: [null, null, null, 1, 3] }),
    })).json();

    return Response.json({ addClient, newClientId, bookResult, bookingList: bookingList?.result || bookingList?.error });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
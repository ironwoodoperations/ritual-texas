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

    // Try book with clientData object instead of client_id
    const book1 = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "book",
        params: ["2", "2", "2026-03-10 10:00:00", null, { name: "SCOTT DEVORE", email: "csdevore@outlook.com", phone: "+14095048185" }],
      }),
    })).json();

    // Try book with SCOTT's id "1" but pass clientData too
    const book2 = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2, method: "book",
        params: ["2", "2", "2026-03-10 10:00:00", "1", { name: "SCOTT DEVORE", email: "csdevore@outlook.com", phone: "+14095048185" }],
      }),
    })).json();

    // Try bookByToken – maybe admin needs a client token
    const book3 = await (await fetch("https://user-api.simplybook.me/admin/", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 3, method: "bookByAdmin",
        params: ["2", "2", "2026-03-10 10:00:00", "1", null],
      }),
    })).json();

    return Response.json({ book_no_client_id: book1, book_with_clientdata: book2, bookByAdmin: book3 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
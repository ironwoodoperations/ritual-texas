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

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";

    // Step 1: get token
    const loginResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const token = loginResp?.result;
    if (!token) return Response.json({ error: "No token", loginResp });

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };

    // Test various client-related method names
    const tests = {};

    // Try getClientByEmail
    const r1 = await sbRPC("https://user-api.simplybook.me", "getClientByEmail", ["test@example.com"], sbHeaders);
    tests["getClientByEmail"] = r1;

    // Try findClient
    const r2 = await sbRPC("https://user-api.simplybook.me", "findClient", [{ email: "test@example.com" }], sbHeaders);
    tests["findClient"] = r2;

    // Try getClientList with no args
    const r3 = await sbRPC("https://user-api.simplybook.me", "getClientList", [], sbHeaders);
    tests["getClientList_noargs"] = r3;

    // Try book method names
    const r4 = await sbRPC("https://user-api.simplybook.me", "addBooking", ["1", "1", "2026-03-10 10:00:00", "1", {}], sbHeaders);
    tests["addBooking"] = r4?.error || r4?.result;

    const r5 = await sbRPC("https://user-api.simplybook.me", "book", ["1", "1", "2026-03-10 10:00:00", "1", {}], sbHeaders);
    tests["book"] = r5?.error || r5?.result;

    const r6 = await sbRPC("https://user-api.simplybook.me", "createBooking", ["1", "1", "2026-03-10 10:00:00", "1", {}], sbHeaders);
    tests["createBooking"] = r6?.error || r6?.result;

    // Try createClient 
    const r7 = await sbRPC("https://user-api.simplybook.me", "createClient", [{ name: "Test", email: "test@example.com" }], sbHeaders);
    tests["createClient"] = r7?.error || r7?.result;

    return Response.json({ token: token.substring(0, 10) + "...", tests });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
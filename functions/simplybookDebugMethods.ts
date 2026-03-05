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

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    const userLoginResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const token = userLoginResp?.result;
    if (!token) return Response.json({ error: "No token", userLoginResp });

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };
    const tests = {};

    // Test known-working methods
    const r1 = await sbRPC("https://user-api.simplybook.me", "getEventList", [], sbHeaders);
    tests["getEventList"] = r1?.error ? r1.error : "OK len=" + Object.keys(r1?.result || {}).length;

    const r2 = await sbRPC("https://user-api.simplybook.me", "getUnitList", [], sbHeaders);
    tests["getUnitList"] = r2?.error ? r2.error : "OK len=" + Object.keys(r2?.result || {}).length;

    // Get first real service/unit IDs
    const services = r1?.result || {};
    const units = r2?.result || {};
    const svcId = Object.keys(services)[0];
    const unitId = Object.keys(units)[0];

    tests["svcId"] = svcId;
    tests["unitId"] = unitId;

    // book with no client id (pass null) — the 'book' method with proper args
    // SimplyBook book() signature: book(event_id, unit_id, start_date_time, client_id, client_data)
    // When client_login plugin active, client_id can be null and client_data used instead
    const r3 = await sbRPC("https://user-api.simplybook.me", "book", [
      svcId, unitId, "2026-03-10 10:00:00", null, 
      { name: "Test Guest", email: "test@example.com", phone: "5550000" }
    ], sbHeaders);
    tests["book_null_client"] = r3?.error ? r3.error : r3?.result;

    // Try passing 0 as client_id
    const r4 = await sbRPC("https://user-api.simplybook.me", "book", [
      svcId, unitId, "2026-03-10 10:00:00", 0,
      { name: "Test Guest", email: "test@example.com", phone: "5550000" }
    ], sbHeaders);
    tests["book_zero_client"] = r4?.error ? r4.error : r4?.result;

    // Try with additional "count" param
    const r5 = await sbRPC("https://user-api.simplybook.me", "book", [
      svcId, unitId, "2026-03-10 10:00:00", null, 
      { name: "Test Guest", email: "test@example.com" }, 1
    ], sbHeaders);
    tests["book_with_count"] = r5?.error ? r5.error : r5?.result;

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
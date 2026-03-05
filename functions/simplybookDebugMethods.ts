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
    const secretKey = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";

    const tests = {};
    tests["secretKey_set"] = !!secretKey;

    // Get user token
    const userLoginResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const token = userLoginResp?.result;
    if (!token) return Response.json({ error: "No user token", userLoginResp });
    tests["userToken"] = "OK";

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };

    const services = await sbRPC("https://user-api.simplybook.me", "getEventList", [], sbHeaders);
    const units = await sbRPC("https://user-api.simplybook.me", "getUnitList", [], sbHeaders);
    const svcId = Object.keys(services?.result || {})[0];
    const unitId = Object.keys(units?.result || {})[0];

    // Try using the secret key to get a client token (for booking)
    // SimplyBook allows booking by creating a client token using HMAC or by getClientToken
    const r1 = await sbRPC("https://user-api.simplybook.me", "getClientToken", ["test@example.com", secretKey], sbHeaders);
    tests["getClientToken"] = r1?.error ? r1.error : r1?.result;

    // Try with client login using email + HMAC
    if (secretKey) {
      // Some SimplyBook setups use: loginClient(email, hmac_hash)
      // hmac = HMAC-SHA1(secretKey, email)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);
      const msgData = encoder.encode("test@example.com");
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const hmac = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

      const r2 = await sbRPC("https://user-api.simplybook.me", "loginClient", ["test@example.com", hmac], sbHeaders);
      tests["loginClient_hmac"] = r2?.error ? r2.error : r2?.result;

      // If client token obtained, try booking with it
      const clientToken = r2?.result;
      if (clientToken) {
        const sbHeadersWithClient = { ...sbHeaders, "X-Client-Token": clientToken };
        const r3 = await sbRPC("https://user-api.simplybook.me", "book", [
          svcId, unitId, "2026-03-10 10:00:00", null,
          { name: "Test Guest", email: "test@example.com" }
        ], sbHeadersWithClient);
        tests["book_with_client_token"] = r3?.error ? r3.error : r3?.result;
      }
    }

    // Try bookingWithoutLogin (for accounts that allow it)
    const r4 = await sbRPC("https://user-api.simplybook.me", "bookingWithoutLogin", [
      svcId, unitId, "2026-03-10 10:00:00",
      { name: "Test Guest", email: "test@example.com" }
    ], sbHeaders);
    tests["bookingWithoutLogin"] = r4?.error ? r4.error : r4?.result;

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
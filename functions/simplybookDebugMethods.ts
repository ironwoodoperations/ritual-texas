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
    const adminLogin = Deno.env.get("SIMPLYBOOK_ADMIN_LOGIN") || "";
    const adminPassword = Deno.env.get("SIMPLYBOOK_ADMIN_PASSWORD") || "";
    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";

    const adminTokenResp = await sbRPC("https://user-api.simplybook.me/login", "getUserToken", [company, adminLogin, adminPassword]);
    const adminToken = adminTokenResp?.result;

    const userTokenResp = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    const userToken = userTokenResp?.result;

    const adminUrl = "https://user-api.simplybook.me/admin/";
    const userUrl = "https://user-api.simplybook.me";
    
    const tests = {};
    tests["adminToken"] = adminToken ? adminToken.substring(0, 15) + "..." : "FAILED";
    tests["userToken"] = userToken ? userToken.substring(0, 15) + "..." : "FAILED";

    // Try getClient by ID to see if client ID 1 is valid via admin
    const adminHeaders = { "X-Company-Login": company, "X-User-Token": adminToken };
    const r1 = await sbRPC(adminUrl, "getClient", ["1"], adminHeaders);
    tests["getClient_1_admin"] = r1?.error ? r1.error : "OK: " + JSON.stringify(r1?.result || r1).substring(0, 200);

    // Try getClientList (returns array with id, name, email) - get raw result
    const clientListRaw = await sbRPC(adminUrl, "getClientList", [], adminHeaders);
    const clients = Array.isArray(clientListRaw?.result) ? clientListRaw.result : 
                    Array.isArray(clientListRaw) ? clientListRaw : 
                    Object.values(clientListRaw?.result || clientListRaw || {});
    tests["clients"] = clients.slice(0, 3).map(c => ({ id: c.id, name: c.name, email: c.email }));

    // The "Client with given id not found" means the book method uses a DIFFERENT client
    // system than what getClientList shows. Let's check if the admin book method needs 
    // the client to be in a separate "clients" vs "visitors" store
    // Try creating a NEW client (different email) and booking
    const testEmail = `debugtest_${Date.now()}@example.com`;
    const newClientResp = await sbRPC(adminUrl, "addClient", [{ name: "Debug Test", email: testEmail }], adminHeaders);
    tests["newClient"] = newClientResp?.error ? newClientResp.error : "OK: " + JSON.stringify(newClientResp?.result || newClientResp).substring(0, 200);
    
    const newClientId = newClientResp?.result?.id || String(newClientResp?.result || "");
    tests["newClientId"] = newClientId;

    if (newClientId && !newClientId.includes("error")) {
      // Try booking with the fresh client ID
      const bookResp = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", newClientId], adminHeaders);
      tests["book_newClient"] = bookResp?.error ? bookResp.error : "BOOKED: " + JSON.stringify(bookResp?.result || bookResp).substring(0, 200);
      tests["book_newClientInt"] = null;
      const bookResp2 = await sbRPC(adminUrl, "book", ["2", "2", "2026-03-15 10:00:00", parseInt(newClientId)], adminHeaders);
      tests["book_newClientInt"] = bookResp2?.error ? bookResp2.error : "BOOKED: " + JSON.stringify(bookResp2?.result || bookResp2).substring(0, 200);
    }

    return Response.json(tests);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
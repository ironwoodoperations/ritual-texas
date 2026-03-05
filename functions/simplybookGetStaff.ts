import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function sbRPC(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await resp.json();
  return json?.result ?? json;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const apiKey = Deno.env.get("SIMPLYBOOK_API_KEY") || "";
    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    if (!apiKey || !company) {
      return Response.json({ error: "SIMPLYBOOK_API_KEY / SIMPLYBOOK_COMPANY_LOGIN not set" }, { status: 500 });
    }

    // Authenticate
    const token = await sbRPC("https://user-api.simplybook.me/login", "getToken", [company, apiKey]);
    if (!token || typeof token !== "string") {
      return Response.json({ error: "Failed to get SimplyBook token", detail: token }, { status: 500 });
    }

    const sbHeaders = { "X-Company-Login": company, "X-Token": token };

    // Fetch performers (staff/therapists)
    const performers = await sbRPC("https://user-api.simplybook.me", "getUnitList", [], sbHeaders);

    const staff = [];
    if (performers && typeof performers === "object") {
      for (const [id, p] of Object.entries(performers)) {
        if (p.is_visible === false) continue;
        staff.push({
          id: String(id),
          name: p.name || `Therapist ${id}`,
          phone: p.phone || "",
          position: p.position || "",
        });
      }
    }

    return Response.json({ staff });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
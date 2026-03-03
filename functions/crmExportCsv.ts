import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function csvEscape(v) {
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");
    const marketingOptInOnly = url.searchParams.get("marketingOptInOnly") === "true";
    const doNotContactExclude = url.searchParams.get("doNotContactExclude") === "true";

    // Build query filters
    let contacts = await base44.entities.CrmContact.list("-lastActivityAt", 1000);
    
    if (tag) {
      contacts = contacts.filter(c => (c.tags || []).includes(tag));
    }
    if (marketingOptInOnly) {
      contacts = contacts.filter(c => c.marketingOptIn === true);
    }
    if (doNotContactExclude) {
      contacts = contacts.filter(c => c.doNotContact !== true);
    }

    const headers = [
      "fullName",
      "firstName",
      "lastName",
      "email",
      "phone",
      "lastActivityAt",
      "totalBookings",
      "lifetimeValue",
      "marketingOptIn",
      "doNotContact",
      "tags",
      "notes"
    ];

    const lines = [
      headers.join(","),
      ...contacts.map(c => {
        const row = [
          c.fullName || "",
          c.firstName || "",
          c.lastName || "",
          c.email || "",
          c.phone || "",
          c.lastActivityAt || "",
          c.totalBookings || 0,
          c.lifetimeValue || 0,
          c.marketingOptIn ? "Yes" : "No",
          c.doNotContact ? "Yes" : "No",
          (c.tags || []).join("|"),
          c.notes || ""
        ];
        return row.map(csvEscape).join(",");
      })
    ];

    const csv = lines.join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="master-crm-export.csv"'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
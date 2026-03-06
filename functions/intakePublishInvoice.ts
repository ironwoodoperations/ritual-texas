import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { invoiceId } = await req.json();
    if (!invoiceId) return Response.json({ error: "Invoice ID required" }, { status: 400 });

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const env = Deno.env.get("SQUARE_ENV") || "production";
    const baseUrl = env === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const sqHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    };

    // Get invoice first to check version
    const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
    const getData = await getResp.json();
    const invoice = getData?.invoice;
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    // Publish invoice (sends email)
    const pubResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/publish`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify({ version: invoice.version, idempotency_key: `publish-quote-${Date.now()}` }),
    });
    const pubData = await pubResp.json();

    if (pubData?.errors) {
      return Response.json({ error: "Could not publish invoice", detail: pubData.errors }, { status: 500 });
    }

    const publicUrl = pubData?.invoice?.public_url;
    const guestEmail = pubData?.invoice?.primary_recipient?.email_address;

    return Response.json({
      success: true,
      invoiceId,
      publicUrl,
      guestEmail,
      message: `Invoice sent to ${guestEmail}`,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
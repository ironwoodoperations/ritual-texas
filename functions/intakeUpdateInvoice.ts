import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { invoiceId, updates } = await req.json();
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

    // Fetch current invoice for version + status
    const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
    const getData = await getResp.json();
    const invoice = getData?.invoice;
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    const version = invoice.version;
    const status = invoice.state;

    // Build update body — only allowed fields
    const updateBody = { version };

    if (updates.title) updateBody.title = updates.title;
    if (updates.description !== undefined) updateBody.description = updates.description;

    // Only update primary_recipient in DRAFT state
    if (status === "DRAFT") {
      // can update recipient if needed (we leave it unchanged here)
    }

    // Update payment_requests if dueDate or amount provided
    if (updates.dueDate || updates.amount) {
      const existing = invoice.payment_requests?.[0] || {};
      const updatedRequest = {
        uid: existing.uid,
        request_type: existing.request_type || "BALANCE",
        automatic_payment_source: existing.automatic_payment_source || "NONE",
      };
      if (updates.dueDate) updatedRequest.due_date = updates.dueDate;
      if (updates.amount) {
        updatedRequest.computed_amount_money = undefined;
        updatedRequest.total_completed_amount_money = undefined;
        // For DRAFT we can set fixed amount
        if (status === "DRAFT") {
          updatedRequest.fixed_amount_requested_money = {
            amount: Math.round(Number(updates.amount) * 100),
            currency: "USD",
          };
        }
      }
      updateBody.payment_requests = [updatedRequest];
    }

    const putResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, {
      method: "PUT",
      headers: sqHeaders,
      body: JSON.stringify({ invoice: updateBody }),
    });
    const putData = await putResp.json();

    if (putData?.errors) {
      return Response.json({ error: "Could not update invoice", detail: putData.errors }, { status: 500 });
    }

    return Response.json({ success: true, updatedInvoice: putData?.invoice });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
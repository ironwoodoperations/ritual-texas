import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { invoiceId, intakeId } = await req.json();
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

    // Fetch current invoice
    const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
    const getData = await getResp.json();
    const invoice = getData?.invoice;
    if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });

    const status = invoice.state;
    const version = invoice.version;

    const finalStates = ["PAID", "REFUNDED", "CANCELED", "FAILED"];
    if (finalStates.includes(status)) {
      return Response.json({ error: "This invoice cannot be voided — it is already in a final state.", status }, { status: 400 });
    }

    let result;
    if (status === "DRAFT") {
      // DELETE draft invoice
      const delResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}?version=${version}`, {
        method: "DELETE",
        headers: sqHeaders,
      });
      if (!delResp.ok) {
        const err = await delResp.json();
        return Response.json({ error: "Could not delete draft invoice", detail: err }, { status: 500 });
      }
      result = { success: true, message: "Draft invoice deleted.", status: "DELETED" };
    } else {
      // CANCEL unpaid/scheduled/partially paid
      const cancelResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/cancel`, {
        method: "POST",
        headers: sqHeaders,
        body: JSON.stringify({ version }),
      });
      const cancelData = await cancelResp.json();
      if (cancelData?.errors) {
        return Response.json({ error: "Could not cancel invoice", detail: cancelData.errors }, { status: 500 });
      }
      result = { success: true, message: "Invoice cancelled.", status: "CANCELED" };
    }

    // Clear squareInvoiceId on the intake record
    if (intakeId) {
      await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, { squareInvoiceId: null });
    }

    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});
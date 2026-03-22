import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, invoiceId, version, email } = body;

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const env = Deno.env.get('SQUARE_ENV') || 'sandbox';
    const baseUrl = env === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    const sqHeaders = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    };

    if (action === 'get') {
      // Get single invoice details
      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    if (action === 'send') {
      // Fetch latest invoice to get current status and version
      const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
      const getInvData = await getResp.json();
      if (getInvData.errors) return Response.json({ success: false, error: getInvData.errors[0]?.detail });

      const latestInv = getInvData.invoice;
      const latestVersion = latestInv.version;

      // DRAFT invoices need to be published (first send), not just resent
      const endpoint = latestInv.status === 'DRAFT'
        ? `${baseUrl}/v2/invoices/${invoiceId}/publish`
        : `${baseUrl}/v2/invoices/${invoiceId}/send`;

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ version: latestVersion, idempotency_key: `send-${invoiceId}-${Date.now()}` }),
      });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    if (action === 'cancel') {
      // Fetch latest version before cancelling
      const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
      const getInvData = await getResp.json();
      const latestVersion = getInvData.invoice?.version ?? version;

      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ version: latestVersion }),
      });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    if (action === 'delete') {
      // Always fetch latest version before deleting (version mismatch causes failures)
      const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
      const getInvData = await getResp.json();
      if (getInvData.errors) return Response.json({ success: false, error: getInvData.errors[0]?.detail });
      const latestVersion = getInvData.invoice?.version ?? version;

      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}?version=${latestVersion}`, {
        method: 'DELETE',
        headers: sqHeaders,
      });
      if (resp.status === 200 || resp.status === 204) {
        return Response.json({ success: true });
      }
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true });
    }

    if (action === 'record_payment') {
      // Record a manual/cash/external payment against the invoice's order
      const { amount, note, paymentMethod } = body;
      // First get the invoice to find the order_id
      const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, { headers: sqHeaders });
      const getInvData = await getResp.json();
      if (getInvData.errors) return Response.json({ success: false, error: getInvData.errors[0]?.detail });
      const invoice = getInvData.invoice;
      const orderId = invoice.order_id;
      if (!orderId) return Response.json({ success: false, error: 'No order ID found on invoice' });

      // Create a EXTERNAL payment (cash/check/other) against the order
      const amountCents = Math.round(parseFloat(amount) * 100);
      const payResp = await fetch(`${baseUrl}/v2/payments`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({
          idempotency_key: `manual-pay-${invoiceId}-${Date.now()}`,
          amount_money: { amount: amountCents, currency: 'USD' },
          source_id: 'EXTERNAL',
          external_details: {
            type: paymentMethod || 'OTHER',
            source: note || 'Manual payment recorded via Hotel RITUAL admin',
          },
          order_id: orderId,
          note: note || 'Manual payment',
        }),
      });
      const payData = await payResp.json();
      if (payData.errors) return Response.json({ success: false, error: payData.errors[0]?.detail });
      return Response.json({ success: true, payment: payData.payment });
    }

    if (action === 'update_due_date') {
      // Update invoice due date (field_names patch)
      const { dueDate } = body;
      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: sqHeaders,
        body: JSON.stringify({
          invoice: {
            version,
            payment_requests: [{ request_type: 'BALANCE', due_date: dueDate }],
          },
          idempotency_key: `update-${invoiceId}-${Date.now()}`,
          fields_to_clear: [],
        }),
      });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
});
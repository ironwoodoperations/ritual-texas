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
      // Resend invoice notification
      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ idempotency_key: `send-${invoiceId}-${Date.now()}` }),
      });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    if (action === 'cancel') {
      // Cancel invoice
      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ version }),
      });
      const data = await resp.json();
      if (data.errors) return Response.json({ success: false, error: data.errors[0]?.detail });
      return Response.json({ success: true, invoice: data.invoice });
    }

    if (action === 'delete') {
      // Delete invoice (only works on DRAFT or CANCELLED invoices)
      const resp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}?version=${version}`, {
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
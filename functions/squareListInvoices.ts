import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const env = Deno.env.get('SQUARE_ENV') || 'sandbox';
    const baseUrl = env === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // Get location ID first
    const locResp = await fetch(`${baseUrl}/v2/locations`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    const locData = await locResp.json();
    const locationId = locData.locations?.find(l => l.status === 'ACTIVE')?.id || locData.locations?.[0]?.id;

    if (!locationId) {
      return Response.json({ success: false, error: 'No Square location found' });
    }

    // List invoices
    const resp = await fetch(`${baseUrl}/v2/invoices?location_id=${locationId}&limit=100`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    const data = await resp.json();

    if (data.errors) {
      return Response.json({ success: false, error: data.errors[0]?.detail || 'Square error' });
    }

    const invoices = (data.invoices || []).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      title: inv.title,
      status: inv.status,
      publicUrl: inv.public_url,
      createdAt: inv.created_at,
      updatedAt: inv.updated_at,
      dueDate: inv.payment_requests?.[0]?.due_date,
      amountDue: (inv.payment_requests?.[0]?.computed_amount_money?.amount || 0) / 100,
      amountPaid: (inv.payment_requests?.[0]?.total_completed_amount_money?.amount || 0) / 100,
      recipientName: [inv.primary_recipient?.given_name, inv.primary_recipient?.family_name].filter(Boolean).join(' '),
      recipientEmail: inv.primary_recipient?.email_address,
    }));

    // Sort by created date desc
    invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json({ success: true, invoices });
  } catch (e) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});
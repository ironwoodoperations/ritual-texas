import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();

    // Support both field name conventions
    const guestEmail = intake?.guestEmail || intake?.email;
    const guestName = intake?.guestName;
    if (!guestEmail || !guestName) {
      return Response.json({ error: 'Guest name and email required' }, { status: 400 });
    }

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

    // Build line items
    const lineItems = [];

    if (intake.checkInDate && intake.checkOutDate) {
      const nights = Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24));
      if (nights > 0) {
        lineItems.push({
          name: `Hotel Stay – ${intake.roomRequested || 'Room'} (${nights} night${nights === 1 ? '' : 's'})`,
          quantity: String(nights),
          base_price_money: { amount: 25000, currency: 'USD' },
        });
      }
    }

    if (intake.selectedTreatments?.length) {
      for (const treatment of intake.selectedTreatments) {
        lineItems.push({
          name: treatment,
          quantity: '1',
          base_price_money: { amount: 15000, currency: 'USD' },
        });
      }
    }

    if (lineItems.length === 0) {
      return Response.json({ error: 'No billable items — add hotel dates or treatments first' }, { status: 400 });
    }

    // Step 1: Find or create customer
    const searchResp = await fetch(`${baseUrl}/v2/customers/search`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({ query: { filter: { email_address: { exact: intake.guestEmail } } } }),
    });
    const searchData = await searchResp.json();
    let customerId = searchData?.customers?.[0]?.id;

    if (!customerId) {
      const nameParts = intake.guestName.trim().split(' ');
      const createResp = await fetch(`${baseUrl}/v2/customers`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({
          given_name: nameParts[0] || intake.guestName,
          family_name: nameParts.slice(1).join(' ') || '.',
          email_address: intake.guestEmail,
          phone_number: intake.phone || undefined,
          idempotency_key: `intake-customer-${intake.guestEmail}-${Date.now()}`,
        }),
      });
      const createData = await createResp.json();
      customerId = createData?.customer?.id;
      if (!customerId) {
        return Response.json({ error: 'Could not create Square customer', detail: createData }, { status: 500 });
      }
    }

    // Step 2: Get location
    const locResp = await fetch(`${baseUrl}/v2/locations`, { headers: sqHeaders });
    const locData = await locResp.json();
    const locationId = (locData?.locations || []).find(l => l.status === 'ACTIVE')?.id || locData?.locations?.[0]?.id;
    if (!locationId) return Response.json({ error: 'No Square location found' }, { status: 500 });

    // Step 3: Create order
    const orderResp = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({
        order: {
          location_id: locationId,
          customer_id: customerId,
          line_items: lineItems,
        },
        idempotency_key: `intake-order-${intake.id || Date.now()}`,
      }),
    });
    const orderData = await orderResp.json();
    const orderId = orderData?.order?.id;
    if (!orderId) {
      return Response.json({ error: 'Could not create order', detail: orderData }, { status: 500 });
    }

    // Step 4: Create invoice
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const invResp = await fetch(`${baseUrl}/v2/invoices`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({
        invoice: {
          order_id: orderId,
          primary_recipient: { customer_id: customerId },
          payment_requests: [{
            request_type: 'BALANCE',
            due_date: dueDate,
            automatic_payment_source: 'NONE',
          }],
          accepted_payment_methods: { card: true, square_gift_card: false, bank_account: false, buy_now_pay_later: false, cash_app_pay: false },
          delivery_method: 'EMAIL',
          title: 'Hotel RITUAL – Package Invoice',
          description: intake.internalNotes || `Wellness Retreat for ${intake.guestName}`,
        },
        idempotency_key: `intake-invoice-${intake.id || Date.now()}`,
      }),
    });
    const invData = await invResp.json();
    const invoiceId = invData?.invoice?.id;
    if (!invoiceId) {
      return Response.json({ error: 'Could not create invoice', detail: invData }, { status: 500 });
    }

    // Step 5: Publish invoice
    const pubResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/publish`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({ version: invData.invoice.version, idempotency_key: `intake-publish-${invoiceId}` }),
    });
    const pubData = await pubResp.json();
    const publicUrl = pubData?.invoice?.public_url || invData?.invoice?.public_url;

    return Response.json({
      success: true,
      invoiceId,
      publicUrl,
      message: `Invoice created and sent to ${intake.guestEmail}`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { customerEmail, customerName, lineItems, note, dueDate, sendNow = true } = body;
    // lineItems: [{ name, amount (in dollars), quantity }]

    if (!customerEmail || !customerName || !lineItems || lineItems.length === 0) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
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

    // Step 1: Find or create customer
    const searchResp = await fetch(`${baseUrl}/v2/customers/search`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({ query: { filter: { email_address: { exact: customerEmail } } } }),
    });
    const searchData = await searchResp.json();
    let customerId = searchData?.customers?.[0]?.id;

    if (!customerId) {
      const nameParts = customerName.trim().split(' ');
      const createBody = {
        given_name: nameParts[0] || customerName,
        family_name: nameParts.slice(1).join(' ') || '.',
        email_address: customerEmail,
        idempotency_key: `create-customer-${customerEmail}-${Date.now()}`,
      };
      const createResp = await fetch(`${baseUrl}/v2/customers`, {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify(createBody),
      });
      const createData = await createResp.json();
      customerId = createData?.customer?.id;
      if (!customerId) {
        return Response.json({ success: false, error: 'Could not create Square customer', detail: createData });
      }
    }

    // Step 2: Create order
    const locationId = await getLocationId(baseUrl, accessToken);
    if (!locationId) return Response.json({ success: false, error: 'No Square location found' });

    const orderLineItems = lineItems.map(item => ({
      name: item.name,
      quantity: String(item.quantity || 1),
      base_price_money: {
        amount: Math.round(item.amount * 100), // cents
        currency: 'USD',
      },
    }));

    const orderResp = await fetch(`${baseUrl}/v2/orders`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({
        order: {
          location_id: locationId,
          customer_id: customerId,
          line_items: orderLineItems,
        },
        idempotency_key: `order-${Date.now()}`,
      }),
    });
    const orderData = await orderResp.json();
    const orderId = orderData?.order?.id;
    if (!orderId) {
      return Response.json({ success: false, error: 'Could not create order', detail: orderData });
    }

    // Step 3: Create invoice
    const invoiceBody = {
      invoice: {
        order_id: orderId,
        primary_recipient: { customer_id: customerId },
        payment_requests: [{
          request_type: 'BALANCE',
          due_date: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          automatic_payment_source: 'NONE',
        }],
        accepted_payment_methods: {
          card: true,
          square_gift_card: false,
          bank_account: false,
          buy_now_pay_later: false,
          cash_app_pay: false,
        },
        delivery_method: 'EMAIL',
        title: 'Hotel RITUAL – Package Invoice',
        description: note || 'Thank you for choosing Hotel RITUAL.',
      },
      idempotency_key: `invoice-${Date.now()}`,
    };

    const invResp = await fetch(`${baseUrl}/v2/invoices`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify(invoiceBody),
    });
    const invData = await invResp.json();
    const invoiceId = invData?.invoice?.id;
    if (!invoiceId) {
      return Response.json({ success: false, error: 'Could not create invoice', detail: invData });
    }

    // Step 4: Optionally publish invoice
    if (!sendNow) {
      return Response.json({
        success: true,
        invoiceId,
        saved: true,
        invoice: invData?.invoice,
      });
    }

    // Fetch current invoice to get latest version
    const getResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}`, {
      headers: sqHeaders,
    });
    const getInvData = await getResp.json();
    const currentVersion = getInvData?.invoice?.version;

    if (!currentVersion) {
      return Response.json({ success: false, error: 'Could not fetch invoice for publishing', detail: getInvData });
    }

    const pubResp = await fetch(`${baseUrl}/v2/invoices/${invoiceId}/publish`, {
      method: 'POST',
      headers: sqHeaders,
      body: JSON.stringify({ version: currentVersion, idempotency_key: `publish-${invoiceId}-${Date.now()}` }),
    });
    const pubData = await pubResp.json();

    if (!pubData?.invoice?.id) {
      return Response.json({ success: false, error: 'Could not publish invoice', detail: pubData });
    }

    const publicUrl = pubData?.invoice?.public_url;

    return Response.json({
      success: true,
      invoiceId,
      publicUrl,
      invoice: pubData?.invoice,
    });

  } catch (e) {
    return Response.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
});

async function getLocationId(baseUrl, accessToken) {
  const resp = await fetch(`${baseUrl}/v2/locations`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18', 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  // Prefer active locations
  const active = (data?.locations || []).find(l => l.status === 'ACTIVE') || data?.locations?.[0];
  return active?.id || null;
}
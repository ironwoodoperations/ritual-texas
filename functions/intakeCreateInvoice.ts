import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();
    
    if (!intake?.guestEmail || !intake?.guestName) {
      return Response.json({ error: 'Guest name and email required' }, { status: 400 });
    }

    const token = Deno.env.get('SQUARE_ACCESS_TOKEN');
    if (!token) throw new Error('Square not configured');

    // Build line items
    const lineItems = [];
    
    // Hotel nights
    if (intake.checkInDate && intake.checkOutDate) {
      const nights = Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24));
      lineItems.push({
        name: `Hotel Stay (${nights} night${nights === 1 ? '' : 's'})`,
        quantity: String(nights),
        unitPrice: { amount: 25000, currency: 'USD' }, // $250
        description: `${intake.roomRequested || 'Standard Room'} - ${intake.checkInDate} to ${intake.checkOutDate}`,
      });
    }

    // Treatments
    if (intake.selectedTreatments?.length) {
      for (const treatment of intake.selectedTreatments) {
        lineItems.push({
          name: treatment,
          quantity: '1',
          unitPrice: { amount: 15000, currency: 'USD' }, // $150 default
          description: intake.treatmentsRequested || 'Treatment',
        });
      }
    }

    if (lineItems.length === 0) {
      return Response.json({ error: 'No billable items' }, { status: 400 });
    }

    // Get Square location
    const locRes = await fetch('https://squareup.com/v2/locations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const locations = await locRes.json();
    const locationId = locations.locations?.[0]?.id;
    if (!locationId) throw new Error('No Square location found');

    // Create invoice
    const invoiceBody = {
      invoice: {
        location_id: locationId,
        customer_id: null, // Could create customer first
        description: `Wellness Retreat for ${intake.guestName}`,
        invoice_number: `INTAKE-${intake.id?.slice(0, 8) || 'NEW'}`,
        recipient_name: intake.guestName,
        recipient_email: intake.guestEmail,
        recipient_phone_number: intake.phone,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        custom_fields: [
          {
            label: 'Check-In',
            value: intake.checkInDate || 'TBD',
          },
          {
            label: 'Check-Out', 
            value: intake.checkOutDate || 'TBD',
          },
        ],
        line_items: lineItems,
        payment_requests: [
          {
            request_type: 'INVOICE',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        ],
      },
    };

    const invRes = await fetch('https://squareup.com/v2/invoices', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceBody),
    });

    if (!invRes.ok) {
      const err = await invRes.json();
      throw new Error(`Square error: ${JSON.stringify(err)}`);
    }

    const invoice = await invRes.json();

    // Send invoice
    await fetch(`https://squareup.com/v2/invoices/${invoice.invoice.id}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    return Response.json({ 
      success: true,
      invoiceId: invoice.invoice.id,
      invoiceUrl: invoice.invoice.url,
      message: 'Invoice created and sent to customer'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
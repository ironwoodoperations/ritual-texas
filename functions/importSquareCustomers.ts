import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { customers = [] } = body;

    let createdContacts = 0;
    let createdEvents = 0;
    let skippedNoData = 0;
    const errors = [];

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      const promises = batch.map(async (customer) => {
        try {
          const firstName = customer.first_name || customer.firstName || '';
          const lastName = customer.last_name || customer.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const email = customer.email || '';
          const phone = customer.phone_number || customer.phone || '';

          if (!fullName && !email && !phone) {
            skippedNoData++;
            return null;
          }

          // Upsert contact
          const contactRes = await base44.functions.invoke('crmUpsertContact', {
            firstName,
            lastName,
            fullName,
            email,
            phone,
            normalizedEmail: normalizeEmail(email),
            normalizedPhone: normalizePhone(phone),
            source: 'square',
            externalId: customer.id
          });

          if (contactRes.data?.id) {
            let eventCreated = false;
            
            // Create event if there's order data
            if (customer.total_money || customer.created_at) {
              try {
                await base44.functions.invoke('crmAddEvent', {
                  contactId: contactRes.data.id,
                  source: 'square',
                  externalId: customer.id,
                  eventType: 'other',
                  title: 'Square Purchase',
                  amount: customer.total_money ? customer.total_money / 100 : 0,
                  startAt: customer.created_at,
                  status: 'completed'
                });
                eventCreated = true;
              } catch (e) {
                console.warn(`Failed to create event for customer ${customer.id}:`, e.message);
              }
            }
            
            return { contact: true, event: eventCreated };
          }
        } catch (e) {
          errors.push(`Customer ${customer.email || customer.id}: ${e.message}`);
          return null;
        }
      });

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result?.contact) createdContacts++;
        if (result?.event) createdEvents++;
      });
    }

    return Response.json({
      success: true,
      createdContacts,
      createdEvents,
      totalProcessed: customers.length,
      skippedNoData,
      errors: errors.length > 0 ? errors.slice(0, 10) : null
    });
  } catch (error) {
    console.error('importSquareCustomers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
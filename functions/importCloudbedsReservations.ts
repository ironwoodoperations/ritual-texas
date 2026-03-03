import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeEmail(email) {
  if (!email) return '';
  return String(email).toLowerCase().trim();
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
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
    const rows = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'No rows provided' }, { status: 400 });
    }

    let contactsCreated = 0;
    let eventsCreated = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const fullName = (row.Name || '').trim();
        const email = normalizeEmail(row.Email);
        const phone = normalizePhone(row['Phone Number'] || row.Mobile);
        const reservationId = String(row['Reservation Number'] || '').trim();

        if (!fullName) continue;

        // Split name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Upsert contact
        let contactResp;
        try {
          contactResp = await base44.functions.invoke('crmUpsertContact', {
            firstName,
            lastName,
            fullName,
            email,
            phone,
            source: 'cloudbeds',
            externalId: reservationId
          });
        } catch (funcErr) {
          errors.push(`Contact upsert failed for ${fullName}: ${funcErr.message}`);
          continue;
        }

        if (!contactResp.data?.ok) {
          errors.push(`Row ${fullName}: ${contactResp.data?.error || 'Contact upsert failed'}`);
          continue;
        }

        const contactId = contactResp.data?.id || contactResp.data?.contact?.id;
        if (!contactId) {
          errors.push(`No contact ID returned for ${fullName}`);
          continue;
        }

        contactsCreated++;

        // Create event for the reservation
        if (reservationId) {
          const checkInStr = row['Check in Date'];
          const checkOutStr = row['Check out Date'];
          const roomType = row['Room Type'] || 'Hotel Stay';
          const total = row['Grand Total'] || 0;

          let checkInDate = null;
          let checkOutDate = null;

          // Parse dates (MM/DD/YYYY format)
          if (checkInStr) {
            const [m, d, y] = String(checkInStr).split('/');
            if (m && d && y) {
              checkInDate = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00Z`).toISOString();
            }
          }
          if (checkOutStr) {
            const [m, d, y] = String(checkOutStr).split('/');
            if (m && d && y) {
              checkOutDate = new Date(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00Z`).toISOString();
            }
          }

          if (checkInDate) {
            try {
              await base44.functions.invoke('crmAddEvent', {
                contactId,
                source: 'cloudbeds',
                externalId: reservationId,
                eventType: 'hotel_stay',
                startAt: checkInDate,
                endAt: checkOutDate || checkInDate,
                status: row.Status || 'confirmed',
                title: roomType,
                amount: total,
                meta: {
                  roomNumber: row['Room Number'] || '',
                  nights: row.Nights || 0,
                  adults: row.Adults || 0,
                  children: row.Children || 0
                }
              });
              eventsCreated++;
            } catch (eventErr) {
              errors.push(`Event creation failed for ${fullName}: ${eventErr.message}`);
            }
          }
        }
      } catch (e) {
        errors.push(`Row error: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      contactsCreated,
      eventsCreated,
      totalRows: rows.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
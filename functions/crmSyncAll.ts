import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getSetting(base44, key, fallback = null) {
  const rows = await base44.entities.AppSetting.filter({ key });
  if (rows.length === 0) return fallback;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return rows[0].value;
  }
}

async function setSetting(base44, key, value) {
  const rows = await base44.entities.AppSetting.filter({ key });
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  if (rows.length === 0) {
    await base44.entities.AppSetting.create({ key, value: valueStr });
  } else {
    await base44.entities.AppSetting.update(rows[0].id, { value: valueStr });
  }
}

async function upsertContact(base44, payload) {
  const res = await base44.functions.invoke('crmUpsertContact', payload);
  if (!res.data?.ok) throw new Error(res.data?.error || 'upsertContact failed');
  return res.data.contact;
}

async function addEvent(base44, payload) {
  const res = await base44.functions.invoke('crmAddEvent', payload);
  if (!res.data?.ok) throw new Error(res.data?.error || 'addEvent failed');
  return res.data.event;
}

// ========== SYNC STUBS: Replace with your existing API pulls ==========

async function syncCloudbeds(base44, sinceIso) {
  try {
    const rows = await base44.entities.SiteSettings.filter({ key: 'CLOUDBEDS_ACCESS_TOKEN' });
    if (rows.length === 0) return [];

    let accessToken = rows[0].value;
    const propertyRow = await base44.entities.SiteSettings.filter({ key: 'CLOUDBEDS_PROPERTY_ID' });
    const propertyId = propertyRow.length > 0 ? propertyRow[0].value : null;
    
    if (!accessToken || !propertyId) return [];

    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 90);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const url = `https://hotels.cloudbeds.com/api/v1.1/getReservations?propertyID=${encodeURIComponent(propertyId)}&checkInFrom=${fmt(today)}&checkInTo=${fmt(future)}&pageSize=100&pageNumber=1`;
    
    let resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Auto-refresh if expired
    if (!resp.ok && (resp.status === 401 || resp.status === 403)) {
      const refreshToken = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_REFRESH_TOKEN' });
      if (refreshToken.length > 0) {
        const form = new URLSearchParams();
        form.set('grant_type', 'refresh_token');
        form.set('client_id', Deno.env.get('CLOUDBEDS_CLIENT_ID'));
        form.set('client_secret', Deno.env.get('CLOUDBEDS_CLIENT_SECRET'));
        form.set('refresh_token', refreshToken[0].value);

        const tokenResp = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString()
        });

        const tokenJson = await tokenResp.json();
        accessToken = tokenJson?.access_token || tokenJson?.data?.access_token;
        if (accessToken) {
          await base44.asServiceRole.entities.SiteSettings.update(rows[0].id, { value: accessToken });
          resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        }
      }
    }

    if (!resp.ok) return [];
    const json = await resp.json();
    if (!json?.success || !json?.data) return [];

    return (json.data || []).map(r => ({
      externalId: r.reservationID,
      contactExternalId: r.reservationID,
      firstName: (r.guestName || '').split(' ')[0],
      lastName: (r.guestName || '').split(' ').slice(1).join(' '),
      fullName: r.guestName,
      email: r.guestEmail,
      phone: r.guestPhone || '',
      eventType: 'hotel_stay',
      startAt: r.startDate ? new Date(r.startDate).toISOString() : new Date().toISOString(),
      endAt: r.endDate ? new Date(r.endDate).toISOString() : null,
      status: r.status,
      title: `${r.roomTypeName || 'Room'} Stay`,
      amount: Number(r.total) || 0,
      meta: { roomNumber: r.roomNumber, adults: r.adults, children: r.children }
    }));
  } catch (e) {
    console.error('Cloudbeds sync error:', e.message);
    return [];
  }
}

async function syncSquare(base44, sinceIso) {
  try {
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const env = Deno.env.get('SQUARE_ENV') || 'production';
    const baseUrl = env === 'sandbox' ? 'https://connect.squareSandbox.com' : 'https://connect.squareup.com';

    if (!accessToken) return [];

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Fetch customers
    const customersResp = await fetch(`${baseUrl}/v2/customers`, {
      headers,
      method: 'GET'
    });
    if (!customersResp.ok) return [];
    const customersJson = await customersResp.json();
    const customersMap = {};
    if (customersJson.customers) {
      customersJson.customers.forEach(c => {
        customersMap[c.id] = c;
      });
    }

    // Fetch appointments
    const appointmentsResp = await fetch(`${baseUrl}/v2/appointments/search`, {
      headers,
      method: 'POST',
      body: JSON.stringify({
        query: {
          filter: {
            startAt: {
              startAt: sinceIso
            }
          }
        }
      })
    });
    if (!appointmentsResp.ok) return [];
    const appointmentsJson = await appointmentsResp.json();
    const appointments = appointmentsJson.appointments || [];

    return appointments.map(apt => {
      const customer = customersMap[apt.customerId] || {};
      const primaryPhone = customer.phoneNumber || '';
      const primaryEmail = (customer.emailAddress || '');
      const name = customer.givenName || customer.familyName 
        ? `${customer.givenName || ''} ${customer.familyName || ''}`.trim()
        : customer.nickName || '';

      return {
        externalId: apt.id,
        contactExternalId: apt.customerId,
        firstName: customer.givenName || name.split(' ')[0] || '',
        lastName: customer.familyName || name.split(' ').slice(1).join(' ') || '',
        fullName: name,
        email: primaryEmail,
        phone: primaryPhone,
        eventType: 'treatment',
        startAt: apt.startAt || new Date().toISOString(),
        endAt: apt.endAt || null,
        status: apt.status || 'pending',
        title: apt.locationId ? `Square Appointment` : 'Appointment',
        amount: 0,
        meta: { customerId: apt.customerId, locationId: apt.locationId }
      };
    });
  } catch (e) {
    console.error('Square sync error:', e.message);
    return [];
  }
}

async function syncAcuity(base44, sinceIso) {
  try {
    const userId = Deno.env.get('ACUITY_USER_ID');
    const apiKey = Deno.env.get('ACUITY_API_KEY');

    if (!userId || !apiKey) return [];

    const auth = btoa(`${userId}:${apiKey}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };

    // Fetch appointments
    const sinceDate = new Date(sinceIso);
    const fromDate = sinceDate.toISOString().split('T')[0];
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 90);
    const untilDate = toDate.toISOString().split('T')[0];

    const appointmentsResp = await fetch(`https://acuityscheduling.com/api/v1/appointments?minDate=${fromDate}&maxDate=${untilDate}`, {
      headers,
      method: 'GET'
    });
    if (!appointmentsResp.ok) return [];
    const appointments = await appointmentsResp.json();
    const appointmentList = Array.isArray(appointments) ? appointments : [];

    // Fetch clients
    const clientsResp = await fetch(`https://acuityscheduling.com/api/v1/clients`, {
      headers,
      method: 'GET'
    });
    if (!clientsResp.ok) return [];
    const clients = await clientsResp.json();
    const clientsMap = {};
    if (Array.isArray(clients)) {
      clients.forEach(c => {
        clientsMap[c.id] = c;
      });
    }

    return appointmentList.map(apt => {
      const client = clientsMap[apt.clientID] || {};
      const fullName = client.firstName && client.lastName 
        ? `${client.firstName} ${client.lastName}`
        : client.firstName || client.lastName || '';

      return {
        externalId: String(apt.id),
        clientExternalId: String(apt.clientID),
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        fullName: fullName,
        email: client.email || '',
        phone: client.phone || '',
        eventType: 'treatment',
        startAt: apt.datetime ? new Date(apt.datetime).toISOString() : new Date().toISOString(),
        endAt: apt.endTime ? new Date(apt.endTime).toISOString() : null,
        status: apt.status || 'pending',
        title: apt.type || 'Appointment',
        amount: Number(apt.price) || 0,
        meta: { typeID: apt.typeID, calendarID: apt.calendarID }
      };
    });
  } catch (e) {
    console.error('Acuity sync error:', e.message);
    return [];
  }
}

async function syncSimplyBook(base44, sinceIso) {
  try {
    const apiKey = Deno.env.get('SIMPLYBOOK_API_KEY');
    const companyLogin = Deno.env.get('SIMPLYBOOK_COMPANY_LOGIN');

    if (!apiKey || !companyLogin) return [];

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Fetch clients
    const clientsResp = await fetch(`https://user-api.simplybook.me/api/v3/${companyLogin}/clients`, {
      headers,
      method: 'GET'
    });
    if (!clientsResp.ok) return [];
    const clientsJson = await clientsResp.json();
    const clientsMap = {};
    if (Array.isArray(clientsJson)) {
      clientsJson.forEach(c => {
        clientsMap[c.id] = c;
      });
    }

    // Fetch bookings
    const sinceDate = new Date(sinceIso);
    const fromDate = sinceDate.toISOString().split('T')[0];
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 90);
    const untilDate = toDate.toISOString().split('T')[0];

    const bookingsResp = await fetch(`https://user-api.simplybook.me/api/v3/${companyLogin}/bookings?from_date=${fromDate}&to_date=${untilDate}`, {
      headers,
      method: 'GET'
    });
    if (!bookingsResp.ok) return [];
    const bookingsJson = await bookingsResp.json();
    const bookings = Array.isArray(bookingsJson) ? bookingsJson : [];

    return bookings.map(booking => {
      const client = clientsMap[booking.client_id] || {};
      return {
        externalId: booking.id,
        clientExternalId: booking.client_id,
        firstName: client.first_name || '',
        lastName: client.last_name || '',
        fullName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        email: client.email || '',
        phone: client.phone || '',
        eventType: 'treatment',
        startAt: booking.start_date ? new Date(booking.start_date).toISOString() : new Date().toISOString(),
        endAt: booking.end_date ? new Date(booking.end_date).toISOString() : null,
        status: booking.status || 'pending',
        title: booking.service_name || 'Service',
        amount: Number(booking.price) || 0,
        meta: { serviceId: booking.service_id, staffId: booking.staff_id }
      };
    });
  } catch (e) {
    console.error('SimplyBook sync error:', e.message);
    return [];
  }
}

// ========================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const nowIso = new Date().toISOString();

    const cloudbedsSince = await getSetting(base44, "cloudbeds_lastSync", "2000-01-01T00:00:00.000Z");
    const squareSince = await getSetting(base44, "square_lastSync", "2000-01-01T00:00:00.000Z");
    const acuitySince = await getSetting(base44, "acuity_lastSync", "2000-01-01T00:00:00.000Z");
    const simplySince = await getSetting(base44, "simplybook_lastSync", "2000-01-01T00:00:00.000Z");

    const results = {
      cloudbeds: { pulled: 0, contacts: 0, events: 0 },
      square: { pulled: 0, contacts: 0, events: 0 },
      acuity: { pulled: 0, contacts: 0, events: 0 },
      simplybook: { pulled: 0, contacts: 0, events: 0 }
    };

    // 1) Cloudbeds
    const cloudbedsRows = await syncCloudbeds(base44, cloudbedsSince);
    results.cloudbeds.pulled = cloudbedsRows.length;
    for (const r of cloudbedsRows) {
      try {
        const c = await upsertContact(base44, {
          firstName: r.firstName,
          lastName: r.lastName,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          source: "cloudbeds",
          externalId: r.contactExternalId || r.externalId
        });
        results.cloudbeds.contacts += 1;
        
        await addEvent(base44, {
          contactId: c.id,
          source: "cloudbeds",
          externalId: r.externalId,
          eventType: r.eventType || "hotel_stay",
          startAt: r.startAt,
          endAt: r.endAt,
          status: r.status,
          title: r.title,
          amount: r.amount || 0,
          meta: r.meta || {}
        });
        results.cloudbeds.events += 1;
      } catch (e) {
        console.error('Cloudbeds sync error:', e.message);
      }
    }
    await setSetting(base44, "cloudbeds_lastSync", nowIso);

    // 2) Square
    const squareRows = await syncSquare(base44, squareSince);
    results.square.pulled = squareRows.length;
    for (const r of squareRows) {
      try {
        const c = await upsertContact(base44, {
          firstName: r.firstName,
          lastName: r.lastName,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          source: "square",
          externalId: r.customerExternalId || r.externalId
        });
        results.square.contacts += 1;
        
        await addEvent(base44, {
          contactId: c.id,
          source: "square",
          externalId: r.externalId,
          eventType: r.eventType || "treatment",
          startAt: r.startAt,
          endAt: r.endAt,
          status: r.status,
          title: r.title,
          amount: r.amount || 0,
          meta: r.meta || {}
        });
        results.square.events += 1;
      } catch (e) {
        console.error('Square sync error:', e.message);
      }
    }
    await setSetting(base44, "square_lastSync", nowIso);

    // 3) Acuity
    const acuityRows = await syncAcuity(base44, acuitySince);
    results.acuity.pulled = acuityRows.length;
    for (const r of acuityRows) {
      try {
        const c = await upsertContact(base44, {
          firstName: r.firstName,
          lastName: r.lastName,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          source: "acuity",
          externalId: r.clientExternalId || r.externalId
        });
        results.acuity.contacts += 1;
        
        await addEvent(base44, {
          contactId: c.id,
          source: "acuity",
          externalId: r.externalId,
          eventType: r.eventType || "treatment",
          startAt: r.startAt,
          endAt: r.endAt,
          status: r.status,
          title: r.title,
          amount: r.amount || 0,
          meta: r.meta || {}
        });
        results.acuity.events += 1;
      } catch (e) {
        console.error('Acuity sync error:', e.message);
      }
    }
    await setSetting(base44, "acuity_lastSync", nowIso);

    // 4) SimplyBook
    const simplyRows = await syncSimplyBook(base44, simplySince);
    results.simplybook.pulled = simplyRows.length;
    for (const r of simplyRows) {
      try {
        const c = await upsertContact(base44, {
          firstName: r.firstName,
          lastName: r.lastName,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          source: "simplybook",
          externalId: r.clientExternalId || r.externalId
        });
        results.simplybook.contacts += 1;
        
        await addEvent(base44, {
          contactId: c.id,
          source: "simplybook",
          externalId: r.externalId,
          eventType: r.eventType || "treatment",
          startAt: r.startAt,
          endAt: r.endAt,
          status: r.status,
          title: r.title,
          amount: r.amount || 0,
          meta: r.meta || {}
        });
        results.simplybook.events += 1;
      } catch (e) {
        console.error('SimplyBook sync error:', e.message);
      }
    }
    await setSetting(base44, "simplybook_lastSync", nowIso);

    return Response.json({ ok: true, ranAt: nowIso, results });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SB_LOGIN_URL = 'https://user-api.simplybook.me/login';
const SB_ADMIN_URL = 'https://user-api.simplybook.me/admin';

async function rpcCall(url, method, params, headers = {}) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`RPC non-JSON (${resp.status}): ${text}`); }
  if (json.error) throw new Error(`SimplyBook RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();

    if (!intake?.selectedTreatments?.length) {
      return Response.json({ error: 'No treatments selected' }, { status: 400 });
    }
    // Support both field name conventions
    const guestEmail = intake?.guestEmail || intake?.email;
    const guestName = intake?.guestName;
    if (!guestName || !guestEmail) {
      return Response.json({ error: 'Guest name and email required' }, { status: 400 });
    }
    if (!intake?.preferredTreatmentDate) {
      return Response.json({ error: 'Preferred treatment date is required to book' }, { status: 400 });
    }

    const companyLogin = Deno.env.get('SIMPLYBOOK_COMPANY_LOGIN');
    const adminLogin = Deno.env.get('SIMPLYBOOK_ADMIN_LOGIN');
    const adminPassword = Deno.env.get('SIMPLYBOOK_ADMIN_PASSWORD');

    if (!companyLogin || !adminLogin || !adminPassword) {
      return Response.json({ error: 'SimplyBook credentials not configured' }, { status: 500 });
    }

    // Authenticate
    const userToken = await rpcCall(SB_LOGIN_URL, 'getUserToken', [companyLogin, adminLogin, adminPassword]);
    const sbHeaders = {
      'X-Company-Login': companyLogin,
      'X-User-Token': String(userToken),
      'X-Token': String(userToken),
    };

    // Fetch all services from SimplyBook
    const servicesMap = await rpcCall(SB_ADMIN_URL, 'getEventList', [], sbHeaders);
    // servicesMap is { "id": { id, name, ... }, ... }
    const services = Object.values(servicesMap || {});

    // Fetch all providers
    const providersMap = await rpcCall(SB_ADMIN_URL, 'getUnitList', [], sbHeaders);
    const providers = Object.values(providersMap || {});
    // Use first provider as default
    const defaultProviderId = providers[0]?.id;

    // Parse date/time
    const bookingDate = intake.preferredTreatmentDate; // YYYY-MM-DD
    const bookingTime = (intake.preferredTreatmentTime || '10:00').replace(/[^0-9:]/g, '').padEnd(5, '0');

    // Build client info
    const nameParts = guestName.trim().split(' ');
    const clientData = {
      name: guestName,
      email: guestEmail,
      phone: intake.phone || '',
      firstName: nameParts[0] || guestName,
      lastName: nameParts.slice(1).join(' ') || '.',
    };

    const bookings = [];
    const errors = [];

    for (const treatmentName of intake.selectedTreatments) {
      // Match service by name (case-insensitive partial match)
      const matched = services.find(s =>
        s.name?.toLowerCase().includes(treatmentName.toLowerCase()) ||
        treatmentName.toLowerCase().includes(s.name?.toLowerCase())
      );

      if (!matched) {
        errors.push(`Service not found in SimplyBook: "${treatmentName}"`);
        continue;
      }

      const serviceId = matched.id;

      // Get available providers for this service
      let providerId = defaultProviderId;
      if (intake.preferredTherapist) {
        const pref = providers.find(p =>
          p.name?.toLowerCase().includes(intake.preferredTherapist.toLowerCase())
        );
        if (pref) providerId = pref.id;
      }

      if (!providerId) {
        errors.push(`No provider available for: "${treatmentName}"`);
        continue;
      }

      // Book via SimplyBook admin API
      const sbBooking = await rpcCall(SB_ADMIN_URL, 'addBooking', [{
        event_id: serviceId,
        unit_id: providerId,
        date: bookingDate,
        time: bookingTime,
        client: clientData,
      }], sbHeaders);

      const simplybookBookingId = sbBooking?.id ? String(sbBooking.id) : null;

      // Save to local SpaBooking
      const localBooking = await base44.entities.SpaBooking.create({
        simplybookBookingId,
        simplybookBookingHash: sbBooking?.hash || '',
        clientName: guestName,
        email: guestEmail,
        phone: intake.phone || '',
        serviceName: matched.name,
        service: String(serviceId),
        startAt: `${bookingDate}T${bookingTime}:00`,
        durationMinutes: matched.duration || 60,
        price: parseFloat(matched.price || 0),
        source: 'simplybook',
        status: 'create',
      });

      bookings.push({ ...localBooking, simplybookBookingId });
    }

    return Response.json({
      success: bookings.length > 0,
      bookings,
      errors,
      message: `${bookings.length} booking${bookings.length === 1 ? '' : 's'} created in SimplyBook${errors.length ? `. Warnings: ${errors.join('; ')}` : ''}`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
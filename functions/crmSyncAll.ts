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
  // TODO: Implement actual Cloudbeds sync
  // Use your existing cloudbedsUpcomingReservations function as a base
  // Return array: [{ externalId, firstName, lastName, email, phone, eventType, startAt, endAt, status, title, amount, meta }, ...]
  return [];
}

async function syncSquare(base44, sinceIso) {
  // TODO: Implement actual Square sync
  // Pull customers + appointments
  // Return array of normalized records
  return [];
}

async function syncAcuity(base44, sinceIso) {
  // TODO: Implement actual Acuity sync (historical)
  return [];
}

async function syncSimplyBook(base44, sinceIso) {
  // TODO: Implement actual SimplyBook sync (reconciliation)
  return [];
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
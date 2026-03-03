import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const {
      contactId,
      source,
      externalId,
      eventType,
      startAt,
      endAt,
      status,
      title,
      amount = 0,
      meta = {}
    } = await req.json();

    if (!contactId) {
      return Response.json({ ok: false, error: "contactId required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // Avoid duplicates
    if (source && externalId) {
      const existing = await base44.entities.CrmEvent.filter({
        source,
        externalId
      });
      if (existing.length > 0) {
        return Response.json({ ok: true, event: existing[0], deduped: true });
      }
    }

    const event = await base44.entities.CrmEvent.create({
      contactId,
      source: source || "other",
      externalId: externalId || "",
      eventType: eventType || "other",
      startAt: startAt || nowIso,
      endAt: endAt || null,
      status: status || "",
      title: title || "",
      amount: Number(amount || 0),
      meta: meta || {}
    });

    // Update contact rollups
    const contact = await base44.entities.CrmContact.filter({ id: contactId });
    if (contact.length > 0) {
      const c = contact[0];
      await base44.entities.CrmContact.update(c.id, {
        lastActivityAt: startAt || nowIso,
        totalBookings: Number(c.totalBookings || 0) + 1,
        lifetimeValue: Number(c.lifetimeValue || 0) + Number(amount || 0),
        updatedAt: nowIso
      });
    }

    return Response.json({ ok: true, event });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
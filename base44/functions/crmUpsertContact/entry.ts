import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ ok: false, error: "Admin only" }, { status: 403 });
    }

    const {
      firstName,
      lastName,
      fullName,
      email,
      phone,
      source,
      externalId,
      tags = [],
      marketingOptIn,
      doNotContact
    } = await req.json();

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    const nowIso = new Date().toISOString();

    // Find existing contact by normalized email or phone
    let contact = null;
    if (normalizedEmail) {
      const byEmail = await base44.entities.CrmContact.filter({ normalizedEmail });
      if (byEmail.length > 0) contact = byEmail[0];
    }
    if (!contact && normalizedPhone) {
      const byPhone = await base44.entities.CrmContact.filter({ normalizedPhone });
      if (byPhone.length > 0) contact = byPhone[0];
    }

    const computedFullName =
      (fullName && fullName.trim()) ||
      `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim();

    if (contact) {
      // Merge conservatively
      const mergedTags = Array.from(new Set([...(contact.tags || []), ...(tags || [])]));
      contact = await base44.entities.CrmContact.update(contact.id, {
        firstName: contact.firstName || firstName || "",
        lastName: contact.lastName || lastName || "",
        fullName: contact.fullName || computedFullName || "",
        email: contact.email || email || "",
        phone: contact.phone || phone || "",
        normalizedEmail: contact.normalizedEmail || normalizedEmail || "",
        normalizedPhone: contact.normalizedPhone || normalizedPhone || "",
        tags: mergedTags,
        marketingOptIn:
          typeof marketingOptIn === "boolean" ? marketingOptIn : contact.marketingOptIn,
        doNotContact:
          typeof doNotContact === "boolean" ? doNotContact : contact.doNotContact,
        updatedAt: nowIso
      });
    } else {
      contact = await base44.entities.CrmContact.create({
        firstName: firstName || "",
        lastName: lastName || "",
        fullName: computedFullName || "",
        email: email || "",
        phone: phone || "",
        normalizedEmail,
        normalizedPhone,
        lastActivityAt: nowIso,
        lifetimeValue: 0,
        totalBookings: 0,
        tags: tags || [],
        notes: "",
        marketingOptIn: typeof marketingOptIn === "boolean" ? marketingOptIn : true,
        doNotContact: typeof doNotContact === "boolean" ? doNotContact : false
      });
    }

    // Link identity if source + externalId provided
    if (source && externalId) {
      const existing = await base44.entities.CrmIdentity.filter({
        contactId: contact.id,
        source,
        externalId
      });
      if (existing.length === 0) {
        await base44.entities.CrmIdentity.create({
          contactId: contact.id,
          source,
          externalId
        });
      }
    }

    return Response.json({ ok: true, id: contact.id, contact });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
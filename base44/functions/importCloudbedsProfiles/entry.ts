import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeEmail(e) {
  return (e || '').trim().toLowerCase();
}

function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { profiles } = await req.json();
    if (!profiles || !Array.isArray(profiles)) {
      return Response.json({ error: 'No profiles provided' }, { status: 400 });
    }

    let createdContacts = 0;
    let skipped = 0;
    const errors = [];

    for (const profile of profiles) {
      try {
        // Handle various name formats
        const fullName = (
          profile['Name'] ||
          profile['Full Name'] ||
          profile['Guest Name'] ||
          `${profile['First Name'] || ''} ${profile['Last Name'] || ''}`.trim()
        ).trim();

        const email = (profile['Email'] || profile['Email Address'] || '').trim();
        const phone = (profile['Phone'] || profile['Phone Number'] || profile['Mobile'] || '').trim();

        if (!fullName) {
          skipped++;
          continue;
        }

        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const contactRes = await base44.functions.invoke('crmUpsertContact', {
          firstName,
          lastName,
          fullName,
          email,
          phone,
          normalizedEmail: normalizeEmail(email),
          normalizedPhone: normalizePhone(phone),
          source: 'cloudbeds',
          externalId: profile['Profile ID'] || profile['Guest ID'] || email || fullName,
        });

        if (contactRes.data?.id) {
          createdContacts++;
        }
      } catch (e) {
        errors.push(`${profile['Name'] || profile['Email'] || 'unknown'}: ${e.message}`);
      }
    }

    return Response.json({
      contactsCreated: createdContacts,
      skipped,
      totalRows: profiles.length,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const records = await base44.asServiceRole.entities.SpaBooking.list({ limit: 500 });

    let deleted = 0;
    for (const record of records) {
      await base44.asServiceRole.entities.SpaBooking.delete(record.id);
      deleted++;
    }

    return Response.json({ success: true, deleted });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  } catch { return Response.json({ error: "Forbidden" }, { status: 403 }); }

  try {
    const all = await base44.asServiceRole.entities.SpaBooking.list("-startAt", 500);
    let deleted = 0;
    for (const record of all) {
      await base44.asServiceRole.entities.SpaBooking.delete(record.id);
      deleted++;
    }
    return Response.json({ success: true, deleted });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
});

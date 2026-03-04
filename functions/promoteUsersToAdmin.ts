import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userIds } = await req.json();

  const results = [];
  for (const id of userIds) {
    try {
      await base44.asServiceRole.entities.User.update(id, { role: 'admin' });
      results.push({ id, success: true });
    } catch (e) {
      results.push({ id, success: false, error: e.message });
    }
  }

  return Response.json({ results });
});
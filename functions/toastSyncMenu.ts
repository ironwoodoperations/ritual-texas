import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    return Response.json({ ok: true, message: 'Menu sync placeholder — coming soon' });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
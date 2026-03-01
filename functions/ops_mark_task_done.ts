import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const { taskId } = body || {};
    if (!taskId) throw new Error("Missing taskId");

    const me = await base44.auth.me().catch(() => null);
    const userId = me?.id ?? null;

    await base44.asServiceRole.entities.OpsTask.update(taskId, {
      status: "done",
      completedAt: new Date().toISOString(),
      completedByUserId: userId,
      updated_date: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
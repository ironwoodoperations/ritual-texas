import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().split('T')[0];
    const all = await base44.asServiceRole.entities.DailyChecklist.list();

    let resetCount = 0;
    for (const row of all) {
      if (row.date !== today) {
        const freshItems = (row.items || []).map(item => ({
          label: item.label,
          done: false,
          doneBy: '',
          doneAt: '',
        }));
        await base44.asServiceRole.entities.DailyChecklist.update(row.id, {
          completed: false,
          items: freshItems,
        });
        resetCount++;
      }
    }

    return Response.json({ ok: true, reset: resetCount, today });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function getToastToken() {
  const res = await fetch(Deno.env.get('TOAST_AUTH_URL'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAccessType: 'TOAST_MACHINE_CLIENT',
      clientId: Deno.env.get('TOAST_CLIENT_ID'),
      clientSecret: Deno.env.get('TOAST_CLIENT_SECRET'),
    }),
  });
  if (!res.ok) throw new Error(`Toast auth failed: ${res.status}`);
  const data = await res.json();
  return data.token?.accessToken || data.accessToken;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = await getToastToken();
    const restaurantGuid = Deno.env.get('TOAST_RESTAURANT_GUID');
    const apiBase = Deno.env.get('TOAST_API_BASE');

    // Fetch all menus
    const menusRes = await fetch(`${apiBase}/menus/v2/menus`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantGuid,
      },
    });
    if (!menusRes.ok) throw new Error(`Failed to fetch menus: ${menusRes.status} ${await menusRes.text()}`);
    const menus = await menusRes.json();

    // Find menu groups named "Daily Special" (case-insensitive)
    const items = [];
    for (const menu of (menus || [])) {
      for (const group of (menu.menuGroups || [])) {
        if ((group.name || '').toLowerCase().includes('daily special')) {
          for (const item of (group.menuItems || [])) {
            const price = item.price ?? (item.pricingRules?.[0]?.price) ?? null;
            items.push({
              name: item.name,
              price: price,
              toastGuid: item.guid,
            });
          }
        }
      }
    }

    if (items.length === 0) {
      return Response.json({ ok: false, error: 'No items found in a "Daily Special" menu group on Toast.' });
    }

    // Fetch existing specials to avoid duplicates
    const existing = await base44.asServiceRole.entities.RestaurantDailySpecials.list();
    const existingTitles = new Set((existing || []).map(s => (s.title || '').toLowerCase().trim()));

    let created = 0;
    let skipped = 0;
    for (const item of items) {
      const key = item.name.toLowerCase().trim();
      if (existingTitles.has(key)) {
        skipped++;
        continue;
      }
      await base44.asServiceRole.entities.RestaurantDailySpecials.create({
        title: item.name,
        description: '',
        price: item.price,
        category: 'Lunch',
        isActiveToday: false,
        isArchived: false,
        isSoup: false,
      });
      created++;
    }

    return Response.json({ ok: true, created, skipped, total: items.length });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
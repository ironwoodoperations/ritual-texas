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

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Toast-Restaurant-External-ID': restaurantGuid,
    };

    // Try the Menus API V2 endpoint instead of config endpoint
    const menusRes = await fetch(`${apiBase}/menus/v2/menus`, { headers });
    if (!menusRes.ok) {
      const errText = await menusRes.text();
      throw new Error(`Failed to fetch menus: ${menusRes.status} ${errText}`);
    }
    const menusData = await menusRes.json();
    const menus = Array.isArray(menusData) ? menusData : (menusData.menus || [menusData]);

    // Find menu groups named "Lunch"
    const lunchMenus = [];
    for (const menu of menus) {
      for (const group of (menu.menuGroups || [])) {
        if ((group.name || '').toLowerCase().includes('lunch')) {
          lunchMenus.push({
            menuName: menu.name,
            groupName: group.name,
            items: group.menuItems || [],
            itemCount: (group.menuItems || []).length
          });
        }
      }
    }

    return Response.json({
      ok: true,
      lunchMenusFound: lunchMenus.length,
      data: lunchMenus
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
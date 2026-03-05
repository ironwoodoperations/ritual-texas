import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { getCloudbedsAuth } from './_cloudbedsAuth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const auth = await getCloudbedsAuth(base44);
    return Response.json({
      ok: true,
      hasAccessToken: !!auth.accessToken,
      hasRefreshToken: !!auth.refreshToken,
      hasPropertyId: !!auth.propertyId,
      propertyId: auth.propertyId,
      tokenPreview: auth.accessToken.slice(0, 12) + "...",
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
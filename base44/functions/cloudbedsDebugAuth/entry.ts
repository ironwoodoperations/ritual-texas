import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function readKey(base44, entityName, key) {
  try {
    const ent = base44.asServiceRole.entities[entityName];
    if (!ent) return null;
    const rows = await ent.filter({ key });
    return rows?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function getAnySetting(base44, keys) {
  for (const key of keys) {
    const v =
      (await readKey(base44, "SiteSettings", key)) ??
      (await readKey(base44, "AppSetting", key)) ??
      null;
    if (v) return v;
  }
  return null;
}

async function getCloudbedsAuth(base44) {
  const accessToken = await getAnySetting(base44, [
    "CLOUDBEDS_ACCESS_TOKEN",
    "cloudbeds_access_token",
    "cloudbedsAccessToken",
  ]);

  const refreshToken = await getAnySetting(base44, [
    "CLOUDBEDS_REFRESH_TOKEN",
    "cloudbeds_refresh_token",
    "cloudbedsRefreshToken",
  ]);

  const propertyId =
    (await getAnySetting(base44, [
      "CLOUDBEDS_PROPERTY_ID",
      "cloudbeds_property_id",
      "cloudbedsPropertyId",
    ])) ||
    Deno.env.get("CLOUDBEDS_PROPERTY_ID") ||
    null;

  return { accessToken, refreshToken, propertyId };
}

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
      tokenPreview: auth.accessToken ? auth.accessToken.slice(0, 12) + "..." : null,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
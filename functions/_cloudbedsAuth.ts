// Reads Cloudbeds tokens from either SiteSettings OR AppSetting and supports multiple key names.

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

  const expiresAt = await getAnySetting(base44, [
    "CLOUDBEDS_EXPIRES_AT",
    "cloudbeds_expires_at",
    "cloudbedsExpiresAt",
  ]);

  const propertyId =
    (await getAnySetting(base44, [
      "CLOUDBEDS_PROPERTY_ID",
      "cloudbeds_property_id",
      "cloudbedsPropertyId",
    ])) ||
    Deno.env.get("CLOUDBEDS_PROPERTY_ID") ||
    null;

  if (!propertyId) throw new Error("Cloudbeds property ID not configured");
  if (!accessToken)
    throw new Error("Cloudbeds not connected. Please complete OAuth setup first in Admin → Cloudbeds.");

  return { accessToken, refreshToken, expiresAt, propertyId };
}

export { getCloudbedsAuth };
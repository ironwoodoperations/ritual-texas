import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function upsertSetting(base44, key, value, description) {
  const existing = await base44.asServiceRole.entities.SiteSettings.filter({ key });
  if (existing.length > 0) {
    await base44.asServiceRole.entities.SiteSettings.update(existing[0].id, { value, description });
  } else {
    await base44.asServiceRole.entities.SiteSettings.create({ key, value, description });
  }
}

async function getSetting(base44, key) {
  try {
    const rows = await base44.asServiceRole.entities.SiteSettings.filter({ key });
    if (rows?.[0]?.value) return rows[0].value;
    const rows2 = await base44.asServiceRole.entities.AppSetting.filter({ key });
    return rows2?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("CLOUDBEDS_CLIENT_ID");
    const clientSecret = Deno.env.get("CLOUDBEDS_CLIENT_SECRET");
    const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://ritualtexas.com";
    const redirectUri = `${publicBaseUrl}/functions/cloudbedsOAuthCallback`;

    const refreshToken =
      (await getSetting(base44, "CLOUDBEDS_REFRESH_TOKEN")) ||
      (await getSetting(base44, "cloudbeds_refresh_token"));

    if (!refreshToken) {
      return Response.json({ success: false, error: "No refresh token stored. Please re-authorize Cloudbeds via Admin → Cloudbeds." }, { status: 400 });
    }

    const tokenResponse = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        refresh_token: refreshToken,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Cloudbeds token refresh failed:', JSON.stringify(tokenData));
      return Response.json({ success: false, error: 'Token refresh failed', details: tokenData }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    await upsertSetting(base44, 'CLOUDBEDS_ACCESS_TOKEN', tokenData.access_token, `Cloudbeds access token - refreshed at ${new Date().toISOString()}, expires ${expiresAt}`);
    await upsertSetting(base44, 'CLOUDBEDS_EXPIRES_AT', expiresAt, 'Cloudbeds token expiry');

    if (tokenData.refresh_token) {
      await upsertSetting(base44, 'CLOUDBEDS_REFRESH_TOKEN', tokenData.refresh_token, 'Cloudbeds refresh token');
    }

    console.log(`Cloudbeds token refreshed successfully. Expires: ${expiresAt}`);
    return Response.json({ success: true, expiresAt });

  } catch (error) {
    console.error('refreshCloudbedsToken error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
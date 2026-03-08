import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("CLOUDBEDS_CLIENT_ID");
    const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://ritualtexas.com";
    const redirectUri = `${publicBaseUrl}/functions/cloudbedsOAuthCallback`;

    if (!clientId) {
      return Response.json({ error: "CLOUDBEDS_CLIENT_ID not configured" }, { status: 500 });
    }

    const state = crypto.randomUUID();

    try {
      await base44.asServiceRole.entities.SiteSettings.create({
        key: `OAUTH_STATE_${state}`,
        value: new Date().toISOString(),
        description: "OAuth state for CSRF protection"
      });
    } catch (e) {
      console.error('Failed to store state:', e.message);
    }

    const authUrl = `https://hotels.cloudbeds.com/api/v1.1/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

    const url = new URL(req.url);
    if (url.searchParams.get('debug') === 'true') {
      return Response.json({ authUrl, redirectUri, message: "Click authUrl to authorize" });
    }

    return Response.redirect(authUrl, 302);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
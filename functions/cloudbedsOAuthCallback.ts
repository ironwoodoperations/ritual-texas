import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`<!DOCTYPE html><html><body><h1>Authorization Failed</h1><p>${error}</p></body></html>`, {
        status: 400, headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code || !state) {
      return Response.json({ error: 'Missing code or state' }, { status: 400 });
    }

    // Verify state
    const stateRecords = await base44.asServiceRole.entities.SiteSettings.filter({ key: `OAUTH_STATE_${state}` });
    if (stateRecords.length === 0) {
      return Response.json({ error: 'Invalid state parameter' }, { status: 400 });
    }
    await base44.asServiceRole.entities.SiteSettings.delete(stateRecords[0].id);

    const clientId = Deno.env.get("CLOUDBEDS_CLIENT_ID");
    const clientSecret = Deno.env.get("CLOUDBEDS_CLIENT_SECRET");
    const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://ritualtexas.com";
    const redirectUri = `${publicBaseUrl}/functions/cloudbedsOAuthCallback`;

    const tokenResponse = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return Response.json({ error: 'Failed to obtain access token', details: tokenData }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    // Upsert access token
    const existingToken = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_ACCESS_TOKEN' });
    if (existingToken.length > 0) {
      await base44.asServiceRole.entities.SiteSettings.update(existingToken[0].id, { value: tokenData.access_token, description: `Expires ${expiresAt}` });
    } else {
      await base44.asServiceRole.entities.SiteSettings.create({ key: 'CLOUDBEDS_ACCESS_TOKEN', value: tokenData.access_token, description: `Expires ${expiresAt}` });
    }

    // Upsert expiry
    const existingExpiry = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_TOKEN_EXPIRES_AT' });
    if (existingExpiry.length > 0) {
      await base44.asServiceRole.entities.SiteSettings.update(existingExpiry[0].id, { value: expiresAt });
    } else {
      await base44.asServiceRole.entities.SiteSettings.create({ key: 'CLOUDBEDS_TOKEN_EXPIRES_AT', value: expiresAt, description: 'Cloudbeds token expiry timestamp' });
    }

    // Upsert refresh token
    if (tokenData.refresh_token) {
      const existingRefresh = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_REFRESH_TOKEN' });
      if (existingRefresh.length > 0) {
        await base44.asServiceRole.entities.SiteSettings.update(existingRefresh[0].id, { value: tokenData.refresh_token });
      } else {
        await base44.asServiceRole.entities.SiteSettings.create({ key: 'CLOUDBEDS_REFRESH_TOKEN', value: tokenData.refresh_token, description: 'Cloudbeds refresh token' });
      }
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Cloudbeds Connected</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h1 style="color:green;">✅ Cloudbeds Connected!</h1>
          <p>Token stored. Expires: ${expiresAt}</p>
          <a href="/admin-cloudbeds" style="color:blue;">Return to Admin</a>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
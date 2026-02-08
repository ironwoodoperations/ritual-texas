import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <a href="/">Return to Home</a>
          </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    if (!code || !state) {
      return Response.json({ error: 'Missing code or state' }, { status: 400 });
    }
    
    // Verify state to prevent CSRF
    const stateRecords = await base44.asServiceRole.entities.SiteSettings.filter({ 
      key: `OAUTH_STATE_${state}` 
    });
    
    if (stateRecords.length === 0) {
      return Response.json({ error: 'Invalid state parameter' }, { status: 400 });
    }
    
    // Delete used state
    await base44.asServiceRole.entities.SiteSettings.delete(stateRecords[0].id);
    
    // Exchange code for access token
    // Using rotated Client_Secret - 2026-02-08
    const clientId = Deno.env.get("Client_ID");
    const clientSecret = Deno.env.get("Client_Secret");
    const redirectUri = "https://hotel-ritual-experience-automation-a6e982ce.base44.app/functions/cloudbedsOAuthCallback";
    
    const tokenResponse = await fetch('https://hotels.cloudbeds.com/api/v1.1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
    
    // Store access token and refresh token
    const existingToken = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_ACCESS_TOKEN' });
    if (existingToken.length > 0) {
      await base44.asServiceRole.entities.SiteSettings.update(existingToken[0].id, {
        value: tokenData.access_token,
        description: `Cloudbeds access token - expires ${new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()}`
      });
    } else {
      await base44.asServiceRole.entities.SiteSettings.create({
        key: 'CLOUDBEDS_ACCESS_TOKEN',
        value: tokenData.access_token,
        description: `Cloudbeds access token - expires ${new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()}`
      });
    }
    
    if (tokenData.refresh_token) {
      const existingRefresh = await base44.asServiceRole.entities.SiteSettings.filter({ key: 'CLOUDBEDS_REFRESH_TOKEN' });
      if (existingRefresh.length > 0) {
        await base44.asServiceRole.entities.SiteSettings.update(existingRefresh[0].id, {
          value: tokenData.refresh_token,
          description: 'Cloudbeds refresh token'
        });
      } else {
        await base44.asServiceRole.entities.SiteSettings.create({
          key: 'CLOUDBEDS_REFRESH_TOKEN',
          value: tokenData.refresh_token,
          description: 'Cloudbeds refresh token'
        });
      }
    }
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <body>
          <h1>Authorization Successful!</h1>
          <p>Cloudbeds has been connected successfully.</p>
          <a href="/admin-dashboard">Return to Admin Dashboard</a>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
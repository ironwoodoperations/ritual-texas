import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("Client_ID");
    const redirectUri = "https://hotel-ritual-experience-automation-a6e982ce.base44.app/functions/cloudbedsOAuthCallback";
    
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();
    
    // Store state in session or database for verification in callback
    await base44.asServiceRole.entities.SiteSettings.create({
      key: `OAUTH_STATE_${state}`,
      value: new Date().toISOString(),
      description: "OAuth state for CSRF protection"
    });
    
    const authUrl = `https://hotels.cloudbeds.com/api/v1.1/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    // Redirect directly to Cloudbeds authorization
    return Response.redirect(authUrl, 302);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("Client_ID");
    const redirectUri = "https://hotel-ritual-experience-automation-a6e982ce.base44.app/functions/cloudbedsOAuthCallback";
    
    if (!clientId) {
      return Response.json({ 
        error: "Client_ID not configured",
        redirectUri: redirectUri
      }, { status: 500 });
    }
    
    // Generate random state for CSRF protection
    const state = crypto.randomUUID();
    
    // Store state in session or database for verification in callback
    try {
      await base44.asServiceRole.entities.SiteSettings.create({
        key: `OAUTH_STATE_${state}`,
        value: new Date().toISOString(),
        description: "OAuth state for CSRF protection"
      });
    } catch (stateError) {
      // If state storage fails, continue anyway (less secure but functional)
      console.error('Failed to store state:', stateError.message);
    }
    
    const authUrl = `https://hotels.cloudbeds.com/api/v1.1/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    // Debug output
    console.log('Redirecting to:', authUrl);
    
    // Check if debugging mode
    const url = new URL(req.url);
    if (url.searchParams.get('debug') === 'true') {
      return Response.json({ 
        authUrl: authUrl,
        message: "Manual redirect needed - click the authUrl"
      });
    }
    
    // Attempt redirect with explicit headers
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl,
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain'
      }
    });
  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack,
      clientId: Deno.env.get("Client_ID") ? "SET" : "NOT SET"
    }, { status: 500 });
  }
});
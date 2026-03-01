import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clientId = Deno.env.get('TOAST_CLIENT_ID');
    const clientSecret = Deno.env.get('TOAST_CLIENT_SECRET');
    const authUrl = Deno.env.get('TOAST_AUTH_URL');

    const basic = btoa(`${clientId}:${clientSecret}`);

    const res = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userAccessType: 'TOAST_MACHINE_CLIENT', grantType: 'client_credentials' }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return Response.json({ ok: false, error: `Toast auth failed: ${res.status} ${txt}` }, { status: 400 });
    }

    return Response.json({ ok: true, message: 'Toast connection successful' });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});
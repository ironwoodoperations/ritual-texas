import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function mustEnv(k) {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret: ${k}`);
  return v;
}

async function getToastToken() {
  const clientId = mustEnv("TOAST_CLIENT_ID");
  const clientSecret = mustEnv("TOAST_CLIENT_SECRET");
  const authUrl = mustEnv("TOAST_AUTH_URL");

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAccessType: "TOAST_MACHINE_CLIENT", clientId, clientSecret }),
  });

  if (!res.ok) throw new Error(`Toast auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const token = data?.token?.accessToken || data?.access_token || data?.accessToken;
  if (!token) throw new Error(`No token in auth response`);
  return token;
}

Deno.serve(async (req) => {
  createClientFromRequest(req);
  try {
    const token = await getToastToken();
    return Response.json({
      ok: true,
      message: "Toast auth OK",
      tokenPreview: token.slice(0, 12) + "...",
      apiBase: mustEnv("TOAST_API_BASE"),
      restaurantGuid: mustEnv("TOAST_RESTAURANT_GUID"),
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
});
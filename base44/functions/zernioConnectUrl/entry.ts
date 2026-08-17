import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// Mint a per-platform authorization URL, so a platform is connected by
// authorizing it rather than by pasting an account id into a form.
//
// Deno isolation: no cross-function imports — every helper is inlined.
// ZERNIO_BASE and the Bearer-header pattern below are duplicated verbatim in
// zernioPublishPost/entry.ts, zernioSyncStatus/entry.ts and
// zernioListAccounts/entry.ts. On Base44 each function is its own isolated
// environment, so that duplication is structural rather than an oversight;
// do not extract a shared module.

const ZERNIO_BASE = "https://zernio.com/api/v1";

// Where the vendor returns the browser once the grant completes. This needs
// no pre-registration with the vendor: their OAuth redirect_uri is their own
// callback, and this value rides inside the `state` they generate, which
// they forward to afterwards. Declared once, here.
const REDIRECT_URL = "https://ritualtexas.com/AdminSocial?connected=true";

// Byte-identical to the platform strings we store and the vendor accepts —
// there is no translation layer in either direction.
const ALLOWED_PLATFORMS = ["facebook", "instagram", "tiktok"];

// Map an upstream status class onto a message that is safe to show the
// client. Same shape as the helper in zernioPublishPost, inlined because
// Base44 functions cannot import from one another; the wording is adapted
// for the authorization path. Never include the vendor's name, the status
// code, or any part of the upstream body — those go to the log.
function clientMessageForStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "Ironwood rejected the request. Check the connection settings and try again.";
  }
  if (status === 404) {
    return "Ironwood does not recognise that platform for this profile.";
  }
  if (status === 429) {
    return "Too many requests. Try again in a few minutes.";
  }
  if (status >= 500) {
    return "Ironwood is temporarily unavailable. Try again shortly.";
  }
  return "Could not start authorization. Please try again.";
}

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: true, message: "Admin only" }, { status: 403 });
    }

    // 1. Allowlist BEFORE the value ever reaches a URL path segment.
    const body = await req.json();
    const platform = String(body?.platform || "");
    if (!ALLOWED_PLATFORMS.includes(platform)) {
      return Response.json(
        { error: true, message: "That platform is not supported." },
        { status: 400 },
      );
    }

    // 2. Profile.
    const settingsList = await base44.asServiceRole.entities.SocialSettings.list();
    const settings = Array.isArray(settingsList) ? settingsList[0] : null;
    const profileId = settings?.zernioProfileId || "";
    if (!profileId) {
      return Response.json(
        { error: true, message: "Social connection is not configured yet." },
        { status: 400 },
      );
    }

    // 3. URL + searchParams so both values are encoded. No request body.
    const url = new URL(`${ZERNIO_BASE}/connect/${platform}`);
    url.searchParams.set("profileId", profileId);
    url.searchParams.set("redirectUrl", REDIRECT_URL);

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${Deno.env.get("ZERNIO_API_KEY") || ""}` },
    });
    const text = await resp.text();

    if (!resp.ok) {
      // Full upstream detail is logged here and nowhere else.
      console.error(`[zernioConnectUrl] upstream ${resp.status} for ${platform}:`, text);
      return Response.json(
        { error: true, message: clientMessageForStatus(resp.status) },
        { status: resp.status },
      );
    }

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    // Production returns `authUrl`. The `url` fallback costs one || and
    // covers the name the field was once uncertain to have.
    const authUrl = data?.authUrl || data?.url || "";
    console.log(
      `[zernioConnectUrl] ${platform} authorization url came from key:`,
      data?.authUrl ? "authUrl" : data?.url ? "url" : "(none)",
    );

    // A 2xx carrying no url had no defined behavior anywhere. Define it here.
    if (!authUrl) {
      console.error("[zernioConnectUrl] 2xx with no authorization url:", text);
      return Response.json(
        { error: true, message: "Could not start authorization. Please try again." },
        { status: 502 },
      );
    }

    // NEVER cache this url, and never persist it. The `state` embedded in it
    // carries an expiry roughly forty minutes out, so a cached url keeps
    // working right up until it silently doesn't — an intermittent failure
    // that only reproduces after someone has been away from their desk.
    // Mint a fresh one on every Connect click.
    //
    // The upstream response also carries a top-level `state` field. It is
    // already embedded in authUrl; do not store it, return it, or forward it.
    return Response.json({ authUrl });
  } catch (e) {
    console.error("[zernioConnectUrl] unhandled:", String((e as any)?.stack || e));
    return Response.json(
      { error: true, message: "Could not start authorization. Please try again." },
      { status: 500 },
    );
  }
});

import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// List the social accounts authorized against our Zernio profile, so the
// connections panel can report what is actually connected instead of
// counting whatever has been typed into its own text inputs.
//
// Deno isolation: no cross-function imports — every helper is inlined.
// ZERNIO_BASE and the Bearer-header pattern below are duplicated verbatim in
// zernioPublishPost/entry.ts and zernioSyncStatus/entry.ts. On Base44 each
// function is its own isolated environment, so that duplication is
// structural rather than an oversight; do not extract a shared module.

const ZERNIO_BASE = "https://zernio.com/api/v1";

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: true, message: "Admin only" }, { status: 403 });
    }

    // 1. Profile. This function is READ-ONLY — it never writes SocialSettings.
    //    Persisting account ids belongs with the Connect flow, where hand
    //    entry goes away; writing here would also have to spread the whole
    //    settings record back through update(), which is what makes the
    //    required: ["zernioProfileId"] constraint fragile.
    const settingsList = await base44.asServiceRole.entities.SocialSettings.list();
    const settings = Array.isArray(settingsList) ? settingsList[0] : null;
    const profileId = settings?.zernioProfileId || "";
    if (!profileId) {
      return Response.json(
        { error: true, message: "Social connection is not configured yet." },
        { status: 400 },
      );
    }

    // 2. Ask which accounts are authorized against that profile.
    const resp = await fetch(
      `${ZERNIO_BASE}/accounts?profileId=${encodeURIComponent(profileId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${Deno.env.get("ZERNIO_API_KEY") || ""}` },
      },
    );
    const text = await resp.text();

    if (!resp.ok) {
      // Full upstream detail is logged here and nowhere else. The response
      // message names no vendor and carries no upstream text — the client
      // renders these messages to the hotel owner.
      console.error(`[zernioListAccounts] upstream ${resp.status}:`, text);
      return Response.json(
        { error: true, message: "Could not reach the social connection service." },
        { status: resp.status },
      );
    }

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[zernioListAccounts] upstream 2xx with unparseable body:", text);
      return Response.json(
        { error: true, message: "Could not read the connection status." },
        { status: 502 },
      );
    }

    // 3. Normalize.
    //
    //    There is NO per-account status field. Presence in accounts[] is
    //    connected; absence is not-connected. Zernio returns no status,
    //    connected, expired, needsReauth or revoked anywhere, so a revoked
    //    account is indistinguishable from one that was never connected.
    //    Do not invent an "expired" state.
    //
    //    No platform translation layer either: Zernio uses facebook,
    //    instagram and tiktok — byte-identical to our own enum values.
    const raw = Array.isArray(data?.accounts) ? data.accounts : [];
    const accounts = raw.map((a: any) => ({
      platform: a?.platform,
      // Zernio's id field is `_id` here, but the SAME value is called
      // `accountId` inside platforms[] on a post payload. Normalizing on the
      // way out means our own code only ever knows one name for it.
      accountId: a?._id,
      name: a?.name,
      username: a?.username,
      displayName: a?.displayName,
      followersCount: a?.followersCount,
      profilePicture: a?.profilePicture,
    }));

    // Distinct platforms, not account count: the badge reads "N of 3", and
    // two accounts on one platform must not read as two of three connected.
    const connectedPlatforms = Array.from(
      new Set(accounts.map((a: any) => a.platform).filter(Boolean)),
    );

    return Response.json({
      accounts,
      connectedPlatforms,
      connectedCount: connectedPlatforms.length,
    });
  } catch (e) {
    console.error("[zernioListAccounts] unhandled:", String((e as any)?.stack || e));
    return Response.json(
      { error: true, message: "Could not load connection status." },
      { status: 500 },
    );
  }
});

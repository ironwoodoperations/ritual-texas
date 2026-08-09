import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// Publish (or schedule) a single approved SocialPost through Zernio.
// Deno isolation: no cross-function imports — every helper is inlined.

const ZERNIO_BASE = "https://zernio.com/api/v1";

function zernioHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${Deno.env.get("ZERNIO_API_KEY") || ""}`,
    "Content-Type": "application/json",
  };
}

// Derive a filename from an image URL (strip query string).
function filenameFromUrl(url: string): string {
  const last = String(url).split("/").pop() || "";
  const clean = last.split("?")[0];
  return clean || "upload";
}

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: true, message: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { postId } = body || {};
    if (!postId) {
      return Response.json({ error: true, message: "postId required" }, { status: 400 });
    }

    // 2. Read the post.
    const matches = await base44.asServiceRole.entities.SocialPost.filter({ id: postId });
    const post = Array.isArray(matches) ? matches[0] : null;
    if (!post) {
      return Response.json({ error: true, message: "Post not found" }, { status: 404 });
    }

    // 3. Drafts must never reach Zernio.
    if (post.status !== "approved") {
      return Response.json(
        { error: true, message: `Post must be 'approved' to schedule (is '${post.status}')` },
        { status: 400 },
      );
    }

    // 4. Settings / Zernio profile.
    const settingsList = await base44.asServiceRole.entities.SocialSettings.list();
    const settings = Array.isArray(settingsList) ? settingsList[0] : null;
    if (!settings?.zernioProfileId) {
      return Response.json({ error: true, message: "Zernio not configured" }, { status: 400 });
    }

    // 5. Resolve the account id for this platform. Zernio uses these exact
    //    three platform strings — there is nothing to map.
    let accountId = "";
    if (post.platform === "instagram") accountId = settings.instagramAccountId || "";
    else if (post.platform === "facebook") accountId = settings.facebookAccountId || "";
    else if (post.platform === "tiktok") accountId = settings.tiktokAccountId || "";
    if (!accountId) {
      return Response.json(
        { error: true, message: `${post.platform} not connected in Zernio` },
        { status: 400 },
      );
    }

    // 6. Instagram/TikTok cannot publish text-only.
    const imageUrls: string[] = Array.isArray(post.imageUrls) ? post.imageUrls : [];
    if ((post.platform === "instagram" || post.platform === "tiktok") && imageUrls.length === 0) {
      return Response.json(
        { error: true, message: `${post.platform} requires a photo` },
        { status: 400 },
      );
    }

    // 7. Media — only if there are images. Any failure here records a
    //    reason but does NOT block publishing text-only.
    const mediaItems: Array<{ url: string; type: string }> = [];
    let mediaFailureReason: string | null = null;
    if (imageUrls.length > 0) {
      try {
        for (const imageUrl of imageUrls) {
          // a. fetch bytes + content-type
          const imgResp = await fetch(imageUrl);
          if (!imgResp.ok) {
            throw new Error(`fetch image ${imgResp.status}`);
          }
          const contentType = imgResp.headers.get("content-type") || "application/octet-stream";
          const bytes = new Uint8Array(await imgResp.arrayBuffer());
          const filename = filenameFromUrl(imageUrl);

          // b. presign. Send BOTH casings of both keys — Zernio needs
          //    lowercase `filename`/`contentType`; wrong casing fails the
          //    media attach silently. Unknown fields are ignored.
          const presignResp = await fetch(`${ZERNIO_BASE}/media/presign`, {
            method: "POST",
            headers: zernioHeaders(),
            body: JSON.stringify({
              filename,
              contentType,
              fileName: filename,
              fileType: contentType,
            }),
          });
          if (!presignResp.ok) {
            const t = await presignResp.text();
            throw new Error(`presign ${presignResp.status}: ${t.slice(0, 200)}`);
          }
          const presign = await presignResp.json();

          // c. PUT raw bytes to the returned uploadUrl.
          const putResp = await fetch(presign.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: bytes,
          });
          if (!putResp.ok) {
            throw new Error(`upload ${putResp.status}`);
          }

          // d. collect the public url.
          mediaItems.push({ url: presign.publicUrl, type: post.mediaType || "image" });
        }
      } catch (mediaErr: any) {
        // Media failed — continue and publish text-only.
        mediaFailureReason = `Media upload failed: ${String(mediaErr?.message || mediaErr)}`.slice(0, 300);
        mediaItems.length = 0;
      }
    }

    // 8. Publish. scheduledFor is passed through VERBATIM — it is already a
    //    naive local wall-time string. No new Date(), no toISOString().
    const content = post.content + (post.hashtags ? "\n\n" + post.hashtags : "");
    const publishBody: Record<string, any> = {
      content,
      platforms: [{ platform: post.platform, accountId }],
    };
    if (mediaItems.length > 0) {
      publishBody.mediaItems = mediaItems;
    }
    const publishNow = !post.scheduledFor;
    if (publishNow) {
      publishBody.publishNow = true;
    } else {
      publishBody.scheduledFor = post.scheduledFor;
      publishBody.timezone = post.timezone || "America/Chicago";
    }

    const pubResp = await fetch(`${ZERNIO_BASE}/posts`, {
      method: "POST",
      headers: zernioHeaders(),
      body: JSON.stringify(publishBody),
    });
    const pubText = await pubResp.text();
    let pubJson: any = null;
    try {
      pubJson = JSON.parse(pubText);
    } catch {
      pubJson = null;
    }

    // 9. Write back.
    if (!pubResp.ok) {
      // Never tunnel a non-2xx as a 200 — pass the upstream status through.
      const upstream = `Zernio ${pubResp.status}: ${pubText.slice(0, 300)}`;
      const failureReason = mediaFailureReason ? `${mediaFailureReason} | ${upstream}` : upstream;
      await base44.asServiceRole.entities.SocialPost.update(post.id, {
        status: "failed",
        failureReason,
      });
      return Response.json(
        { error: true, message: upstream, post: { ...post, status: "failed", failureReason } },
        { status: pubResp.status },
      );
    }

    const patch: Record<string, any> = {
      status: publishNow ? "published" : "scheduled",
      zernioPostId: pubJson?._id,
      zernioStatus: pubJson?.status,
      failureReason: mediaFailureReason || null,
    };
    if (publishNow) {
      // publishedAt sourced from the response only (no Date() here).
      const pubAt = pubJson?.publishedAt || pubJson?.published_at;
      if (pubAt) patch.publishedAt = pubAt;
    }

    await base44.asServiceRole.entities.SocialPost.update(post.id, patch);

    // 10. Return the updated post.
    return Response.json({ ...post, ...patch });
  } catch (e) {
    return Response.json({ error: true, message: String(e) }, { status: 500 });
  }
});

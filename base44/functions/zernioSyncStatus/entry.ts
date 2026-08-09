import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

// Poll Zernio for the current status of every scheduled post and reconcile
// our records. Deno isolation: no cross-function imports.

const ZERNIO_BASE = "https://zernio.com/api/v1";

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: true, message: "Admin only" }, { status: 403 });
    }

    const apiKey = Deno.env.get("ZERNIO_API_KEY") || "";

    // 1. Scheduled posts that have a Zernio id.
    const scheduled = await base44.asServiceRole.entities.SocialPost.filter({ status: "scheduled" });
    const posts = (Array.isArray(scheduled) ? scheduled : []).filter((p: any) => p.zernioPostId);

    const counts = { published: 0, failed: 0, partial: 0, unchanged: 0, errors: 0 };

    for (const post of posts) {
      try {
        // 2. Fetch the current Zernio status.
        const resp = await fetch(`${ZERNIO_BASE}/posts/${post.zernioPostId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!resp.ok) {
          counts.errors += 1;
          continue;
        }
        const data = await resp.json();
        const status = data?.status;

        // 3. Map Zernio status onto ours.
        if (status === "published") {
          const patch: Record<string, any> = { status: "published" };
          // publishedAt sourced from the response only (no Date() here).
          const pubAt = data?.publishedAt || data?.published_at;
          if (pubAt) patch.publishedAt = pubAt;
          await base44.asServiceRole.entities.SocialPost.update(post.id, patch);
          counts.published += 1;
        } else if (status === "failed") {
          await base44.asServiceRole.entities.SocialPost.update(post.id, {
            status: "failed",
            failureReason: String(data?.failureReason || data?.message || "Zernio reported failed").slice(0, 300),
          });
          counts.failed += 1;
        } else if (status === "partial") {
          await base44.asServiceRole.entities.SocialPost.update(post.id, {
            status: "failed",
            failureReason: "partial publish",
          });
          counts.partial += 1;
        } else {
          // Anything else — leave unchanged.
          counts.unchanged += 1;
        }
      } catch {
        // One bad post must not abort the sweep.
        counts.errors += 1;
      }
    }

    return Response.json({ checked: posts.length, ...counts });
  } catch (e) {
    return Response.json({ error: true, message: String(e) }, { status: 500 });
  }
});

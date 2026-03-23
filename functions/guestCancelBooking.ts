import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

async function sbRPC(url: string, method: string, params: any[], headers: Record<string, string> = {}) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await resp.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`SimplyBook non-JSON response for "${method}": ${text.slice(0, 300)}`);
  }
  if (!resp.ok) {
    throw new Error(`SimplyBook HTTP ${resp.status} for "${method}": ${text.slice(0, 300)}`);
  }
  if (json?.error) {
    throw new Error(`SimplyBook RPC error for "${method}": ${JSON.stringify(json.error)}`);
  }
  return json?.result ?? null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const body = await req.json();
    const bookingId = String(body.bookingId || "").trim();

    if (!bookingId) {
      return Response.json({ error: "bookingId required" }, { status: 400 });
    }

    const company = Deno.env.get("SIMPLYBOOK_COMPANY_LOGIN") || "";
    const userLogin = Deno.env.get("SIMPLYBOOK_USER_LOGIN") || "";
    const userPass = Deno.env.get("SIMPLYBOOK_USER_PASSWORD") || "";
    const secretKey = Deno.env.get("SIMPLYBOOK_SECRET_KEY") || "";

    if (!company || !userLogin || !userPass || !secretKey) {
      return Response.json({ error: "SimplyBook admin credentials not configured" }, { status: 500 });
    }

    const LOGIN_URL = "https://user-api.simplybook.me/login";
    const ADMIN_URL = "https://user-api.simplybook.me/admin/";

    // Admin token required for cancellation
    const adminToken = await sbRPC(LOGIN_URL, "getUserToken", [company, userLogin, userPass, secretKey]);
    if (!adminToken || typeof adminToken !== "string") {
      return Response.json({ error: "SimplyBook admin auth failed" }, { status: 500 });
    }

    const adminHeaders = {
      "X-Company-Login": company,
      "X-Token": adminToken,
      "X-User-Token": adminToken,
    };

    // Try cancelBooking method
    let cancelResult: any = null;
    let cancelError: string | null = null;

    // Try multiple method signatures that SimplyBook may support
    const cancelMethods = [
      { method: "cancelBooking", params: [Number(bookingId)] },
      { method: "cancelBooking", params: [bookingId] },
      { method: "setBookingStatus", params: [Number(bookingId), "cancelled"] },
    ];

    for (const attempt of cancelMethods) {
      try {
        cancelResult = await sbRPC(ADMIN_URL, attempt.method, attempt.params, adminHeaders);
        cancelError = null;
        break;
      } catch (e: any) {
        cancelError = e.message;
        // If the method exists but failed for a business reason, don't try alternatives
        if (!e.message.includes("Method not found") && !e.message.includes("not found")) {
          break;
        }
      }
    }

    if (cancelError) {
      return Response.json({
        success: false,
        error: `Cancellation failed: ${cancelError}`,
        bookingId,
      }, { status: 500 });
    }

    // Update local SpaBooking record
    try {
      const existing = await base44.asServiceRole.entities.SpaBooking.filter({ simplybookBookingId: bookingId });
      if (existing?.length) {
        await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, {
          status: "cancelled",
        });
      }
    } catch {
      // Non-fatal
    }

    return Response.json({
      success: true,
      bookingId,
      message: "Booking cancelled successfully",
      cancelResult,
    });
  } catch (e: any) {
    console.error("guestCancelBooking error:", e);
    return Response.json({ error: e.message || "Cancellation failed" }, { status: 500 });
  }
});

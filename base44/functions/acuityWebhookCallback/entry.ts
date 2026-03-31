import { createClientFromRequest } from "npm:@base44/sdk@0.8.21";

const ACUITY_BASE = "https://acuityscheduling.com/api/v1";

function acuityAuth(): string {
  const userId = Deno.env.get("ACUITY_USER_ID") || "";
  const apiKey = Deno.env.get("ACUITY_API_KEY") || "";
  return "Basic " + btoa(userId + ":" + apiKey);
}

async function acuityGet(path: string): Promise<any> {
  const resp = await fetch(`${ACUITY_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: acuityAuth(),
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Acuity GET ${path} failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json();
}

Deno.serve(async (req: Request): Promise<Response> => {
  const base44 = createClientFromRequest(req);

  try {
    // Acuity sends application/x-www-form-urlencoded POST
    const rawBody = await req.text();
    let payload: Record<string, string> = {};
    try {
      // Try URL-encoded first (standard Acuity webhook format)
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    } catch {
      // Fallback to JSON
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = {};
      }
    }

    const action = payload.action || "unknown"; // "scheduled" | "rescheduled" | "canceled"
    const appointmentId = payload.id || "";
    const calendarID = payload.calendarID || "";
    const appointmentTypeID = payload.appointmentTypeID || "";

    if (!appointmentId) {
      return Response.json(
        { received: true, warning: "No appointment id in payload", payload },
        { status: 200 }
      );
    }

    // Fetch full appointment details from Acuity
    const appointment = await acuityGet(`/appointments/${appointmentId}`);

    // Map Acuity action to our status
    let status: string;
    switch (action) {
      case "scheduled":
        status = "confirmed";
        break;
      case "rescheduled":
        status = "confirmed";
        break;
      case "canceled":
        status = "cancel";
        break;
      default:
        status = action;
    }

    const guestName = [appointment.firstName || "", appointment.lastName || ""].filter(Boolean).join(" ");

    const spaBookingPayload = {
      source: "acuity",
      simplybookBookingId: String(appointmentId), // keep field name for backward compat
      status,
      serviceName: appointment.type || "",
      service: appointment.appointmentTypeID ? String(appointment.appointmentTypeID) : "",
      staffName: appointment.calendarName || appointment.calendar || "",
      staff: appointment.calendarID ? String(appointment.calendarID) : "",
      clientName: guestName,
      startAt: appointment.datetime || "",
      durationMinutes: Number(appointment.duration || 0),
      price: Number(appointment.price || appointment.priceSold || 0),
      paid: Boolean(appointment.paid === "yes" || appointment.paid === true),
      email: appointment.email || "",
      phone: appointment.phone || "",
      raw: {
        callbackPayload: payload,
        appointment,
      },
      createdAt: new Date().toISOString(),
    };

    // Upsert into SpaBooking
    let upsertAction = "created";
    const existing = await base44.asServiceRole.entities.SpaBooking.filter({
      simplybookBookingId: String(appointmentId),
    });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.SpaBooking.update(existing[0].id, spaBookingPayload);
      upsertAction = "updated";
    } else {
      await base44.asServiceRole.entities.SpaBooking.create(spaBookingPayload);
    }

    return Response.json(
      {
        received: true,
        action: upsertAction,
        acuityAppointmentId: appointmentId,
        status,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("acuityWebhookCallback error:", err);
    return Response.json(
      { received: true, error: String(err?.message || err) },
      { status: 200 } // Return 200 to prevent Acuity retries on processing errors
    );
  }
});

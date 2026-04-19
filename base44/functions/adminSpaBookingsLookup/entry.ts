import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin users OR no-session callers (scheduled/dashboard use)
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === "admin") isAuthorized = true;
    } catch { isAuthorized = true; }
    if (!isAuthorized) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { startISO, endISO, staffName, status } = body;

    // Fetch from SpaBooking entity (replaces old SimplyBook API calls)
    const allBookings = await base44.entities.SpaBooking.list("-startAt", 2000);

    // Filter by date range
    let filtered = allBookings.filter((b: any) => {
      if (!b.startAt) return false;
      if (startISO && b.startAt < startISO) return false;
      if (endISO && b.startAt > endISO) return false;
      return true;
    });

    // Filter out cancelled bookings
    const cancelledStatuses = ["booking.cancelled", "cancel", "cancelled"];
    const isNotCancelled = (b: any) =>
      !cancelledStatuses.includes((b.status || "").toLowerCase());

    if (status && status !== "ALL") {
      // When a specific status is requested, include cancelled if that's what they asked for
      filtered = filtered.filter((b: any) =>
        (b.status || "").toLowerCase().includes(status.toLowerCase())
      );
    } else {
      // Default: exclude cancelled
      filtered = filtered.filter(isNotCancelled);
    }

    // Filter by staff name
    if (staffName && staffName !== "ALL") {
      filtered = filtered.filter((b: any) => b.staffName === staffName);
    }

    // Sort by start time
    filtered.sort((a: any, b: any) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );

    // Map to the shape AdminSpaSchedule.jsx expects
    const bookings = filtered.map((b: any) => ({
      id: b.id,
      serviceName: b.serviceName || "",
      service: b.serviceId || "",
      staffName: b.staffName || "",
      clientName: b.clientName || "",
      email: b.email || "",
      phone: b.phone || "",
      startAt: b.startAt || "",
      endAt: b.endAt || null,
      durationMinutes: b.durationMinutes || 0,
      price: b.price || 0,
      status: b.status || "",
      source: b.source || "acuity",
    }));

    // Collect all unique staff names from the full date-range result (before staff filter)
    const staffNames = Array.from(
      new Set(
        allBookings
          .filter((b: any) => {
            if (!b.startAt) return false;
            if (startISO && b.startAt < startISO) return false;
            if (endISO && b.startAt > endISO) return false;
            return true;
          })
          .filter(isNotCancelled)
          .map((b: any) => b.staffName)
          .filter(Boolean)
      )
    ).sort();

    return Response.json({
      success: true,
      bookings,
      staffNames,
      _rawCount: bookings.length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

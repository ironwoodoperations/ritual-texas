import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function clean(s) { return String(s ?? "").trim(); }
function toStandardTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
function emailNorm(s) { return clean(s).toLowerCase(); }

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  const ms = b.getTime() - a.getTime();
  const n = Math.round(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, n);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const { intake } = await req.json();

    const guestName = clean(intake?.guestName);
    const guestEmail = emailNorm(intake?.email || intake?.guestEmail || "");
    const checkIn = clean(intake?.checkInDate);
    const checkOut = clean(intake?.checkOutDate);

    console.log("intakeCreateInvoiceDraft input:", { guestName, guestEmail, checkIn, checkOut, intakeKeys: Object.keys(intake || {}) });

    if (!guestName) return Response.json({ error: "Guest name required" }, { status: 400 });
    if (!guestEmail) return Response.json({ error: "Guest email required" }, { status: 400 });
    if (!checkIn || !checkOut) return Response.json({ error: "Check-in and check-out dates required" }, { status: 400 });

    const nights = nightsBetween(checkIn, checkOut);
    const ROOM_RATE = 198;

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const env = Deno.env.get("SQUARE_ENV") || "production";
    const baseUrl = env === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

    const sqHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    };

    // Get location
    const locResp = await fetch(`${baseUrl}/v2/locations`, { headers: sqHeaders });
    const locData = await locResp.json();
    const location = (locData?.locations || []).find(l => l.status === "ACTIVE") || locData?.locations?.[0];
    if (!location) return Response.json({ error: "No Square location found" }, { status: 500 });
    const locationId = location.id;

    // Find or create customer
    const searchResp = await fetch(`${baseUrl}/v2/customers/search`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify({ query: { filter: { email_address: { exact: guestEmail } } } }),
    });
    const searchData = await searchResp.json();
    let customerId = searchData?.customers?.[0]?.id;

    if (!customerId) {
      const nameParts = guestName.trim().split(/\s+/);
      const createResp = await fetch(`${baseUrl}/v2/customers`, {
        method: "POST",
        headers: sqHeaders,
        body: JSON.stringify({
          given_name: nameParts[0] || guestName,
          family_name: nameParts.slice(1).join(" ") || ".",
          email_address: guestEmail,
          phone_number: clean(intake?.phone) || undefined,
          idempotency_key: `create-${guestEmail}-${Date.now()}`,
        }),
      });
      const createData = await createResp.json();
      customerId = createData?.customer?.id;
      if (!customerId) return Response.json({ error: "Could not create Square customer", detail: createData }, { status: 500 });
    }

    // Build line items
    const lineItems = [];
    const isSpaOnly = intake?.bookingType === "spa_only" || nights === 0;

    if (!isSpaOnly) {
      const roomLabel = intake?.roomRequested || "Hotel Stay";
      lineItems.push({
        name: `${roomLabel} · ${nights} night${nights === 1 ? "" : "s"} · ${checkIn} to ${checkOut}`,
        quantity: String(nights),
        base_price_money: { amount: ROOM_RATE * 100, currency: "USD" },
      });
    }

    // SimplyBook treatment line items
    const selected = Array.isArray(intake?.selectedTreatments) ? intake.selectedTreatments : [];
    for (const item of selected) {
      let name = "", price = 0, date = "", time = "", guestLabel = "", staffName = "";
      try {
        const obj = typeof item === "string" ? JSON.parse(item) : item;
        name = clean(obj.serviceName || obj.name || "Treatment");
        price = Number(obj.price || 0);
        date = obj.date || "";
        time = obj.time || "";
        guestLabel = clean(obj.guestName || "");
        staffName = clean(obj.staffName || "");
      } catch {
        name = clean(item);
      }
      if (!name) continue;
      let label = name;
      if (guestLabel) label += ` for ${guestLabel}`;
      if (date) label += ` — ${date}`;
      if (time) label += ` at ${toStandardTime(time)}`;
      if (staffName) label += ` with ${staffName}`;
      lineItems.push({
        name: label,
        quantity: "1",
        base_price_money: { amount: Math.round(price * 100), currency: "USD" },
      });
    }

    // Call-to-book treatment line items
    const ctbSelected = Array.isArray(intake?.callToBookTreatments) ? intake.callToBookTreatments : [];
    for (const item of ctbSelected) {
      let name = "", price = 0, date = "", time = "", guestLabel = "", staffName = "";
      try {
        const obj = typeof item === "string" ? JSON.parse(item) : item;
        name = clean(obj.serviceName || obj.name || "Treatment");
        price = Number(obj.price || 0);
        date = obj.date || "";
        time = obj.time || "";
        guestLabel = clean(obj.guestName || "");
        staffName = clean(obj.staffName || "");
      } catch {
        name = clean(item);
      }
      if (!name) continue;
      let label = name;
      if (guestLabel) label += ` for ${guestLabel}`;
      if (date) label += ` — ${date}`;
      if (time) label += ` at ${toStandardTime(time)}`;
      if (staffName) label += ` with ${staffName}`;
      label += " (call-to-book)";
      lineItems.push({
        name: label,
        quantity: "1",
        base_price_money: { amount: Math.round(price * 100), currency: "USD" },
      });
    }

    // Discount line item (negative amount)
    const discountType = intake?.discountType || "none";
    const discountValue = Number(intake?.discountValue || 0);
    if (discountType !== "none" && discountValue > 0) {
      const subtotalForDiscount = lineItems.reduce((sum, li) => sum + (li.base_price_money.amount * Number(li.quantity)), 0);
      let discountAmountCents = 0;
      if (discountType === "percent") {
        discountAmountCents = Math.round(subtotalForDiscount * (discountValue / 100));
      } else if (discountType === "dollar") {
        discountAmountCents = Math.round(discountValue * 100);
      }
      if (discountAmountCents > 0) {
        const discountLabel = (intake?.discountLabel || "").trim() || (discountType === "percent" ? `Discount (${discountValue}%)` : `Discount (-$${discountValue.toFixed(2)})`);
        lineItems.push({
          name: discountLabel,
          quantity: "1",
          base_price_money: { amount: -discountAmountCents, currency: "USD" },
        });
      }
    }

    // Hotel occupancy taxes — applied to room cost only (not treatments)
    const HOTEL_TAXES = [
      { key: 'hotel_state',  label: 'State of Texas Hotel Occupancy Tax (6%)',         rate: 6.00 },
      { key: 'hotel_city',   label: 'City of Jacksonville Hotel Occupancy Tax (7%)',   rate: 7.00 },
      { key: 'hotel_venue',  label: 'Jacksonville Venue Tax (2%)',                     rate: 2.00 },
    ];

    const selectedTaxes = intake?.taxes || {};
    const hotelSubtotal = ROOM_RATE * nights;

    for (const tax of HOTEL_TAXES) {
      if (!selectedTaxes[tax.key]) continue;
      const amount = Math.round(hotelSubtotal * tax.rate) / 100;
      if (amount <= 0) continue;
      lineItems.push({
        name: tax.label,
        quantity: "1",
        base_price_money: { amount: Math.round(amount * 100), currency: "USD" },
      });
    }

    // Log full line items before sending to Square
    console.log("Square order line items:", JSON.stringify(lineItems, null, 2));
    console.log("Square customer:", { customerId, guestEmail, guestName });

    // Validate all amounts are integers in cents
    for (const li of lineItems) {
      const amt = li.base_price_money?.amount;
      if (typeof amt !== "number" || !Number.isInteger(amt)) {
        console.error("INVALID amount_money (must be integer cents):", li);
        return Response.json({ error: `Line item "${li.name}" has invalid amount: ${amt} (must be integer cents)` }, { status: 400 });
      }
    }

    // Create order
    const orderResp = await fetch(`${baseUrl}/v2/orders`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify({
        order: {
          location_id: locationId,
          customer_id: customerId,
          line_items: lineItems,
        },
        idempotency_key: `order-quote-${Date.now()}`,
      }),
    });
    const orderData = await orderResp.json();
    if (!orderResp.ok) {
      console.error("Square order creation failed:", JSON.stringify(orderData, null, 2));
      return Response.json({ error: "Square order creation failed", detail: orderData, squareStatus: orderResp.status }, { status: 500 });
    }
    const orderId = orderData?.order?.id;
    if (!orderId) return Response.json({ error: "Could not create order", detail: orderData }, { status: 500 });

    // Create invoice (draft, not published yet)
    const notes = clean(intake?.treatmentsRequested || "");
    const dueDate = checkIn || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const invResp = await fetch(`${baseUrl}/v2/invoices`, {
      method: "POST",
      headers: sqHeaders,
      body: JSON.stringify({
        invoice: {
          order_id: orderId,
          primary_recipient: { customer_id: customerId },
          payment_requests: [{
            request_type: "BALANCE",
            due_date: dueDate,
            automatic_payment_source: "NONE",
          }],
          accepted_payment_methods: { card: true, square_gift_card: false, bank_account: false, buy_now_pay_later: false, cash_app_pay: false },
          delivery_method: "EMAIL",
          title: "Hotel RITUAL - Wellness Retreat Quote",
          description: notes ? `Notes: ${notes}` : "Thank you for your interest in Hotel RITUAL. Please review your personalized retreat quote below.",
        },
        idempotency_key: `invoice-quote-${Date.now()}`,
      }),
    });
    const invData = await invResp.json();
    if (!invResp.ok) {
      console.error("Square invoice creation failed:", JSON.stringify(invData, null, 2));
      return Response.json({ error: "Square invoice creation failed", detail: invData, squareStatus: invResp.status }, { status: 500 });
    }
    const invoiceId = invData?.invoice?.id;
    if (!invoiceId) return Response.json({ error: "Could not create invoice", detail: invData }, { status: 500 });

    // DO NOT publish yet - return draft preview URL
    const draftUrl = `${baseUrl.replace('/v2', '')}/invoices/${invoiceId}?api_token=${accessToken}`;

    return Response.json({
      success: true,
      invoiceId,
      draftUrl: invData?.invoice?.public_url || null,
      nights,
      state: invData?.invoice?.state || "DRAFT",
      message: `Draft invoice created - ${nights} night${nights === 1 ? "" : "s"} + ${selected.length + ctbSelected.length} treatment${(selected.length + ctbSelected.length) === 1 ? "" : "s"}`,
    });
  } catch (e) {
    console.error("intakeCreateInvoiceDraft ERROR:", e.message);
    console.error("Stack:", e.stack);
    return Response.json({
      error: e.message,
      stack: e.stack,
      detail: e.squareResponse || null,
    }, { status: 500 });
  }
});
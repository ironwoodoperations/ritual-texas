import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn + 'T00:00:00');
  const end = new Date(checkOut + 'T00:00:00');
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function parseTreatmentEntry(entry) {
  if (typeof entry === 'string') {
    try {
      return JSON.parse(entry);
    } catch {
      return { name: entry, price: 0 };
    }
  }
  return entry;
}

async function bookRoomInCloudbeds(base44, payload) {
  try {
    const res = await base44.asServiceRole.functions.invoke('intakeBookHotel', {
      intake: {
        id: 'temp',
        ...payload,
      },
    });

    if (res.data?.success) {
      return { success: true, reservationId: res.data?.reservationId };
    } else {
      return { success: false, error: res.data?.error || 'Cloudbeds booking failed' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function bookTreatmentsInSimplyBook(base44, intakeId, payload) {
  if (!payload.selectedTreatments || payload.selectedTreatments.length === 0) {
    return { success: true, errors: [] };
  }

  try {
    const res = await base44.asServiceRole.functions.invoke('intakeBookTreatments', {
      intake: {
        id: intakeId,
        selectedTreatments: payload.selectedTreatments,
        ...payload,
      },
    });

    const errors = res.data?.errors || [];
    return { success: true, errors };
  } catch (err) {
    return { success: true, errors: [err.message] };
  }
}

async function createAndPublishInvoice(base44, intakeId, payload) {
  try {
    const draftRes = await base44.asServiceRole.functions.invoke('intakeCreateInvoiceDraft', {
      intakeId,
      intake: {
        id: intakeId,
        ...payload,
      },
    });

    if (draftRes.data?.error) {
      return { success: false, error: draftRes.data.error };
    }

    const invoiceId = draftRes.data?.invoiceId;
    if (!invoiceId) {
      return { success: false, error: 'No invoice ID returned' };
    }

    const pubRes = await base44.asServiceRole.functions.invoke('intakePublishInvoice', {
      invoiceId,
    });

    if (pubRes.data?.error) {
      return { success: false, error: pubRes.data.error, invoiceId };
    }

    const publicUrl = pubRes.data?.invoice?.public_url || pubRes.data?.publicUrl;

    return { success: true, invoiceId, publicUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const payload = await req.json();

    // Validate required fields
    if (!payload.guestName || !payload.email || !payload.checkInDate || !payload.checkOutDate || !payload.cloudbedsRoomTypeId) {
      return Response.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }

    const hasCallToBook = Array.isArray(payload.callToBookTreatments) && payload.callToBookTreatments.length > 0;

    // Step 1: Create HotelTreatmentIntake record
    const intakePayload = {
      guestName: payload.guestName,
      email: payload.email,
      phone: payload.phone,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      numberOfGuests: payload.numberOfGuests,
      cloudbedsRoomTypeId: payload.cloudbedsRoomTypeId,
      roomRequested: payload.roomRequested || '',
      roomName: payload.roomRequested || '',
      selectedTreatments: payload.selectedTreatments || [],
      callToBookTreatments: payload.callToBookTreatments || [],
      treatmentsRequested: payload.specialRequests || '',
      hotelNotes: payload.specialRequests || '',
      howDidYouHearAboutUs: payload.howDidYouHearAboutUs || '',
      bookingStatus: hasCallToBook ? 'new_inquiry' : 'pending',
      internalNotes: `[Guest Online Booking — ${new Date().toISOString()}]\nSource: GuestBookNow page`,
      taxes: {
        hotel_state: true,
        hotel_city: true,
        hotel_venue: true,
        sales_state: true,
        sales_city: true,
        sales_jedc: true,
        sales_county: true,
      },
      preferredContactMethod: 'email',
    };

    let intake;
    try {
      intake = await base44.asServiceRole.entities.HotelTreatmentIntake.create(intakePayload);
    } catch (err) {
      return Response.json(
        { success: false, error: 'Could not save your booking. Please call us at (903) 810-6695.' },
        { status: 500 }
      );
    }

    const intakeId = intake.id;

    // Path B: Request Flow (stop here if call-to-book)
    if (hasCallToBook) {
      try {
        await base44.integrations.Core.SendEmail({
          to: payload.email,
          subject: 'Your Booking Request — Hotel RITUAL',
          body: `Hi ${payload.guestName},\n\nThank you for your booking request at Hotel RITUAL!\n\nWe have received your request and will contact you within 24 hours to confirm availability for all your selected treatments and finalize your reservation.\n\nYour request details:\n• Dates: ${payload.checkInDate} – ${payload.checkOutDate}\n• Room: ${payload.roomRequested}\n• Guests: ${payload.numberOfGuests}\n\nQuestions? Call us at (903) 810-6695 or reply to this email.\n\nWarm regards,\nHotel RITUAL\nSan Augustine, TX`,
        });
      } catch (err) {
        console.error('Failed to send confirmation email:', err);
      }

      return Response.json({
        success: true,
        type: 'request',
        intakeId,
        message: 'Your request has been received. We will contact you shortly to confirm.',
      });
    }

    // Path A: Full Booking Sequence
    let notes = intake.internalNotes;

    // Step 2: Book room in Cloudbeds
    const cbResult = await bookRoomInCloudbeds(base44, payload);
    if (!cbResult.success) {
      notes += `\n[Cloudbeds booking failed: ${cbResult.error}]`;
    } else if (cbResult.reservationId) {
      notes += `\n[Cloudbeds reservation created: ${cbResult.reservationId}]`;
    }

    // Step 3: Book treatments in SimplyBook
    const sbResult = await bookTreatmentsInSimplyBook(base44, intakeId, payload);
    if (sbResult.errors.length > 0) {
      notes += `\n[SimplyBook errors: ${sbResult.errors.join('; ')}]`;
    }

    // Update intake with progress notes
    await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
      internalNotes: notes,
    });

    // Step 4: Create and publish Square invoice
    const invoiceResult = await createAndPublishInvoice(base44, intakeId, payload);

    if (!invoiceResult.success) {
      // Soft fail: flag for staff to send manually
      await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
        internalNotes: notes + `\n[Square invoice failed: ${invoiceResult.error} — send manually]`,
        bookingStatus: 'pending',
      });

      return Response.json({
        success: true,
        type: 'request',
        intakeId,
        message: 'Your booking has been received. We will send your payment link shortly.',
      });
    }

    // Success: save invoice ID and return public URL
    await base44.asServiceRole.entities.HotelTreatmentIntake.update(intakeId, {
      squareInvoiceId: invoiceResult.invoiceId,
      bookingStatus: 'pending',
    });

    return Response.json({
      success: true,
      type: 'booking',
      intakeId,
      publicUrl: invoiceResult.publicUrl,
      message: 'Booking created. Redirecting to payment...',
    });
  } catch (err) {
    console.error('[guestSubmitBooking] Unexpected error:', err);
    return Response.json(
      { success: false, error: 'An unexpected error occurred. Please call us at (903) 810-6695.' },
      { status: 500 }
    );
  }
});
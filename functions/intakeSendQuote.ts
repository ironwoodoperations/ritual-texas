import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intakeId, intake } = await req.json();
    
    if (!intake?.email || !intake?.guestName) {
      return Response.json({ error: 'Guest name and email required' }, { status: 400 });
    }

    // Build pricing summary
    const treatmentCost = (intake.selectedTreatments || []).length > 0
      ? 'See details below'
      : 'No treatments selected';
    
    const roomCost = intake.checkInDate && intake.checkOutDate
      ? Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24)) * 250
      : 'Not selected';

    const emailBody = `
Hi ${intake.guestName},

Thank you for your interest in Hotel RITUAL! Here's a summary of your wellness retreat:

**Your Itinerary**
Check-In: ${intake.checkInDate || 'TBD'}
Check-Out: ${intake.checkOutDate || 'TBD'}
Room: ${intake.roomRequested || 'TBD'}
Guests: ${intake.numberOfGuests || 1}

**Treatments**
${intake.selectedTreatments?.length > 0 
  ? intake.selectedTreatments.map(t => `• ${t}`).join('\n')
  : '(None selected yet)'}

${intake.treatmentsRequested ? `Additional requests: ${intake.treatmentsRequested}` : ''}

**Pricing**
Room (${Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24)) || '?'} nights): $${typeof roomCost === 'number' ? roomCost : 'TBD'}
Treatments: ${treatmentCost}

**Next Steps**
Click below to confirm and complete your booking, or reply to this email with any questions.

Best,
The RITUAL Team
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: intake.email,
      subject: `Your Hotel RITUAL Wellness Retreat Quote`,
      body: emailBody,
      from_name: 'Hotel RITUAL'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
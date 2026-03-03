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

    // Calculate nights and costs
    const nights = intake.checkInDate && intake.checkOutDate
      ? Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24))
      : 0;
    const roomTotal = nights > 0 ? nights * 250 : 0;

    // Build HTML email
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2d2d2d; background: #f8f6f2; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #6b5540 0%, #968a6b 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 2px; }
    .content { padding: 40px 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 14px; font-weight: 600; letter-spacing: 1px; color: #6b5540; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ebd5d5; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .info-item { }
    .info-label { font-size: 12px; letter-spacing: 0.5px; color: #969696; text-transform: uppercase; margin-bottom: 4px; }
    .info-value { font-size: 16px; color: #6b5540; font-weight: 500; }
    .treatment-list { list-style: none; padding: 0; margin: 0; }
    .treatment-list li { padding: 8px 0; color: #45454 5; border-bottom: 1px solid #f0ebe4; }
    .treatment-list li:last-child { border-bottom: none; }
    .pricing-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .pricing-table td { padding: 10px 0; border-bottom: 1px solid #ebd5d5; }
    .pricing-table tr:last-child td { border-bottom: none; }
    .pricing-label { color: #45454 5; }
    .pricing-value { text-align: right; color: #6b5540; font-weight: 500; }
    .notes { background: #f8f6f2; padding: 15px; border-radius: 8px; font-size: 13px; color: #696969; margin-top: 12px; }
    .cta { text-align: center; margin: 30px 0; }
    .cta-button { background: #96aa9b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; letter-spacing: 1px; display: inline-block; }
    .footer { background: #ebd5d5; padding: 30px; text-align: center; font-size: 12px; color: #6b5540; }
    .footer p { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Your Wellness Retreat Awaits</h1>
    </div>
    
    <div class="content">
      <p>Hi ${intake.guestName},</p>
      <p>Thank you for your interest in Hotel RITUAL! Here's your personalized wellness retreat summary.</p>
      
      <div class="section">
        <div class="section-title">Your Dates & Room</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Check-In</div>
            <div class="info-value">${intake.checkInDate || 'TBD'}</div>
            <div style="font-size: 12px; color: #969696; margin-top: 2px;">3:00 PM</div>
          </div>
          <div class="info-item">
            <div class="info-label">Check-Out</div>
            <div class="info-value">${intake.checkOutDate || 'TBD'}</div>
            <div style="font-size: 12px; color: #969696; margin-top: 2px;">11:00 AM</div>
          </div>
          <div class="info-item">
            <div class="info-label">Room</div>
            <div class="info-value">${intake.roomRequested || 'Pending Selection'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Guests</div>
            <div class="info-value">${intake.numberOfGuests || 1}</div>
          </div>
        </div>
      </div>

      ${intake.selectedTreatments?.length > 0 ? `
      <div class="section">
        <div class="section-title">Your Treatments</div>
        <ul class="treatment-list">
          ${intake.selectedTreatments.map(t => `<li>• ${t}</li>`).join('')}
        </ul>
        ${intake.treatmentsRequested ? `
        <div class="notes">
          <strong>Special Notes:</strong> ${intake.treatmentsRequested}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Investment</div>
        <table class="pricing-table">
          ${nights > 0 ? `
          <tr>
            <td class="pricing-label">Hotel Stay (${nights} night${nights === 1 ? '' : 's'})</td>
            <td class="pricing-value">$${roomTotal}</td>
          </tr>
          ` : ''}
          ${intake.selectedTreatments?.length > 0 ? `
          <tr>
            <td class="pricing-label">Treatments (${intake.selectedTreatments.length} service${intake.selectedTreatments.length === 1 ? '' : 's'})</td>
            <td class="pricing-value">Custom pricing</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #6b5540; border-bottom: none;">
            <td style="padding-top: 15px; color: #6b5540; font-weight: 600;">Total</td>
            <td style="padding-top: 15px; text-align: right; color: #6b5540; font-weight: 600;">TBD</td>
          </tr>
        </table>
      </div>

      <div class="cta">
        <p style="margin: 0 0 15px 0; color: #696969; font-size: 13px;">Ready to confirm your retreat?</p>
        <a href="#" class="cta-button">Review & Book</a>
      </div>

      <p style="color: #696969; font-size: 13px; line-height: 1.6;">Have questions? Reply directly to this email, or call us at <strong>(903) 810-6695</strong> — we're here to help craft the perfect experience for you.</p>
    </div>

    <div class="footer">
      <p><strong>Hotel RITUAL</strong></p>
      <p>540 El Paso Street, Jacksonville, TX 75766</p>
      <p>(903) 810-6695</p>
    </div>
  </div>
</body>
</html>
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
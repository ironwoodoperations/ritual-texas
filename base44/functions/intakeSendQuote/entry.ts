import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const hour = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function parseTreatment(item) {
  try {
    const obj = typeof item === 'string' ? JSON.parse(item) : item;
    const name = String(obj.serviceName || obj.name || 'Treatment');
    const price = Number(obj.price || 0);
    const date = obj.date || '';
    const time = fmtTime(obj.time || obj.startTime || '');
    const guest = String(obj.guestName || '');
    const staff = String(obj.staffName || '');
    let label = name;
    if (guest) label += ` for ${guest}`;
    if (date) label += ` — ${date}`;
    if (time) label += ` at ${time}`;
    if (staff) label += ` with ${staff}`;
    return { label, price };
  } catch {
    return { label: String(item), price: 0 };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { intake } = await req.json();

    if (!intake?.guestName) {
      return Response.json({ error: 'Guest name required' }, { status: 400 });
    }

    const nights = intake.checkInDate && intake.checkOutDate
      ? Math.ceil((new Date(intake.checkOutDate) - new Date(intake.checkInDate)) / (1000 * 60 * 60 * 24))
      : 0;
    const roomTotal = nights > 0 ? nights * 250 : 0;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 50;
    let y = 0;

    // Header band
    doc.setFillColor(107, 85, 64);
    doc.rect(0, 0, W, 80, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'light');
    doc.text('Hotel RITUAL', W / 2, 38, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Wellness Retreat Quote', W / 2, 58, { align: 'center' });
    y = 110;

    // Reset text color
    doc.setTextColor(45, 45, 45);

    // Guest greeting
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prepared for: ${intake.guestName}`, margin, y);
    y += 18;
    if (intake.email) {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(intake.email, margin, y);
      y += 14;
    }
    doc.setTextColor(45, 45, 45);
    y += 20;

    // Section helper
    const sectionTitle = (title) => {
      doc.setFillColor(235, 225, 213);
      doc.rect(margin, y, W - margin * 2, 20, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(107, 85, 64);
      doc.text(title.toUpperCase(), margin + 8, y + 13);
      doc.setTextColor(45, 45, 45);
      doc.setFont('helvetica', 'normal');
      y += 30;
    };

    const row = (label, value, bold = false) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(label, margin + 8, y);
      doc.text(String(value), W - margin - 8, y, { align: 'right' });
      y += 18;
    };

    // Stay Details
    sectionTitle('Your Stay');
    if (intake.checkInDate) row('Check-In', `${intake.checkInDate}  (3:00 PM)`);
    if (intake.checkOutDate) row('Check-Out', `${intake.checkOutDate}  (11:00 AM)`);
    if (nights > 0) row('Nights', nights);
    if (intake.roomRequested) row('Room', intake.roomRequested);
    row('Guests', intake.numberOfGuests || 1);
    y += 10;

    // Treatments
    if (intake.selectedTreatments?.length > 0) {
      sectionTitle('Treatments Requested');
      intake.selectedTreatments.forEach(t => {
        const { label } = parseTreatment(t);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(`• ${label}`, W - margin * 2 - 16);
        doc.text(lines, margin + 8, y);
        y += lines.length * 14;
      });
      if (intake.treatmentsRequested) {
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text('Special Notes:', margin + 8, y);
        y += 14;
        const lines = doc.splitTextToSize(intake.treatmentsRequested, W - margin * 2 - 16);
        doc.text(lines, margin + 8, y);
        y += lines.length * 13 + 4;
        doc.setTextColor(45, 45, 45);
      }
      y += 10;
    }

    // Pricing
    sectionTitle('Investment');
    if (nights > 0) {
      row(`Hotel Stay (${nights} night${nights === 1 ? '' : 's'} × $250)`, `$${roomTotal.toLocaleString()}`);
    }
    if (intake.selectedTreatments?.length > 0) {
      row(`Treatments (${intake.selectedTreatments.length} service${intake.selectedTreatments.length === 1 ? '' : 's'})`, 'Custom pricing');
    }
    y += 4;
    doc.setDrawColor(107, 85, 64);
    doc.line(margin, y, W - margin, y);
    y += 14;
    row('Estimated Total', nights > 0 ? `$${roomTotal.toLocaleString()}+` : 'TBD', true);
    y += 16;

    // Notes
    if (intake.internalNotes) {
      // skip internal notes in guest quote
    }

    // Footer
    doc.setFillColor(235, 225, 213);
    const footerY = doc.internal.pageSize.getHeight() - 60;
    doc.rect(0, footerY, W, 60, 'F');
    doc.setFontSize(9);
    doc.setTextColor(107, 85, 64);
    doc.text('Hotel RITUAL  ·  540 El Paso Street, Jacksonville, TX 75766  ·  (903) 810-6695', W / 2, footerY + 22, { align: 'center' });
    doc.text('hotelritual.com', W / 2, footerY + 38, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="RITUAL-Quote-${intake.guestName.replace(/\s+/g, '-')}.pdf"`,
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
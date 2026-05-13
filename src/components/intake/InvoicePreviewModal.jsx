import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Send, Loader2 } from 'lucide-react';
import { fmtTime } from '@/lib/time';

const ROOM_RATE = 198;

const SALES_TAXES = [
  { key: 'sales_state',  label: 'State of Texas (Sales Tax)',                   rate: 6.25 },
  { key: 'sales_city',   label: 'City of Jacksonville (Sales Tax)',              rate: 1.00 },
  { key: 'sales_jedc',   label: 'Jacksonville Economic Development (JEDC)',      rate: 0.50 },
  { key: 'sales_county', label: 'Cherokee County (Sales Tax)',                   rate: 0.50 },
];
const HOTEL_TAXES = [
  { key: 'hotel_state',  label: 'State of Texas (Hotel Occupancy Tax)',          rate: 6.00 },
  { key: 'hotel_city',   label: 'City of Jacksonville (Hotel Occupancy Tax)',    rate: 7.00 },
  { key: 'hotel_venue',  label: 'Jacksonville Venue Tax',                        rate: 2.00 },
];
const ALL_TAXES = [...SALES_TAXES, ...HOTEL_TAXES];

function nightsBetween(checkIn, checkOut) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function parseTreatments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    try {
      const obj = typeof item === 'string' ? JSON.parse(item) : item;
      return {
        name: obj.serviceName || obj.name || 'Treatment',
        price: Number(obj.price || 0),
        date: obj.date || '',
        time: obj.time || '',
        isCtb: false,
      };
    } catch {
      return { name: String(item), price: 0, date: '', time: '', isCtb: false };
    }
  }).filter(t => t.name);
}

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoicePreviewModal({ intake, onClose, onConfirmSend, sending }) {
  if (!intake) return null;

  const nights = (intake.checkInDate && intake.checkOutDate)
    ? nightsBetween(intake.checkInDate, intake.checkOutDate)
    : 0;

  // Parse rooms — may arrive as JSON string from Base44 entity storage
  let rawRooms = intake.rooms;
  if (typeof rawRooms === 'string') {
    try { rawRooms = JSON.parse(rawRooms); } catch { rawRooms = null; }
  }
  const rooms = Array.isArray(rawRooms) && rawRooms.some(r => r.roomId) ? rawRooms.filter(r => r.roomId) : null;

  const roomLines = [];
  let roomAmount = 0;
  if (rooms) {
    for (const room of rooms) {
      const rate = room.roomRate != null ? Number(room.roomRate) : ROOM_RATE;
      const label = `${room.roomName || 'Hotel Stay'} — ${nights} night${nights === 1 ? '' : 's'} (${intake.checkInDate} → ${intake.checkOutDate})`;
      roomLines.push({ label, amount: rate * nights });
      roomAmount += rate * nights;
    }
  } else {
    const label = `${intake.roomRequested || 'Hotel Stay'} — ${nights} night${nights === 1 ? '' : 's'} (${intake.checkInDate} → ${intake.checkOutDate})`;
    roomAmount = ROOM_RATE * nights;
    roomLines.push({ label, amount: roomAmount });
  }

  const sbTreatments = parseTreatments(intake.selectedTreatments);
  const ctbTreatments = parseTreatments(intake.callToBookTreatments).map(t => ({ ...t, isCtb: true }));
  const allTreatments = [...sbTreatments, ...ctbTreatments];

  const treatmentSubtotal = allTreatments.reduce((s, t) => s + t.price, 0);

  // Tax calculations
  const selectedTaxes = intake.taxes || {};
  const taxLines = [];
  let totalTaxAmount = 0;

  ALL_TAXES.forEach(tax => {
    if (!selectedTaxes[tax.key]) return;
    const isHotel = tax.key.startsWith('hotel_');
    const base = isHotel ? roomAmount : treatmentSubtotal;
    const amount = Math.round(base * tax.rate) / 100;
    if (amount <= 0) return;
    taxLines.push({ label: tax.label, amount });
    totalTaxAmount += amount;
  });

  // Discount
  const discountType = intake.discountType || "none";
  const discountValue = Number(intake.discountValue || 0);
  let discountAmount = 0;
  let discountLabel = "";
  if (discountType !== "none" && discountValue > 0) {
    const subtotalBeforeDiscount = roomAmount + treatmentSubtotal;
    if (discountType === "percent") {
      discountAmount = Math.round(subtotalBeforeDiscount * discountValue) / 100;
    } else if (discountType === "dollar") {
      discountAmount = discountValue;
    }
    discountLabel = (intake.discountLabel || "").trim() || (discountType === "percent" ? `Discount (${discountValue}%)` : `Discount (-$${discountValue.toFixed(2)})`);
  }

  const subtotal = roomAmount + treatmentSubtotal;
  const total = subtotal - discountAmount + totalTaxAmount;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[rgb(107,85,64)] font-light text-lg">Invoice Preview</DialogTitle>
        </DialogHeader>

        {/* Guest info */}
        <div className="bg-[rgb(248,246,242)] rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-[rgb(150,150,150)]">Guest</span>
            <span className="font-medium text-[rgb(45,45,45)]">{intake.guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[rgb(150,150,150)]">Email</span>
            <span className="text-[rgb(45,45,45)]">{intake.email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[rgb(150,150,150)]">Title</span>
            <span className="text-[rgb(45,45,45)]">Hotel RITUAL – Wellness Retreat Quote</span>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[rgb(150,130,110)]">Line Items</p>

          {/* Room(s) */}
          {nights > 0 && intake.bookingType !== "spa_only" && roomLines.map((rl, i) => (
            <div key={`room-${i}`} className="flex justify-between text-sm py-2 border-b border-[rgb(235,225,213)]">
              <span className="text-[rgb(45,45,45)] flex-1 mr-4">{rl.label}</span>
              <span className="font-medium text-[rgb(107,85,64)] shrink-0">{fmtMoney(rl.amount)}</span>
            </div>
          ))}

          {/* Treatments */}
          {allTreatments.map((t, i) => {
            const label = t.name + (t.date ? ` — ${t.date}` : '') + (t.time ? ` at ${fmtTime(t.time)}` : '') + (t.isCtb ? ' (call-to-book)' : '');
            return (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-[rgb(235,225,213)]">
                <span className="text-[rgb(45,45,45)] flex-1 mr-4">{label}</span>
                <span className="font-medium text-[rgb(107,85,64)] shrink-0">{fmtMoney(t.price)}</span>
              </div>
            );
          })}

          {/* Discount */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm py-2 border-b border-[rgb(235,225,213)]">
              <span className="text-green-700 flex-1 mr-4 font-medium">{discountLabel}</span>
              <span className="text-green-700 shrink-0 font-medium">-{fmtMoney(discountAmount)}</span>
            </div>
          )}

          {/* Taxes */}
          {taxLines.map((tl, i) => (
            <div key={i} className="flex justify-between text-sm py-2 border-b border-[rgb(235,225,213)]">
              <span className="text-[rgb(150,150,150)] flex-1 mr-4 italic">{tl.label}</span>
              <span className="text-[rgb(107,85,64)] shrink-0">{fmtMoney(tl.amount)}</span>
            </div>
          ))}

          {/* Totals */}
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-[rgb(150,150,150)]">Subtotal</span>
              <span className="text-[rgb(107,85,64)]">{fmtMoney(subtotal)}</span>
            </div>
            {totalTaxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(150,150,150)]">Total Taxes</span>
                <span className="text-[rgb(107,85,64)]">{fmtMoney(totalTaxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base border-t border-[rgb(235,225,213)] pt-2">
              <span className="text-[rgb(107,85,64)]">Total</span>
              <span className="text-[rgb(107,85,64)]">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 py-2.5 border border-[rgb(235,225,213)] rounded-xl text-sm text-[rgb(107,85,64)] hover:bg-[rgb(248,246,242)] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmSend}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[rgb(107,85,64)] text-white rounded-xl text-sm font-medium hover:bg-[rgb(85,65,45)] transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : `Send to ${intake.email || 'Guest'}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
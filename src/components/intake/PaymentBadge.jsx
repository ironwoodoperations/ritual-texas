import React from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

function formatPaidDate(record) {
  const iso = record.updated_date || record.created_date;
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function formatAmount(cents) {
  if (typeof cents !== "number" || cents <= 0) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

// Prominent, top-of-card indicator of payment / review state.
// Renders nothing for statuses that don't need a badge (new_inquiry, pending,
// confirmed without payment, lost states, etc.).
export default function PaymentBadge({ record, size = "md" }) {
  if (!record) return null;

  const sizing = size === "sm"
    ? "px-2 py-0.5 text-[10px] gap-1"
    : "px-2.5 py-1 text-xs gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  if (record.squarePaymentEventId) {
    const amount = formatAmount(record.paidAmountCents);
    const date = formatPaidDate(record);
    const parts = ["PAID"];
    if (amount) parts.push(amount);
    if (date) parts.push(date);
    return (
      <span className={`inline-flex items-center font-semibold rounded-full bg-green-100 text-green-800 border border-green-300 ${sizing}`}>
        <CheckCircle2 className={iconSize} />
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="opacity-50">·</span>}
            <span>{p}</span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  if (record.bookingStatus === "awaiting_payment") {
    return (
      <span className={`inline-flex items-center font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 ${sizing}`}>
        <Clock className={iconSize} />
        AWAITING PAYMENT
      </span>
    );
  }

  if (record.bookingStatus === "needs_manual_review") {
    return (
      <span className={`inline-flex items-center font-semibold rounded-full bg-red-100 text-red-800 border border-red-300 ${sizing}`}>
        <AlertTriangle className={iconSize} />
        NEEDS REVIEW
      </span>
    );
  }

  return null;
}

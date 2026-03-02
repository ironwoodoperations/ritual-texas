// pages/booking.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

const SIMPLYBOOK_URL = "https://ritualtexas.simplybook.me/v2/";

export default function Booking() {
  const params = new URLSearchParams(window.location.search);
  const service = (params.get("service") || params.get("treatment") || "").toLowerCase();

  // Auto-open in new tab on mount
  useEffect(() => {
    window.open(SIMPLYBOOK_URL, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[rgb(240,232,221)] px-6 text-center">
      <div className="bg-[rgb(252,249,244)] rounded-2xl border border-[rgba(59,72,49,0.1)] shadow-lg p-10 max-w-md w-full">
        <div className="w-14 h-14 rounded-full bg-[rgba(196,165,92,0.18)] flex items-center justify-center mx-auto mb-5">
          <ExternalLink className="w-6 h-6 text-[rgb(59,72,49)]" />
        </div>
        <h1 className="text-2xl font-light text-[rgb(59,72,49)] mb-3" style={{ fontFamily: "serif" }}>
          Opening Booking Portal
        </h1>
        <p className="text-[rgb(27,27,27)] leading-relaxed mb-6">
          The booking portal has been opened in a new tab. If it didn't open automatically, tap the button below.
          {service && <span className="font-semibold"> ({service})</span>}
        </p>
        <a
          href={SIMPLYBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[rgb(252,249,244)] mb-4"
          style={{ background: "#C57C5D" }}
        >
          <ExternalLink className="w-4 h-4" />
          Open Booking Portal
        </a>
        <div>
          <Link
            to={createPageUrl("Treatments")}
            className="inline-flex items-center gap-2 text-sm text-[rgb(107,85,64)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Treatments
          </Link>
        </div>
      </div>
    </div>
  );
}
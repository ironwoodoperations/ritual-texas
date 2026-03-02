// pages/booking.jsx
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function Booking() {
  const simplybookUrl = "https://ritualtexas.simplybook.me/v2/";
  const params = new URLSearchParams(window.location.search);
  const service = (params.get("service") || "").toLowerCase();

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#F0E8DD", zIndex: 10 }}>
      {/* Slim header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "#FCF9F4", borderBottom: "1px solid rgba(59,72,49,.12)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link to={createPageUrl("Treatments")} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3B4831", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
            Back
          </Link>
          <span style={{ color: "#aaa" }}>|</span>
          <span style={{ color: "#3B4831", fontFamily: "serif", fontSize: "18px" }}>
            Book Your Treatment{service ? <span style={{ fontWeight: 700, fontSize: "14px", marginLeft: 8 }}>({service})</span> : null}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#3B4831", fontWeight: 700, background: "rgba(196,165,92,.18)", border: "1px solid rgba(59,72,49,.10)", borderRadius: 999, padding: "4px 10px" }}>
          <ShieldCheck style={{ width: 13, height: 13 }} />
          Secure Booking
        </div>
      </div>

      {/* Iframe fills remaining space */}
      <iframe
        title="Ritual Texas Booking"
        src={simplybookUrl}
        style={{ flex: 1, border: 0, width: "100%", display: "block" }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
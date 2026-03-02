// pages/booking.jsx
import React from "react";

export default function Booking() {
  const simplybookUrl = "https://ritualtexas.simplybook.me/v2/";

  const params = new URLSearchParams(window.location.search);
  const service = (params.get("service") || "").toLowerCase();

  return (
    <section
      style={{
        background: "#F0E8DD",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          background: "#FCF9F4",
          borderRadius: "18px",
          padding: "18px",
          boxShadow: "0 10px 30px rgba(0,0,0,.10)",
          border: "1px solid rgba(59,72,49,.10)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "#3B4831", fontFamily: "serif", fontSize: "30px" }}>
              Book Your Treatment
            </h1>
            <p style={{ marginTop: "10px", color: "#1B1B1B", lineHeight: "1.65" }}>
              Choose your service, provider, and time — right here.{" "}
              {service ? <span style={{ fontWeight: 700 }}>({service})</span> : null}
            </p>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: "999px",
              background: "rgba(196,165,92,.18)",
              border: "1px solid rgba(59,72,49,.10)",
              color: "#3B4831",
              fontWeight: 800,
              fontSize: "12px",
              height: "fit-content",
            }}
          >
            Secure Booking
          </div>
        </div>

        <div
          style={{
            marginTop: "14px",
            padding: "12px",
            borderRadius: "14px",
            background: "rgba(240,232,221,.65)",
            border: "1px solid rgba(59,72,49,.08)",
          }}
        >
          <div style={{ fontWeight: 900, color: "#1B1B1B" }}>Tip for best results</div>
          <div style={{ marginTop: "6px", color: "#1B1B1B", lineHeight: "1.6" }}>
            Sauna + rainshower are available pre or post treatment. Rehydrate with mineral water, organic teas, and snacks
            in the butler's pantry.
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid rgba(59,72,49,.10)",
            background: "#fff",
          }}
        >
          <iframe
            title="Ritual Texas Booking"
            src={simplybookUrl}
            style={{ width: "100%", height: "980px", border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
          <a
            href="/Treatments"
            style={{
              textDecoration: "none",
              padding: "12px 14px",
              borderRadius: "14px",
              fontWeight: 900,
              border: "1px solid rgba(59,72,49,.18)",
              color: "#3B4831",
            }}
          >
            Back
          </a>
        </div>
      </div>
    </section>
  );
}
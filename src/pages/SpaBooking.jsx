import React, { useEffect, useMemo, useRef, useState } from "react";

const SQUARE_EMBED_SNIPPET = `
<!-- Start Square Appointments Embed Code -->
<script src="https://square.site/appointments/buyer/widget/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/9Y1N836Q82W1V.js"></script>
<!-- End Square Appointments Embed Code -->
`;

function injectEmbedSnippet(containerEl, htmlSnippet) {
  if (!containerEl) return;

  // Clear previous renders (prevents duplicate widgets if user navigates back/forward)
  containerEl.innerHTML = "";

  const template = document.createElement("template");
  template.innerHTML = htmlSnippet.trim();

  const scripts = [];
  Array.from(template.content.childNodes).forEach((node) => {
    if (node.nodeName.toLowerCase() === "script") scripts.push(node);
    else containerEl.appendChild(node.cloneNode(true));
  });

  // Execute scripts in order
  scripts.forEach((scriptNode) => {
    const s = document.createElement("script");
    Array.from(scriptNode.attributes || []).forEach((attr) => {
      s.setAttribute(attr.name, attr.value);
    });
    if (scriptNode.textContent && scriptNode.textContent.trim()) {
      s.textContent = scriptNode.textContent;
    }
    containerEl.appendChild(s);
  });
}

export default function SpaBooking() {
  const embedRef = useRef(null);
  const [error, setError] = useState("");

  const serviceParam = useMemo(() => {
    const u = new URL(window.location.href);
    return u.searchParams.get("service") || "";
  }, []);

  useEffect(() => {
    try {
      if (!SQUARE_EMBED_SNIPPET || !SQUARE_EMBED_SNIPPET.includes("<script")) {
        setError("Missing Square embed script.");
        return;
      }
      injectEmbedSnippet(embedRef.current, SQUARE_EMBED_SNIPPET);
      setError("");
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Book a Spa Treatment</h1>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Choose your service and time. Your booking stays inside the Hotel Ritual website.
      </p>

      {serviceParam ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.04)",
            fontSize: 14,
          }}
        >
          You came from: <b>{serviceParam}</b>. If Square doesn't auto-select it, just pick it from the list below.
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(255,0,0,0.08)",
            color: "#7a0000",
            fontSize: 14,
            lineHeight: 1.35,
          }}
        >
          <b>Embed error:</b> {error}
          <div style={{ marginTop: 8 }}>
            If the widget doesn't load, Square may be blocking embeds in this environment or CSP is preventing it.
            We can switch to the fallback "open booking in new tab" option.
          </div>
        </div>
      ) : null}

      {/* Square widget mounts here */}
      <div ref={embedRef} style={{ marginTop: 16 }} />
    </div>
  );
}
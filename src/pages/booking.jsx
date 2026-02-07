import React, { useEffect } from 'react';

export default function Booking() {
  const links = {
    royal: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/HLBJAKGW6OVLZOP6D7GFJQMO",
    aura: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/7HLQNBFV7DDE3C4SSMWYWTAL",
    swedish60: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/YPVKZMCL7BLIMNTW4KYBLGXM",
    swedish90: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/DKOTRCVJPAU4YZPJNI7PENAC",
    lymphatic: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/PMSGEU5VO76MMFGT2K4BIFF4",
    shirodhara: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/QRVGKSUAYAPN7TVOD6MGMWOZ",
    shiroglow: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/ZLVRPJR6VVQZO4C63JEQPGKV",
    forgiveness: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/4LXL6H4CETPOG24Y73BQYYW3",
    reiki: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/VIJZXOZCLRSXRDXOO3KPSVEV",
    soundprivate: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/HFJVSRHBCZGF2DIJQVY2UXQ3",
    soundgroup: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/IQKEIFVAI4PYG4DIDKC5TCRA",
    yogaprivate: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/4KH2D3DUU7PSEMTCCKEQUCK6",
    yogagroup: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/KP4V3SG3R3CYMYCAD3GNDILC",
    drpark: "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services/KQC3YJ6KP5JFD4S4QGDUVJB5"
  };

  const params = new URLSearchParams(window.location.search);
  const service = (params.get("service") || "").toLowerCase();
  const fallback = "https://book.squareup.com/appointments/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/location/9Y1N836Q82W1V/services";
  const bookingUrl = links[service] || fallback;

  return (
    <section style={{ background: '#F0E8DD', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '620px', width: '100%', background: '#FCF9F4', borderRadius: '18px', padding: '22px', boxShadow: '0 10px 30px rgba(0,0,0,.10)', border: '1px solid rgba(59,72,49,.10)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '30px' }}>Preparing Your Booking</h1>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              You're being securely redirected to select your time and complete your booking.
            </p>
          </div>
          <div style={{ padding: '6px 10px', borderRadius: '999px', background: 'rgba(196,165,92,.18)', border: '1px solid rgba(59,72,49,.10)', color: '#3B4831', fontWeight: 800, fontSize: '12px' }}>
            Secure Checkout
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
          <div style={{ fontWeight: 900, color: '#1B1B1B' }}>Tip for best results</div>
          <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
            Sauna + rainshower are available pre or post treatment for maximum results. Rehydrate with mineral water, organic teas, and snacks in the butler's pantry.
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/Treatments" style={{ textDecoration: 'none', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, border: '1px solid rgba(59,72,49,.18)', color: '#3B4831' }}>
            Back
          </a>
          <a
            href={bookingUrl}
            target="_top"
            rel="nofollow"
            style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '12px 16px', borderRadius: '14px', fontWeight: 900 }}
          >
            Continue to Booking
          </a>
        </div>
      </div>
    </section>
  );
}
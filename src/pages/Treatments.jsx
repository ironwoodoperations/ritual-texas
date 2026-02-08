import React from 'react';

export default function Treatments() {
  return (
    <section style={{ background: '#F0E8DD', padding: '26px 16px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <header style={{ marginBottom: '14px' }}>
          <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '34px', letterSpacing: '.2px' }}>
            Spa Treatments
          </h1>
          <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65', maxWidth: '760px' }}>
            These are the only treatments currently available at Hotel RITUAL. Choose your ritual and book in minutes.
          </p>

          <div style={{
            marginTop: '14px',
            background: '#FCF9F4',
            borderRadius: '18px',
            padding: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,.10)',
            border: '1px solid rgba(59,72,49,.10)'
          }}>
            <strong style={{ color: '#3B4831' }}>Before you book:</strong>
            <div style={{ marginTop: '6px', color: '#1B1B1B', lineHeight: '1.6' }}>
              Sauna + rainshower are available pre or post treatment for maximum results. Rehydrate + refresh with mineral water,
              organic teas, and snacks in the butler's pantry before returning to the real world.
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gap: '14px' }}>

          {/* 1) Royal Treatment Facial */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>The Royal Treatment Facial</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Instantly radiant, red-carpet skin. This is Cleopatra's facial. Our lactic acid formula reveals a youthful glow with no redness, peeling, or downtime. Expect to look and feel 10 years younger instantly.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>60 min</div>
              <a href="/booking?service=royal"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 2) Aura Glow */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Aura Glow</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              A resurrection of the mind + body + soul. An awakening of the senses. Includes the royal treatment facial, Parisian scalp + hair treatment,
              aura cleansing, sound healing, crystal chakra tuning + varma energy point activation for the face, hands, arms, and feet.
              High vibes only. Trauma released. Soul revived.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>120 min</div>
              <a href="/booking?service=aura"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 3) Swedish Massage */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Swedish Massage</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Melt away the stress + tension. Flowing strokes restore balance + relaxation. Pressure points activated, energy renewed, temple restored.
            </p>

            <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>60 min</div>
                <a href="/booking?service=swedish60"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book 60
                </a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>90 min</div>
                <a href="/booking?service=swedish90"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book 90
                </a>
              </div>
            </div>
          </article>

          {/* 4) Lymphatic Massage */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Lymphatic Massage</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Gentle, rhythmic movements flush toxins, ease tension, and restore balance—leaving you refreshed and radiant.
              Your lymphatic system's natural detox pathways are awakened for total renewal. Prepare for liftoff.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>90 min</div>
              <a href="/booking?service=lymphatic"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 5) Shirodhara */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Shirodhara</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              A 13,000+ year old treatment from India designed to reset the mind-body connection. The continuous motion of warm oil over the forehead and scalp is divinely relaxing and a reset for the nervous system. The sensation and result is a rebooting of the mind, body, and soul.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>1 hr</div>
              <a href="/booking?service=shirodhara"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 6) Shiro Glow */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Shiro-Glow</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              This is next-level shirodhara. Get your aura glowing while you regain mental clarity. Ancient vibrational healing therapies reawaken the senses,
              cleanse the aura, tune the chakras, and release tension with sound medicine, plus varma energy point massage for face, hands, and feet.
              Resurrection complete.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>120 min</div>
              <a href="/booking?service=shiroglow"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 7) Reiki Forgiveness bowl */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Reiki Forgiveness bowl</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Ready to let go of past memories and events holding you back from achieving your highest vibration? In this celebratory burning ceremony,
              our Reiki master guides you to let go of vibrational imprints, thoughts, and feelings that no longer serve your highest potential.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>1 hr</div>
              <a href="/booking?service=forgiveness"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 8) Reiki */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Reiki</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Holy Fire Reiki is a form of hands-on healing in which your therapist works with universal life force energy to reset your energy centers (chakras)
              to their most natural state of flow. This treatment helps restore and strengthen the mind, body, and spirit.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>1 hr</div>
              <a href="/booking?service=reiki"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

          {/* 9) Sound Bath */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Sound Bath</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Deeply relaxing, a full body reset. Sound baths transfer vibrational energy to the body and mind, aiding in relaxation and healing—similar to how a piano is tuned.
              Helpful for sleep, focus, or emotional release.
            </p>

            <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>Private 60 min session</div>
                <a href="/booking?service=soundprivate"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book Private
                </a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>Group class</div>
                <a href="/booking?service=soundgroup"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book Group
                </a>
              </div>
            </div>
          </article>

          {/* 10) Yoga */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Yoga</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Yoga is a mix of gentle movements and breathing that helps you feel grounded, relaxed, and flexible while deeply detoxifying the lymphatic system and quieting the mind.
              This class is curated for you based on experience level and needs.
            </p>

            <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>Private class</div>
                <a href="/booking?service=yogaprivate"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book Private
                </a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '12px', borderRadius: '14px', background: 'rgba(240,232,221,.65)', border: '1px solid rgba(59,72,49,.08)' }}>
                <div style={{ fontWeight: 800, color: '#1B1B1B' }}>Group class</div>
                <a href="/booking?service=yogagroup"
                   style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                  Book Group
                </a>
              </div>
            </div>
          </article>

          {/* 11) Dr. Parkinstine music treatments */}
          <article style={{ background: '#FCF9F4', borderRadius: '18px', padding: '18px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
            <h2 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '24px' }}>Dr Parkinstine music treatments</h2>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65' }}>
              Tunes brought to you by Dr Parkinstine in the living room of RITUAL or RITUAL Soda Fountain providing you with the frequency of joy (432hz).
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, color: '#1B1B1B' }}>By donation</div>
              <a href="/booking?service=drpark"
                 style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '10px 14px', borderRadius: '14px', fontWeight: 800, display: 'inline-block' }}>
                Book Now
              </a>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}
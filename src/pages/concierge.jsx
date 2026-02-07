import React, { useState, useEffect } from 'react';

export default function Concierge() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const whitneyImage = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/674b866df_file_000000007e8871fd9aef365d1a217a0e.png';

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      text: "Hi there! I'm Whitney, your virtual concierge. What can I assist you with today?"
    }]);
  }, []);

  const isItineraryQuestion = (q) => {
    const s = q.toLowerCase();
    return (
      s.includes('what did i book') ||
      s.includes('my itinerary') ||
      s.includes('when is my') ||
      s.includes('massage time') ||
      s.includes('appointment time') ||
      s.includes('what time') ||
      s.includes('reservation') ||
      s.includes('booking')
    );
  };

  const getCannedResponse = (q) => {
    const s = q.toLowerCase();

    if (isItineraryQuestion(q)) {
      return {
        text: "For your exact booking details (hotel + spa), please use your itinerary page where you can enter your confirmation details.",
        actions: [
          { label: 'View My Itinerary', href: '/itinerary' },
          { label: 'Message Concierge', href: '/AskRitual' }
        ]
      };
    }

    if (s.includes('check in') || s.includes('check-in')) {
      return {
        text: "Check-in details are sent in your pre-arrival instructions. If you need help right now, I can connect you with our concierge team.",
        actions: [{ label: 'Message Concierge', href: '/AskRitual' }]
      };
    }

    if (s.includes('parking')) {
      return {
        text: "Parking guidance is included in your arrival instructions. If you're on-site and need directions, I can help you connect with our team for instant guidance.",
        actions: [{ label: 'Message Concierge', href: '/AskRitual' }]
      };
    }

    if (s.includes('sauna') || s.includes('rainshower') || s.includes('shower')) {
      return {
        text: "Sauna + rainshower are available pre or post treatment for maximum results. Rehydrate with mineral water, organic teas, and snacks in the butler's pantry.",
        actions: []
      };
    }

    if (s.includes('gift card')) {
      return {
        text: "Gift cards are currently available for spa treatments. If you'd like help applying a gift card, our concierge team will take care of it.",
        actions: [{ label: 'Message Concierge', href: '/AskRitual' }]
      };
    }

    if (s.includes('treatment') || s.includes('spa') || s.includes('massage') || s.includes('facial')) {
      return {
        text: "We offer a variety of spa treatments designed to restore and rejuvenate. Would you like to see our full treatment menu or book a service?",
        actions: [
          { label: 'View Treatments', href: '/Treatments' },
          { label: 'Book Now', href: '/booking' }
        ]
      };
    }

    return {
      text: "I can help with check-in, amenities, and treatment prep. For specific booking times or confirmations, please use your itinerary page or connect with our concierge team.",
      actions: [
        { label: 'View My Itinerary', href: '/itinerary' },
        { label: 'Message Concierge', href: '/AskRitual' }
      ]
    };
  };

  const handleSend = () => {
    const q = (input || '').trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');

    const response = getCannedResponse(q);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', text: response.text, actions: response.actions }]);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <section style={{ background: '#F0E8DD', minHeight: '100vh', padding: '22px' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>

        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, color: '#3B4831', fontFamily: 'serif', fontSize: '34px' }}>Ask Whitney</h1>
            <p style={{ marginTop: '10px', color: '#1B1B1B', lineHeight: '1.65', maxWidth: '760px' }}>
              I can help with check-in steps, parking, amenities, treatment prep, and how your stay works.
              For exact booking times, I'll send you to your itinerary page.
            </p>
          </div>
          <a href="/itinerary" style={{ textDecoration: 'none', background: '#C57C5D', color: '#FCF9F4', padding: '12px 14px', borderRadius: '14px', fontWeight: 900 }}>
            View My Itinerary
          </a>
        </header>

        <div style={{ marginTop: '14px', background: '#FCF9F4', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,.08)', border: '1px solid rgba(59,72,49,.10)' }}>
          <div style={{ display: 'grid', gap: '10px', maxHeight: '500px', overflowY: 'auto', marginBottom: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ padding: '12px', borderRadius: '14px', border: '1px solid rgba(59,72,49,.10)', background: msg.role === 'user' ? 'rgba(240,232,221,.65)' : '#fff' }}>
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <img src={whitneyImage} alt="Whitney" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ fontWeight: 900, color: '#3B4831' }}>Whitney</div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div style={{ fontWeight: 900, color: '#3B4831', marginBottom: '6px' }}>You</div>
                )}
                <div style={{ color: '#1B1B1B', lineHeight: '1.65' }}>{msg.text}</div>
                {msg.actions && msg.actions.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {msg.actions.map((action, i) => (
                      <a key={i} href={action.href} style={{ display: 'inline-block', background: i === 0 ? '#C57C5D' : '#3B4831', color: '#FCF9F4', padding: '10px 12px', borderRadius: '14px', fontWeight: 900, textDecoration: 'none' }}>
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question… (ex: How do I check in?)"
              style={{ flex: 1, minWidth: '220px', padding: '12px', borderRadius: '14px', border: '1px solid rgba(59,72,49,.22)', background: '#fff', fontSize: '16px', outline: 'none' }}
            />
            <button
              onClick={handleSend}
              style={{ background: '#3B4831', color: '#FCF9F4', border: 'none', padding: '12px 14px', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}
            >
              Send
            </button>
          </div>

          <div style={{ marginTop: '10px', color: '#1B1B1B', opacity: 0.75, fontSize: '12px', lineHeight: '1.5' }}>
            Safety: This concierge answers from Hotel RITUAL's info only. If unsure, it will offer to message the concierge.
          </div>
        </div>

      </div>
    </section>
  );
}
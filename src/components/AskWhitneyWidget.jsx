import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function AskWhitneyWidget({ isOpen: isOpenProp, onClose }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpenProp !== undefined) {
      setIsOpen(isOpenProp);
    }
  }, [isOpenProp]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const whitneyImage = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952b5de56519adda6e982ce/424e86f0a_generated-image1.jpeg';

  const { data: knowledgeBase = [] } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: () => base44.entities.KnowledgeBaseArticles.filter({ isActive: true }),
    initialData: [],
    enabled: isOpen,
  });

  const { data: knowledgeBaseOld = [] } = useQuery({
    queryKey: ['knowledge-base-old'],
    queryFn: () => base44.entities.KnowledgeBase.filter({ is_active: true }),
    initialData: [],
    enabled: isOpen,
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.list(),
    initialData: [],
    enabled: isOpen,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    initialData: [],
    enabled: isOpen,
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages-whitney'],
    queryFn: async () => {
      const all = await base44.entities.Package.list('sort_order', 20);
      return all.filter(p => p.is_active);
    },
    initialData: [],
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: "Hi there! I'm Whitney, your virtual concierge. What can I assist you with today?"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    const q = (input || '').trim();
    if (!q || isLoading) return;

    const userMessage = { role: 'user', text: q };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let context = `You are Whitney, the virtual concierge for Hotel RITUAL, a boutique hotel and spa in Jacksonville, Texas.
Your tone is calm, warm, and helpful. Never be pushy or salesy. Be concise but thorough.
Never make medical claims about treatments. If unsure, suggest the guest contact us directly.

PROPERTY INFORMATION:
- Check-in: 3:00 PM (self-guided, key at entrance)
- Check-out: 11:00 AM (leave key in room)
- Quiet hours: 7:30 PM onwards
- All rooms include: organic robes, sauna access, light breakfast

`;

      if (knowledgeBase?.length > 0) {
        context += "\nKNOWLEDGE BASE (Q&A):\n";
        knowledgeBase.forEach(kb => {
          context += `Q: ${kb.question}\nA: ${kb.answer}\n\n`;
        });
      }

      if (knowledgeBaseOld?.length > 0) {
        context += "\nAPPROVED KNOWLEDGE BASE:\n";
        knowledgeBaseOld.forEach(kb => {
          context += `${kb.category?.toUpperCase()}: ${kb.title}\n${kb.content}\n\n`;
        });
      }

      if (treatments?.length > 0) {
        context += "\nAVAILABLE TREATMENTS:\n";
        treatments.forEach(t => {
          context += `- ${t.name} (${t.duration_minutes} min, $${t.price}): ${t.what_it_is || ''}\n`;
        });
      }

      if (rooms?.length > 0) {
        context += "\nROOMS:\n";
        rooms.forEach(r => {
          context += `- ${r.name}: $${r.price_per_night}/night, max ${r.max_occupancy} guests. ${r.description || ''}\n`;
        });
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nGuest question: ${q}\n\nProvide a helpful, warm response. Keep it concise but complete. If the question is about specific booking details or itinerary times, direct them to visit their itinerary page.`,
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "I apologize, but I'm having trouble connecting right now. Please try the 'Message Concierge' button for immediate assistance."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      zIndex: 9999,
      width: '380px',
      maxWidth: 'calc(100vw - 36px)',
      background: '#FCF9F4',
      borderRadius: '18px',
      boxShadow: '0 12px 40px rgba(0,0,0,.2)',
      border: '1px solid rgba(59,72,49,.15)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '600px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid rgba(59,72,49,.1)',
        background: 'linear-gradient(135deg, #3B4831 0%, #4a5940 100%)',
        borderRadius: '18px 18px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={whitneyImage} alt="Whitney" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 900, color: '#FCF9F4', fontSize: '16px' }}>Whitney</div>
            <div style={{ fontSize: '12px', color: 'rgba(252,249,244,.75)' }}>Virtual Concierge</div>
          </div>
        </div>
        <button onClick={handleClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#FCF9F4', padding: '4px' }}>
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            padding: '12px',
            borderRadius: '14px',
            background: msg.role === 'user' ? 'rgba(240,232,221,.65)' : '#fff',
            border: '1px solid rgba(59,72,49,.1)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontWeight: 900, color: '#3B4831', marginBottom: '6px', fontSize: '13px' }}>Whitney</div>
            )}
            <div style={{ color: '#1B1B1B', lineHeight: '1.6', fontSize: '14px' }}>{msg.text}</div>
          </div>
        ))}
        {isLoading && (
          <div style={{ padding: '12px', borderRadius: '14px', background: '#fff', border: '1px solid rgba(59,72,49,.1)', alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div style={{ color: '#3B4831' }}>Whitney is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(59,72,49,.1)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '12px',
              border: '1px solid rgba(59,72,49,.2)',
              background: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={toggleListening}
            style={{
              background: isListening ? '#C57C5D' : 'rgba(59,72,49,.1)',
              border: 'none',
              padding: '10px',
              borderRadius: '12px',
              cursor: 'pointer',
              color: isListening ? '#fff' : '#3B4831'
            }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              background: isLoading || !input.trim() ? '#999' : '#3B4831',
              color: '#FCF9F4',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 900,
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Send
          </button>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', fontSize: '11px' }}>
          <a href="/itinerary" style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(197,124,93,.1)', color: '#C57C5D', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
            View Itinerary
          </a>
          <a href="mailto:concierge@hotelritual.com" style={{ flex: 1, textAlign: 'center', padding: '8px', background: 'rgba(59,72,49,.1)', color: '#3B4831', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
            Message Concierge
          </a>
        </div>
      </div>
    </div>
  );
}
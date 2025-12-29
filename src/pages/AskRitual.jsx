import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Send, Leaf, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';

const SUGGESTED_QUESTIONS = [
  "What should I bring to my stay?",
  "How does check-in work?",
  "Tell me about the sauna",
  "What treatments do you recommend for relaxation?",
  "Is there food available on property?",
  "What are the quiet hours?"
];

export default function AskRitual() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: knowledgeBase } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: () => base44.entities.KnowledgeBase.filter({ is_active: true }),
  });

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.list(),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContext = () => {
    let context = `You are the AI concierge for Hotel RITUAL, a boutique hotel and spa in Jacksonville, Texas. 
Your tone is calm, warm, and helpful. Never be pushy or salesy. Be concise but thorough.
Never make medical claims about treatments. If unsure, suggest the guest contact us directly.

PROPERTY INFORMATION:
- Check-in: 3:00 PM (self-guided, key at entrance)
- Check-out: 11:00 AM (leave key in room)
- Quiet hours: 7:30 PM onwards
- All rooms include: organic robes, sauna access, light breakfast

`;

    if (knowledgeBase?.length > 0) {
      context += "\nAPPROVED KNOWLEDGE BASE:\n";
      knowledgeBase.forEach(kb => {
        context += `\n${kb.category.toUpperCase()}: ${kb.title}\n${kb.content}\n`;
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

    return context;
  };

  const handleSend = async (question) => {
    const userMessage = question || input.trim();
    if (!userMessage) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    const context = buildContext();
    const prompt = `${context}\n\nGuest question: ${userMessage}\n\nProvide a helpful, warm response. Keep it concise but complete.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          response: { type: "string" },
          suggest_contact: { type: "boolean" }
        }
      }
    });

    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: response.response,
      suggestContact: response.suggest_contact
    }]);
    setIsLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[rgb(150,170,155)]/20 flex items-center justify-center">
            <Leaf className="w-7 h-7 text-[rgb(150,170,155)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-2">
            Ask Ritual
          </h1>
          <p className="text-[rgb(45,45,45)] font-light">
            Questions about your stay? I'm here to help.
          </p>
        </motion.div>

        {/* Chat Area */}
        <div className="bg-white border border-[rgb(235,225,213)] min-h-[400px] flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-center text-[rgb(45,45,45)] font-light mb-6">
                  What would you like to know?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="px-4 py-2 text-sm text-[rgb(107,85,64)] bg-[rgb(235,225,213)] hover:bg-[rgb(198,182,165)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 ${
                        msg.role === 'user' 
                          ? 'bg-[rgb(150,170,155)] text-white' 
                          : 'bg-[rgb(235,225,213)] text-[rgb(45,45,45)]'
                      }`}>
                        <p className="font-light leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.suggestContact && (
                          <p className="mt-3 pt-3 border-t border-[rgb(198,182,165)] text-sm">
                            For more specific questions, please reach out to us directly.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-[rgb(235,225,213)] p-4 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[rgb(150,170,155)]" />
                      <span className="text-sm text-[rgb(45,45,45)]">Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-[rgb(235,225,213)]">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your stay..."
                className="border-[rgb(235,225,213)] flex-1"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-[rgb(150,170,155)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgb(130,150,135)] transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-[rgb(45,45,45)] mt-6"
        >
          I can answer questions about rooms, treatments, check-in, what to bring, and more.
        </motion.p>
      </div>
    </div>
  );
}
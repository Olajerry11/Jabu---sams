import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are JABU SAMS Assistant — an AI helper embedded in the JABU SAMS (Student Access Management System) for Joseph Ayo Babalola University (JABU), Ikeji-Arakeji, Osun State, Nigeria.

Your role is to help students, staff, security officers, and administrators with questions about the platform.

Key facts about JABU SAMS:
- Students get a Digital ID Pass with a QR code that refreshes every 60 seconds
- Security officers scan student QR codes at campus checkpoints to verify access
- Students can request gate passes (e.g. to leave campus) via the "Access & Deliveries" button
- Students can request profile corrections via "Request Data Change" — admin approves/rejects
- Admins manage all user profiles, can suspend or activate passes, and approve change requests
- Security officers have an online/offline status visible to admins
- Students register with @students.jabu.edu.ng email
- The app works on mobile and desktop browsers
- Password reset is done via email link
- Images (passport photos, luggage photos) are stored in base64 in Firestore

Common roles: student, teaching_staff, non_teaching_staff, security, admin, food_vendor, camp_guest

Be concise, friendly, and helpful. If you don't know something specific, advise the user to contact the ICT Unit. Do not make up policy details. Answer in English (or match the language the user writes in). Keep responses short — under 4 sentences unless more detail is truly needed.`;

export default function AIChatbot() {
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) setApiKeyMissing(true);
  }, [apiKey]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      // Show a greeting if no messages yet
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hi${userData?.name ? ` ${userData.name.split(' ')[0]}` : ''}! 👋 I'm the JABU SAMS AI Assistant. Ask me anything about your digital ID pass, gate requests, profile changes, or how the system works.`,
        }]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (!apiKey) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ The AI chatbot API key is not configured. Please contact the ICT Unit or add `VITE_GEMINI_API_KEY` to the `.env` file.',
      }]);
      setLoading(false);
      return;
    }

    try {
      // Build conversation history for Gemini API
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const body = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          ...history,
          { role: 'user', parts: [{ text }] },
        ],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7,
        },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sorry, I could not generate a response. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      console.error('Gemini API error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I ran into an error: ${msg}. Please try again or contact the ICT Unit.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 flex items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-500/40 hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white group"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-md flex flex-col bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-200 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-brand-600 to-brand-700 text-white shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-none">JABU SAMS Assistant</p>
              <p className="text-[10px] text-brand-200 mt-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Powered by Gemini AI
              </p>
            </div>
            {apiKeyMissing && (
              <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-lg font-bold">
                NO KEY
              </span>
            )}
            <button
              onClick={() => setOpen(false)}
              title="Close chat"
              aria-label="Close chat"
              className="w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[55vh] min-h-[200px] bg-slate-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-br-sm font-medium'
                      : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-10 h-10 flex items-center justify-center bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {/* Footer hint */}
          <div className="px-4 pb-3 pt-0 bg-white">
            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
              <MessageCircle className="w-3 h-3" /> Press Enter to send · Gemini 2.0 Flash
            </p>
          </div>
        </div>
      )}
    </>
  );
}

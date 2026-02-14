'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { useUser } from '@/hooks/useUser';
import { trackEvent } from '@/lib/track';
import {
  createChatSession,
  updateChatSession,
  getRecentSessions,
  getLastSessionContext,
  ChatSession,
} from '@/lib/chat-persistence';

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MemoryInfo {
  hasMemories: boolean;
  greetingContext: string | null;
}

// ============================================================================
// Icons
// ============================================================================

function ArrowLeftIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function ArrowUpIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </svg>
  );
}

function SparklesIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

// ============================================================================
// Typing Indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
    >
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '0ms' }} />
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '150ms' }} />
      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--text-muted)', animationDelay: '300ms' }} />
    </div>
  );
}

// ============================================================================
// Message Bubble
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 ${isUser ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
          style={{
            background: isUser ? 'var(--primary)' : 'var(--bg-card)',
            color: isUser ? 'white' : 'var(--text)',
            border: isUser ? 'none' : '1px solid var(--border-light)',
          }}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <p
          className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: 'var(--text-muted)' }}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Suggestion Pills
// ============================================================================

interface SuggestionPillsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

function SuggestionPills({ suggestions, onSelect }: SuggestionPillsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-4">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="px-4 py-2.5 rounded-full text-[13px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-sec)',
            border: '1px solid var(--border-light)',
          }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Chat Page
// ============================================================================

export default function ChatPage() {
  const router = useRouter();
  const { userId, loading: userLoading, isAuthenticated } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [latestMood, setLatestMood] = useState<number | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo>({ hasMemories: false, greetingContext: null });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<ChatSession[]>([]);
  const [messagesSinceLastUpdate, setMessagesSinceLastUpdate] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const supabase = createClient();

  // Keep refs in sync for cleanup
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [userLoading, isAuthenticated, router]);

  // Track page view and create session
  useEffect(() => {
    if (userId) {
      trackEvent('chat_opened');

      // Create a new chat session
      const initSession = async () => {
        const newSessionId = await createChatSession(userId, supabase);
        if (newSessionId) {
          setSessionId(newSessionId);
        }

        // Fetch recent sessions for context
        const sessions = await getRecentSessions(userId, supabase, 5);
        setRecentSessions(sessions);
      };
      initSession();
    }
  }, [userId]);

  // Summarize and close session on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Fire-and-forget summary generation
      if (sessionIdRef.current && messagesRef.current.length > 1) {
        const chatMessages = messagesRef.current
          .filter(m => m.id !== 'greeting')
          .map(m => ({ role: m.role, content: m.content }));

        if (chatMessages.length > 0) {
          // Use sendBeacon for reliable delivery on page unload
          navigator.sendBeacon(
            '/api/ai/chat-summary',
            JSON.stringify({
              sessionId: sessionIdRef.current,
              messages: chatMessages,
            })
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also trigger on component unmount (navigation)
      handleBeforeUnload();
    };
  }, []);

  // Fetch user data for greeting
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      const [profileRes, moodRes, memoriesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('mood_entries')
          .select('mood_value')
          .eq('user_id', userId)
          .order('logged_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('ai_memory')
          .select('content, memory_type, importance')
          .eq('user_id', userId)
          .order('importance', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setFirstName(profileRes.data?.first_name || '');
      setLatestMood(moodRes.data?.mood_value ?? null);

      // Process memories for greeting context
      const memories = memoriesRes.data || [];
      if (memories.length > 0) {
        // Find a milestone or high-importance memory for greeting
        const milestone = memories.find(m => m.memory_type === 'milestone');
        const highImportance = memories.find(m => m.importance >= 7);
        setMemoryInfo({
          hasMemories: true,
          greetingContext: milestone?.content || highImportance?.content || null,
        });
      }
    };

    fetchUserData();
  }, [userId]);

  // Generate initial greeting
  useEffect(() => {
    if (hasGreeted || !userId || !firstName) return;

    const hour = new Date().getHours();
    let greeting = '';

    // Check for recent session context first
    const lastSession = getLastSessionContext(recentSessions);

    if (lastSession && lastSession.daysAgo <= 7) {
      // Reference the last conversation
      if (lastSession.daysAgo === 0) {
        greeting = `Hey ${firstName}. Welcome back. How's everything going since earlier?`;
      } else if (lastSession.daysAgo === 1) {
        greeting = `Hey ${firstName}. Good to see you again. How have you been since yesterday?`;
      } else {
        // Extract a topic hint from the summary if possible
        const topics = lastSession.topics;
        if (topics && topics.length > 0) {
          const topicHint = topics[0].replace(/_/g, ' ');
          greeting = `Hey ${firstName}. Last time we talked about ${topicHint}. How's that going?`;
        } else {
          greeting = `Hey ${firstName}. It's been a few days. How have things been?`;
        }
      }
    } else if (memoryInfo.hasMemories && memoryInfo.greetingContext) {
      // Reference something we remember about them
      const context = memoryInfo.greetingContext.toLowerCase();
      if (context.includes('started dating') || context.includes('moved out') || context.includes('first good day')) {
        greeting = `Hey ${firstName}. It's good to see you back. Last time we talked about some big steps — how have things been going?`;
      } else {
        greeting = `Hey ${firstName}. Good to see you again. I've been thinking about what we talked about before. How are you doing?`;
      }
    } else if (latestMood !== null && latestMood <= 4) {
      greeting = `Hey ${firstName}. I noticed things have been tough lately. I'm here if you want to talk about it, or anything else.`;
    } else if (latestMood !== null && latestMood >= 7) {
      greeting = `Hi ${firstName}. Looks like things are going well. What's on your mind?`;
    } else if (memoryInfo.hasMemories) {
      // Has memories but no specific context
      greeting = `Hey ${firstName}. Good to see you. What's on your mind today?`;
    } else if (hour < 12) {
      greeting = `Good morning, ${firstName}. How are you doing today? I'm here to listen.`;
    } else if (hour < 17) {
      greeting = `Hey ${firstName}. How's your afternoon going? I'm here if you want to chat.`;
    } else {
      greeting = `Hey ${firstName}. How are you doing this evening? I'm here to listen.`;
    }

    const greetingMessage: Message = {
      id: 'greeting',
      role: 'assistant',
      content: greeting,
      timestamp: new Date(),
    };

    setMessages([greetingMessage]);
    setHasGreeted(true);
  }, [userId, firstName, latestMood, hasGreeted, memoryInfo, recentSessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Get suggestions based on mood
  const getSuggestions = useCallback(() => {
    if (latestMood !== null && latestMood <= 4) {
      return ["I can't stop thinking about them", "I feel lonely", "Help me calm down"];
    } else if (latestMood !== null && latestMood >= 7) {
      return ["I had a good day", "Something triggered me", "I want to reflect"];
    }
    return ["I'm having a rough day", "Help me process something", "I want to celebrate a win"];
  }, [latestMood]);

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;

    // Rate limiting (3 seconds)
    const now = Date.now();
    if (now - lastSentAt < 3000) {
      return;
    }
    setLastSentAt(now);

    // Check max messages
    if (messages.length >= 50) {
      const limitMessage: Message = {
        id: `limit-${Date.now()}`,
        role: 'assistant',
        content: "We've been chatting for a while. Feel free to come back anytime — I'll be here.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, limitMessage]);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Track message sent
    trackEvent('chat_message_sent', { messageCount: messages.length + 1 });

    try {
      // Build conversation history
      const conversationHistory = messages
        .filter(m => m.id !== 'greeting')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session message count (every 5 messages to reduce API calls)
      const newCount = messagesSinceLastUpdate + 2; // user + assistant
      setMessagesSinceLastUpdate(newCount);
      if (sessionId && newCount >= 5) {
        updateChatSession(sessionId, messages.length + 2, supabase);
        setMessagesSinceLastUpdate(0);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Give me a moment and try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full" />
      </div>
    );
  }

  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="flex-shrink-0 px-4 py-4 flex items-center gap-4 border-b"
        style={{ background: 'var(--bg-warm)', borderColor: 'var(--border-light)' }}
      >
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-card)' }}
        >
          <ArrowLeftIcon className="w-5 h-5" style={{ color: 'var(--text-sec)' }} />
        </Link>
        <div className="flex items-center gap-2">
          <h1
            className="text-[18px] font-semibold"
            style={{ fontFamily: 'var(--font-fraunces), Fraunces, serif', color: 'var(--text)' }}
          >
            Pace
          </h1>
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
          {memoryInfo.hasMemories && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(126,113,181,0.15)', color: '#7E71B5' }}
              title="Pace remembers you"
            >
              <SparklesIcon className="w-3 h-3" />
              <span>Remembers you</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div className="pt-4">
            <SuggestionPills suggestions={getSuggestions()} onSelect={sendMessage} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 px-4 py-3 border-t"
        style={{
          background: 'rgba(249,246,242,0.95)',
          backdropFilter: 'blur(10px)',
          borderColor: 'var(--border-light)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-3">
          <div
            className="flex-1 rounded-3xl px-5 py-3"
            style={{ background: 'var(--bg-warm)', border: '1px solid var(--border-light)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Pace..."
              rows={1}
              className="w-full bg-transparent outline-none resize-none text-[15px]"
              style={{ color: 'var(--text)', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: input.trim() && !isTyping ? 'var(--primary)' : 'var(--border)',
              cursor: input.trim() && !isTyping ? 'pointer' : 'default',
            }}
          >
            <ArrowUpIcon
              className="w-5 h-5"
              style={{ color: input.trim() && !isTyping ? 'white' : 'var(--text-muted)' }}
            />
          </button>
        </div>
      </form>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

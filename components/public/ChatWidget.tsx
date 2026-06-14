'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, SendHorizonal } from 'lucide-react';

const BUBBLE_STYLES = `
  @keyframes nidhi-float {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-5px) scale(1.03); }
  }
  @keyframes nidhi-snap {
    0%   { transform: scale(1); }
    40%  { transform: scale(0.82); }
    70%  { transform: scale(1.18); }
    100% { transform: scale(1); }
  }
  .nidhi-float  { animation: nidhi-float 3s ease-in-out infinite; }
  .nidhi-snap   { animation: nidhi-snap 0.35s cubic-bezier(.36,.07,.19,.97); }
  .nidhi-bubble:hover { animation: none; }
`;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type Message = { role: 'user' | 'assistant'; content: string };
type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const GREETING =
  "Hi, I'm Nidhi! I'm here to help you with information about Atmaram Child Care and Critical Care. Feel free to ask me about our departments, doctors, OPD timings, or how to book an appointment.";

const GAP = 24;
const BTN = 56;

function snapToCorner(x: number, y: number): Corner {
  const right = x > window.innerWidth / 2;
  const bottom = y > window.innerHeight / 2;
  if (bottom && right) return 'bottom-right';
  if (bottom && !right) return 'bottom-left';
  if (!bottom && right) return 'top-right';
  return 'top-left';
}

function bubblePos(corner: Corner): React.CSSProperties {
  switch (corner) {
    case 'bottom-right': return { bottom: GAP, right: GAP };
    case 'bottom-left':  return { bottom: GAP, left: GAP };
    case 'top-right':    return { top: GAP + 64, right: GAP };
    case 'top-left':     return { top: GAP + 64, left: GAP };
  }
}

function panelPos(corner: Corner): React.CSSProperties {
  switch (corner) {
    case 'bottom-right': return { bottom: GAP + BTN + 8, right: GAP };
    case 'bottom-left':  return { bottom: GAP + BTN + 8, left: GAP };
    case 'top-right':    return { top: GAP + 64 + BTN + 8, right: GAP };
    case 'top-left':     return { top: GAP + 64 + BTN + 8, left: GAP };
  }
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      bubbleRef.current?.focus();
    }
  }, [isOpen]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    didDrag.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const moved =
      Math.abs(e.clientX - dragStart.current.x) > 6 ||
      Math.abs(e.clientY - dragStart.current.y) > 6;
    if (moved) {
      didDrag.current = true;
      setIsDragging(true);
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (didDrag.current) {
      setCorner(snapToCorner(e.clientX, e.clientY));
      setIsDragging(false);
      setIsSnapping(true);
      setTimeout(() => setIsSnapping(false), 350);
    }
    dragStart.current = null;
  }, []);

  function handleBubbleClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (messages.length === 0) {
        setMessages([{ role: 'assistant', content: GREETING }]);
      }
    }
  }

  async function sendMessage(text: string) {
    if (text.trim() === '' || isStreaming) return;
    const userText = text.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setIsStreaming(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Something went wrong. Please try again, or call us.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <Card
          className="fixed w-[360px] h-[500px] z-50 flex flex-col shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={panelPos(corner)}
          role="dialog"
          aria-label="Nidhi — Atmaram chat assistant"
          aria-modal="false"
        >
          {/* Panel Header */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{ backgroundColor: '#1E3A5F', height: '56px' }}
          >
            <span className="text-white font-semibold" style={{ fontSize: '15px' }}>
              Nidhi — Atmaram Child Care
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-white/70 hover:text-white hover:bg-transparent"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Message List */}
          <CardContent
            className="flex flex-col flex-1 overflow-y-auto p-4 gap-3"
            style={{ backgroundColor: '#F8FAFC' }}
            aria-live="polite"
          >
            {messages.map((msg, idx) => {
              const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1;
              const showTyping = isLastAssistant && isStreaming && msg.content === '';
              return (
                <div
                  key={idx}
                  className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  {msg.role === 'user' ? (
                    <span className="bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm leading-relaxed max-w-[80%]">
                      {msg.content}
                    </span>
                  ) : showTyping ? (
                    <span className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-900 rounded-2xl rounded-bl-sm px-4 py-2 text-sm leading-relaxed max-w-[80%]">
                      {msg.content}
                    </span>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Composer */}
          <div className="border-t border-border p-3 bg-white flex gap-2 shrink-0">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isStreaming}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className="shrink-0"
              style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
            >
              <SendHorizonal size={16} className="text-white" />
            </Button>
          </div>
        </Card>
      )}

      {/* FAB Bubble — draggable, snaps to nearest corner on release */}
      <style>{BUBBLE_STYLES}</style>
      <div className="fixed z-50" style={bubblePos(corner)}>
        {/* Ping ring — only when closed and idle */}
        {!isOpen && !isDragging && (
          <span
            className="absolute inset-0 rounded-full opacity-40 animate-ping"
            style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
          />
        )}
        <button
          ref={bubbleRef}
          onClick={handleBubbleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
          }}
          className={[
            'relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center select-none nidhi-bubble',
            isSnapping ? 'nidhi-snap' : !isDragging && !isOpen ? 'nidhi-float' : '',
          ].join(' ')}
          aria-label={isOpen ? 'Close chat' : 'Open Nidhi chat assistant'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <MessageCircle size={24} className="text-white" />
          )}
        </button>
      </div>
    </>
  );
}

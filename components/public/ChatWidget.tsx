'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type Message = { role: 'user' | 'assistant'; content: string };

const GREETING =
  "Hi, I'm Nidhi! I'm here to help you with information about Atmaram Child Care and Critical Care. Feel free to ask me about our departments, doctors, OPD timings, or how to book an appointment.";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      bubbleRef.current?.focus();
    }
  }, [isOpen]);

  function handleOpen() {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: GREETING }]);
    }
  }

  function handleClose() {
    setIsOpen(false);
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

      if (!res.ok || !res.body) {
        throw new Error('Stream failed');
      }

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
          className="fixed bottom-24 right-12 w-[360px] h-[500px] z-50 flex flex-col shadow-xl rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
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
              onClick={handleClose}
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
              const isLastAssistant =
                msg.role === 'assistant' && idx === messages.length - 1;
              const showTypingIndicator =
                isLastAssistant && isStreaming && msg.content === '';

              return (
                <div
                  key={idx}
                  className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  {msg.role === 'user' ? (
                    <span className="bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm leading-relaxed max-w-[80%]">
                      {msg.content}
                    </span>
                  ) : showTypingIndicator ? (
                    <span className="bg-slate-100 text-slate-900 rounded-2xl rounded-bl-sm px-4 py-2 text-sm leading-relaxed max-w-[80%] flex items-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
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

          {/* Message Composer */}
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
              className="bg-primary hover:bg-primary/90 shrink-0"
            >
              <SendHorizonal size={16} className="text-white" />
            </Button>
          </div>
        </Card>
      )}

      {/* FAB Bubble Button */}
      <button
        ref={bubbleRef}
        onClick={isOpen ? handleClose : handleOpen}
        className="fixed bottom-8 right-12 w-14 h-14 rounded-full bg-primary z-50 shadow-lg hover:scale-105 hover:brightness-110 transition-transform duration-150 flex items-center justify-center"
        aria-label={isOpen ? 'Close chat' : 'Open Atmaram chat assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </button>
    </>
  );
}

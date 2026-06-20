import { GoogleGenAI } from '@google/genai';
import { HOSPITAL_KNOWLEDGE } from '@/lib/chat/hospital-knowledge';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// SEC-02: Per-message character limit to prevent cost-amplification DoS.
// A hospital chat message has no legitimate need for more than 2000 characters.
const MAX_MESSAGE_LENGTH = 2000;

// --- Rate limiting (CR-001) ---
// Simple in-memory rate limiter (resets on cold start — acceptable for this scale)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20        // requests
const WINDOW_MS  = 60_000    // per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// Periodic cleanup to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 5 * 60_000)

// --- CORS allowlist (CR-003) ---
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
].filter(Boolean) as string[]

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true  // same-origin server-to-server calls
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return new Response(null, { status: 403 })
  }
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': origin ?? '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  // CR-003: Origin check
  const origin = request.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // CR-001: Rate limiting
  const ip =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  if (!checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json();
    const { messages } = body as { messages: Array<{ role: string; content: string }> };

    // Validate input
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CR-002: Reject oversized message arrays before any iteration
    if (messages.length > 50) {
      return Response.json({ error: 'Too many messages' }, { status: 400 })
    }

    for (const m of messages) {
      if (
        typeof m.role !== 'string' ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string'
      ) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // SEC-02: Reject messages that exceed the per-message length cap.
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'Message too long. Please keep messages under 2000 characters.' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Limit history depth to prevent cost amplification
    const safeMessages = messages.slice(-20);

    // Map to Gemini content format — 'assistant' must become 'model'
    const mappedContents = safeMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: mappedContents,
      config: { systemInstruction: HOSPITAL_KNOWLEDGE },
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

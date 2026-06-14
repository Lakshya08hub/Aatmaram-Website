import { GoogleGenAI } from '@google/genai';
import { HOSPITAL_KNOWLEDGE } from '@/lib/chat/hospital-knowledge';
import { NextRequest } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
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

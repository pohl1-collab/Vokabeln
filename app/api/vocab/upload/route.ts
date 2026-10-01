export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    const base64Buffer = await file.arrayBuffer();
    const base64String = Buffer.from(base64Buffer).toString('base64');
    const mimeType = file.type || 'image/png';

    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'image_url' as const,
            image_url: { url: `data:${mimeType};base64,${base64String}` },
          },
          {
            type: 'text' as const,
            text: `Du bist ein Vokabel-Extractor. Analysiere dieses Bild und extrahiere alle deutschen und englischen Wörter/Phrasen daraus.

Wenn du deutsche Wörter findest, übersetze sie ins Englische.
Wenn du englische Wörter findest, übersetze sie ins Deutsche.
Wenn du Wortpaare (Deutsch-Englisch) findest, behalte die Zuordnung bei.

Antworte NUR als JSON-Array mit Objekten, OHNE Code-Blöcke oder Markdown:
[{"german": "deutsches Wort", "english": "english word"}, ...]

Wenn keine Vokabeln erkannt werden, antworte mit einem leeren Array: []
Antwort NUR als reines JSON, keine weiteren Erklärungen.`,
          },
        ],
      },
    ];

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        stream: true,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('LLM API error:', errText);
      return NextResponse.json({ error: 'KI-Analyse fehlgeschlagen' }, { status: 502 });
    }

    const reader = llmResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'Kein Stream verfügbar' }, { status: 502 });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = '';
    let partialRead = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Parse the buffer
                  let vocabs: any[] = [];
                  try {
                    const parsed = JSON.parse(buffer);
                    if (Array.isArray(parsed)) {
                      vocabs = parsed;
                    } else if (parsed?.vocabularies || parsed?.words || parsed?.vocab) {
                      vocabs = parsed.vocabularies ?? parsed.words ?? parsed.vocab ?? [];
                    } else {
                      // Try to find an array in the parsed object
                      const vals = Object.values(parsed);
                      for (const v of vals) {
                        if (Array.isArray(v)) { vocabs = v as any[]; break; }
                      }
                    }
                  } catch {
                    // try to extract JSON array from buffer
                    const match = buffer.match(/\[.*\]/s);
                    if (match) {
                      try { vocabs = JSON.parse(match[0]); } catch { vocabs = []; }
                    }
                  }
                  const finalData = JSON.stringify({ status: 'completed', result: vocabs });
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? '';
                  buffer += content;
                  const progressData = JSON.stringify({ status: 'processing', message: 'Analysiere Bild...' });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch {
                  // skip invalid JSON
                }
              }
            }
          }
          // If we get here without [DONE], try to parse buffer
          if (buffer) {
            let vocabs: any[] = [];
            try {
              const parsed = JSON.parse(buffer);
              if (Array.isArray(parsed)) vocabs = parsed;
              else {
                const vals = Object.values(parsed ?? {});
                for (const v of vals) {
                  if (Array.isArray(v)) { vocabs = v as any[]; break; }
                }
              }
            } catch { /* ignore */ }
            const finalData = JSON.stringify({ status: 'completed', result: vocabs });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          }
          controller.close();
        } catch (error: any) {
          console.error('Stream error:', error);
          const errData = JSON.stringify({ status: 'error', message: error?.message ?? 'Stream-Fehler' });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}

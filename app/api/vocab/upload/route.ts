export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { normalizePair } from '@/lib/language';

// Extrahiert ein Vokabel-Array aus einer beliebigen KI-Antwort (Array, Objekt
// mit Array-Feld, oder JSON-Array irgendwo im Text).
function extractVocabs(content: string): any[] {
  const text = (content ?? '').trim();
  if (!text) return [];
  // 1) direkter Parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const direct = parsed.vocabularies ?? parsed.words ?? parsed.vocab ?? parsed.vocabs;
      if (Array.isArray(direct)) return direct;
      for (const v of Object.values(parsed)) {
        if (Array.isArray(v)) return v as any[];
      }
    }
  } catch {
    // ignorieren, Fallback unten
  }
  // 2) JSON-Array aus Text herausziehen (z.B. falls Markdown-Codeblock)
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) return arr;
    } catch {
      // ignorieren
    }
  }
  return [];
}

// Liest die Gesamt-Übersetzung (und den Originaltext) aus der KI-Antwort, falls vorhanden.
function extractTranslation(content: string): { originalText: string; germanTranslation: string } {
  const text = (content ?? '').trim();
  const candidates = [text, text.match(/\{[\s\S]*\}/)?.[0] ?? ''];
  for (const c of candidates) {
    if (!c) continue;
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          originalText: String(parsed.originalText ?? parsed.original ?? ''),
          germanTranslation: String(parsed.germanTranslation ?? parsed.translation ?? parsed.deutsch ?? ''),
        };
      }
    } catch {
      // ignorieren
    }
  }
  return { originalText: '', germanTranslation: '' };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  // Vorab-Check: Ohne API-Schlüssel kann die KI-Bilderkennung nicht laufen.
  // Klare Meldung statt eines verschluckten Fehlers ("Bild analysiert" ohne Ergebnis).
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    console.error('ABACUSAI_API_KEY fehlt – KI-Bilderkennung nicht konfiguriert.');
    return NextResponse.json(
      {
        error:
          'Die KI-Bilderkennung ist noch nicht eingerichtet. Es fehlt der API-Schlüssel (ABACUSAI_API_KEY) in den Projekt-Einstellungen. Bitte trage ihn in den Einstellungen (Environment Variables) ein und starte einen neuen Deploy.',
      },
      { status: 503 },
    );
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
            text: `Du bist ein Vokabel- und Übersetzungs-Assistent für deutschsprachige Lernende. Lies den GESAMTEN Text auf diesem Bild (OCR) – einzelne Wörter, Wortpaare UND ganze Sätze.

Regeln:
1. "originalText": der erkannte Text genau so, wie er auf dem Bild steht (Zeilenumbrüche mit \\n).
2. "germanTranslation": der komplette erkannte Text als natürliche deutsche Übersetzung (ganze Sätze vollständig übersetzen, nicht Wort für Wort). Ist der Text bereits Deutsch, gib ihn unverändert zurück.
3. "vocabularies": Liste von Lernpaaren. Jedes Wort, jede Phrase und jeder ganze Satz wird ein eigener Eintrag.
   - Das Feld "german" enthält IMMER den deutschen Text, das Feld "english" IMMER den englischen Text.
   - Steht auf dem Bild Englisch (oder eine andere Fremdsprache), kommt der Originaltext ins Feld "english" und die deutsche Übersetzung ins Feld "german".
   - Steht auf dem Bild Deutsch, kommt der Originaltext ins Feld "german" und die englische Übersetzung ins Feld "english".
   - Sind bereits Wortpaare (Deutsch–Englisch) abgebildet, behalte die Zuordnung bei – achte aber darauf, dass Deutsch in "german" und Englisch in "english" landet.
   - Ganze Sätze NICHT in einzelne Wörter zerlegen, sondern als vollständigen Satz übersetzen.

Antworte NUR mit reinem JSON (ohne Code-Blöcke, ohne Markdown, ohne Erklärungen) in genau diesem Format:
{"originalText": "...", "germanTranslation": "...", "vocabularies": [{"german": "deutscher Text", "english": "english text"}]}

Wenn kein Text erkannt wird: {"originalText": "", "germanTranslation": "", "vocabularies": []}`,
          },
        ],
      },
    ];

    let llmResponse: Response;
    try {
      llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          messages,
          stream: false,
          max_tokens: 4000,
        }),
      });
    } catch (netErr: any) {
      console.error('LLM Netzwerkfehler:', netErr);
      return NextResponse.json(
        { error: 'Die KI-Analyse ist nicht erreichbar. Bitte versuche es später erneut.' },
        { status: 502 },
      );
    }

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => '');
      console.error('LLM API error:', llmResponse.status, errText);
      // Fehler NICHT verschlucken: spezifische, verständliche Meldung je nach Ursache.
      let msg = 'Die KI-Analyse ist fehlgeschlagen.';
      if (llmResponse.status === 401 || llmResponse.status === 403 || /invalid api key/i.test(errText)) {
        msg =
          'Die KI-Analyse wurde abgelehnt (ungültiger oder fehlender API-Schlüssel). Bitte prüfe den Schlüssel ABACUSAI_API_KEY in den Projekt-Einstellungen.';
      } else if (llmResponse.status === 429) {
        msg = 'Die KI-Analyse ist derzeit überlastet (Limit erreicht). Bitte versuche es in ein paar Minuten erneut.';
      }
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await llmResponse.json().catch(() => null);
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    // Felder vereinheitlichen und vertauschte Paare (Englisch im Feld "german") korrigieren.
    const vocabs = extractVocabs(content)
      .map((v: any) => ({
        german: String(v?.german ?? v?.deutsch ?? '').trim(),
        english: String(v?.english ?? v?.englisch ?? '').trim(),
      }))
      .filter((v) => v.german || v.english)
      .map(normalizePair);
    const { originalText, germanTranslation } = extractTranslation(content);

    // Ergebnis als Event-Stream zurückgeben (Frontend erwartet SSE mit status "completed").
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const finalData = JSON.stringify({ status: 'completed', result: vocabs, originalText, germanTranslation });
        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        controller.close();
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
    return NextResponse.json({ error: 'Upload fehlgeschlagen: ' + (err?.message ?? 'Unbekannter Fehler') }, { status: 500 });
  }
}

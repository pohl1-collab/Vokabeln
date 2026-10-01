'use client';
import { useState } from 'react';
import { GraduationCap, BookOpen, CheckCircle2, PenLine, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FadeIn, Stagger, StaggerItem, HoverLift } from '@/components/ui/animate';
import { toast } from 'sonner';
import { FlashcardMode } from './flashcard-mode';
import { MultipleChoiceMode } from './multiple-choice-mode';
import { WritingMode } from './writing-mode';
import { SpacedMode } from './spaced-mode';

const modes = [
  { id: 'flashcard', label: 'Karteikarten', icon: BookOpen, desc: 'Karte umdrehen, Gewusst/Nicht gewusst' },
  { id: 'multiplechoice', label: 'Multiple Choice', icon: CheckCircle2, desc: '4 Antwortmöglichkeiten, eine richtige' },
  { id: 'writing', label: 'Schreiben', icon: PenLine, desc: 'Übersetzung eintippen' },
  { id: 'spaced', label: 'Spaced Repetition', icon: RotateCcw, desc: 'Intelligente Wiederholung' },
];

interface VocabItem {
  id: string;
  germanWord: string;
  englishWord: string;
}

export function LearnSetup() {
  const [step, setStep] = useState<'setup' | 'learning'>('setup');
  const [selectedMode, setSelectedMode] = useState('flashcard');
  const [direction, setDirection] = useState<'de-en' | 'en-de'>('de-en');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [vocabs, setVocabs] = useState<VocabItem[]>([]);
  const [starting, setStarting] = useState(false);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/learn/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          direction,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'Session starten fehlgeschlagen');
        return;
      }
      setSessionId(data?.sessionId ?? '');
      setVocabs(data?.vocabs ?? []);
      setStep('learning');
    } catch {
      toast.error('Fehler beim Starten der Lernsession');
    } finally {
      setStarting(false);
    }
  };

  const handleFinish = async () => {
    try {
      await fetch('/api/learn/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch { /* ignore */ }
    setStep('setup');
    setVocabs([]);
    setSessionId('');
  };

  if (step === 'learning') {
    const modeProps = { vocabs, sessionId, direction, onFinish: handleFinish };
    switch (selectedMode) {
      case 'flashcard': return <FlashcardMode {...modeProps} />;
      case 'multiplechoice': return <MultipleChoiceMode {...modeProps} />;
      case 'writing': return <WritingMode {...modeProps} />;
      case 'spaced': return <SpacedMode {...modeProps} />;
      default: return <FlashcardMode {...modeProps} />;
    }
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="font-display text-3xl font-bold tracking-tight">Lernen</h1>
        <p className="text-muted-foreground mt-1">Wähle Modus, Richtung und Zeitraum</p>
      </FadeIn>

      {/* Mode Selection */}
      <Stagger staggerDelay={0.1}>
        <div className="grid gap-3 sm:grid-cols-2">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = selectedMode === m.id;
            return (
              <StaggerItem key={m.id}>
                <HoverLift>
                  <button
                    onClick={() => setSelectedMode(m.id)}
                    className={`w-full rounded-xl p-4 text-left transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                        : 'bg-card hover:bg-accent'
                    }`}
                    style={{ boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className={`text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{m.desc}</p>
                      </div>
                    </div>
                  </button>
                </HoverLift>
              </StaggerItem>
            );
          })}
        </div>
      </Stagger>

      {/* Direction */}
      <FadeIn delay={0.2}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base">Lernrichtung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                variant={direction === 'de-en' ? 'default' : 'outline'}
                onClick={() => setDirection('de-en')}
                className="flex-1"
              >
                Deutsch → Englisch
              </Button>
              <Button
                variant={direction === 'en-de' ? 'default' : 'outline'}
                onClick={() => setDirection('en-de')}
                className="flex-1"
              >
                Englisch → Deutsch
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Date Range */}
      <FadeIn delay={0.3}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-base">Zeitraum (optional)</CardTitle>
            <CardDescription>Leer lassen für alle Vokabeln</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3">
              <Input type="date" value={fromDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)} className="w-44" />
              <span className="text-muted-foreground text-sm">bis</span>
              <Input type="date" value={toDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)} className="w-44" />
              {(fromDate || toDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
                  Zurücksetzen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Start */}
      <FadeIn delay={0.4}>
        <Button size="lg" onClick={startSession} disabled={starting} className="gap-2 w-full sm:w-auto">
          <GraduationCap className="h-5 w-5" />
          {starting ? 'Starte...' : 'Lernsession starten'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </FadeIn>
    </div>
  );
}

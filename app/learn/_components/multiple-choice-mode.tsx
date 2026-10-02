'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useLearnQueue } from './use-learn-queue';

interface Props {
  vocabs: { id: string; germanWord: string; englishWord: string }[];
  sessionId: string;
  direction: 'de-en' | 'en-de';
  onFinish: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function MultipleChoiceMode({ vocabs, sessionId, direction, onFinish }: Props) {
  const {
    current, total, remaining, repeatsPending, isRepeat,
    mastered, firstTryCorrect, done, step, answer,
  } = useLearnQueue(vocabs, sessionId);
  const [selected, setSelected] = useState<string | null>(null);

  const question = direction === 'de-en' ? current?.germanWord : current?.englishWord;
  const correctAnswer = direction === 'de-en' ? current?.englishWord : current?.germanWord;

  const options = useMemo(() => {
    if (!current) return [];
    const pool = vocabs.filter((v) => v.id !== current.id);
    const wrongOnes = shuffle(pool).slice(0, 3).map((v) => direction === 'de-en' ? v.englishWord : v.germanWord);
    return shuffle([correctAnswer ?? '', ...wrongOnes]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, current?.id]);

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const isCorrect = opt === correctAnswer;
    setTimeout(() => {
      setSelected(null);
      answer(isCorrect);
    }, 1200);
  };

  if (done || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-6xl font-display font-bold text-primary">{firstTryCorrect}/{total}</div>
        <p className="text-xl text-muted-foreground">Multiple Choice abgeschlossen!</p>
        <p className="text-muted-foreground">Auf Anhieb gewusst: {total > 0 ? Math.round((firstTryCorrect / total) * 100) : 0}%</p>
        <Button onClick={onFinish} className="gap-2"><ArrowLeft className="h-4 w-4" /> Zurück</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onFinish} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Beenden
        </Button>
        <span className="text-sm text-muted-foreground">Noch {remaining} {remaining === 1 ? 'Karte' : 'Karten'}</span>
      </div>
      <Progress value={total > 0 ? (mastered / total) * 100 : 0} />

      {repeatsPending > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {mastered} von {total} gemeistert · {repeatsPending} zur Wiederholung
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {isRepeat && (
            <div className="mb-3 flex justify-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                <RotateCcw className="h-3 w-3" /> Wiederholung
              </span>
            </div>
          )}
          <Card className="text-center" style={{ boxShadow: 'var(--shadow-lg)' }}>
            <CardContent className="p-8">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                {direction === 'de-en' ? 'Deutsch' : 'Englisch'}
              </p>
              <p className="text-3xl font-display font-bold tracking-tight mb-8">{question}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt, i) => {
                  let variant: 'outline' | 'default' | 'destructive' = 'outline';
                  if (selected) {
                    if (opt === correctAnswer) variant = 'default';
                    else if (opt === selected) variant = 'destructive';
                  }
                  return (
                    <Button
                      key={i}
                      variant={variant}
                      size="lg"
                      className="justify-start gap-2 h-auto py-3 px-4 text-left"
                      onClick={() => handleSelect(opt)}
                      disabled={!!selected}
                    >
                      {selected && opt === correctAnswer && <Check className="h-4 w-4 shrink-0" />}
                      {selected && opt === selected && opt !== correctAnswer && <X className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{opt}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useLearnQueue } from './use-learn-queue';

interface Props {
  vocabs: { id: string; germanWord: string; englishWord: string }[];
  sessionId: string;
  direction: 'de-en' | 'en-de';
  onFinish: () => void;
}

function isCloseEnough(input: string, answer: string): boolean {
  const a = input.trim().toLowerCase();
  const b = answer.trim().toLowerCase();
  if (a === b) return true;
  // Allow 1 typo for words >= 4 chars
  if (b.length >= 4) {
    let diff = 0;
    const maxLen = Math.max(a.length, b.length);
    if (Math.abs(a.length - b.length) > 1) return false;
    for (let i = 0; i < maxLen; i++) {
      if (a[i] !== b[i]) diff++;
    }
    return diff <= 1;
  }
  return false;
}

export function WritingMode({ vocabs, sessionId, direction, onFinish }: Props) {
  const {
    current, total, remaining, repeatsPending, isRepeat,
    mastered, firstTryCorrect, done, step, answer,
  } = useLearnQueue(vocabs, sessionId);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  const question = direction === 'de-en' ? current?.germanWord : current?.englishWord;
  const correctAnswer = direction === 'de-en' ? current?.englishWord : current?.germanWord;

  const checkAnswer = () => {
    const isCorrect = isCloseEnough(input, correctAnswer ?? '');
    setWasCorrect(isCorrect);
    setChecked(true);
  };

  const next = () => {
    const ok = wasCorrect;
    setInput('');
    setChecked(false);
    setWasCorrect(false);
    answer(ok);
  };

  if (done || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-6xl font-display font-bold text-primary">{firstTryCorrect}/{total}</div>
        <p className="text-xl text-muted-foreground">Schreib-Modus abgeschlossen!</p>
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
          <Card style={{ boxShadow: 'var(--shadow-lg)' }}>
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                  {direction === 'de-en' ? 'Übersetze ins Englische' : 'Übersetze ins Deutsche'}
                </p>
                <p className="text-3xl font-display font-bold tracking-tight">{question}</p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder={direction === 'de-en' ? 'Englische Übersetzung...' : 'Deutsche Übersetzung...'}
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !checked) checkAnswer(); }}
                  disabled={checked}
                  className="text-center text-lg"
                  autoFocus
                />
                {checked && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    {wasCorrect ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Richtig!</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-2 text-destructive">
                          <X className="h-5 w-5" />
                          <span className="font-medium">Falsch</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Richtige Antwort: <strong>{correctAnswer}</strong></p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex justify-center">
                {!checked ? (
                  <Button onClick={checkAnswer} disabled={!input.trim()} className="gap-2">
                    <Check className="h-4 w-4" /> Prüfen
                  </Button>
                ) : (
                  <Button onClick={next} className="gap-2">
                    Weiter <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

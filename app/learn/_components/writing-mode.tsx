'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

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
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const total = vocabs?.length ?? 0;
  const current = vocabs?.[index];
  const question = direction === 'de-en' ? current?.germanWord : current?.englishWord;
  const answer = direction === 'de-en' ? current?.englishWord : current?.germanWord;

  const checkAnswer = async () => {
    const isCorrect = isCloseEnough(input, answer ?? '');
    setWasCorrect(isCorrect);
    setChecked(true);
    if (isCorrect) setCorrect((c) => c + 1);
    try {
      await fetch('/api/learn/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, vocabId: current?.id, correct: isCorrect }),
      });
    } catch { /* ignore */ }
  };

  const next = () => {
    setInput('');
    setChecked(false);
    setWasCorrect(false);
    if (index + 1 >= total) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-6xl font-display font-bold text-primary">{correct}/{total}</div>
        <p className="text-xl text-muted-foreground">Schreib-Modus abgeschlossen!</p>
        <p className="text-muted-foreground">Trefferquote: {total > 0 ? Math.round((correct / total) * 100) : 0}%</p>
        <Button onClick={onFinish} className="gap-2"><ArrowLeft className="h-4 w-4" /> Zurück</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onFinish} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Abbrechen
        </Button>
        <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
      </div>
      <Progress value={total > 0 ? ((index) / total) * 100 : 0} />

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
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
                        <p className="text-sm text-muted-foreground">Richtige Antwort: <strong>{answer}</strong></p>
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

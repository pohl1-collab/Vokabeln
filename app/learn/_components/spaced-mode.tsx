'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Smile, Meh, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  vocabs: { id: string; germanWord: string; englishWord: string }[];
  sessionId: string;
  direction: 'de-en' | 'en-de';
  onFinish: () => void;
}

export function SpacedMode({ vocabs, sessionId, direction, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const total = vocabs?.length ?? 0;
  const current = vocabs?.[index];
  const front = direction === 'de-en' ? current?.germanWord : current?.englishWord;
  const back = direction === 'de-en' ? current?.englishWord : current?.germanWord;

  const rate = async (quality: number) => {
    const isCorrect = quality >= 3;
    if (isCorrect) setCorrect((c) => c + 1);
    try {
      await fetch('/api/learn/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, vocabId: current?.id, correct: isCorrect }),
      });
    } catch { /* ignore */ }

    setFlipped(false);
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
        <p className="text-xl text-muted-foreground">Spaced Repetition abgeschlossen!</p>
        <p className="text-muted-foreground">Die Wiederholungsintervalle wurden aktualisiert.</p>
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

      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md"
          >
            <Card
              className="cursor-pointer min-h-[250px] flex items-center justify-center"
              style={{ boxShadow: 'var(--shadow-lg)' }}
              onClick={() => setFlipped(!flipped)}
            >
              <CardContent className="p-8 text-center">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                  {flipped
                    ? (direction === 'de-en' ? 'Englisch' : 'Deutsch')
                    : (direction === 'de-en' ? 'Deutsch' : 'Englisch')}
                </p>
                <p className="text-3xl font-display font-bold tracking-tight">
                  {flipped ? back : front}
                </p>
                {!flipped && (
                  <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Tippen zum Umdrehen
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center">
          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-red-400 text-red-600 hover:bg-red-50"
              onClick={() => rate(1)}
            >
              <Frown className="h-5 w-5" /> Schwer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              onClick={() => rate(3)}
            >
              <Meh className="h-5 w-5" /> Mittel
            </Button>
            <Button
              size="lg"
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => rate(5)}
            >
              <Smile className="h-5 w-5" /> Leicht
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

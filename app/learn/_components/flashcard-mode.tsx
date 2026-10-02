'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowLeft, RotateCcw } from 'lucide-react';
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

export function FlashcardMode({ vocabs, sessionId, direction, onFinish }: Props) {
  const {
    current, total, remaining, repeatsPending, isRepeat,
    mastered, firstTryCorrect, done, step, answer,
  } = useLearnQueue(vocabs, sessionId);
  const [flipped, setFlipped] = useState(false);

  const front = direction === 'de-en' ? current?.germanWord : current?.englishWord;
  const back = direction === 'de-en' ? current?.englishWord : current?.germanWord;

  const handleAnswer = (wasCorrect: boolean) => {
    setFlipped(false);
    answer(wasCorrect);
  };

  if (done || !current) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="text-6xl font-display font-bold text-primary">{firstTryCorrect}/{total}</div>
        <p className="text-xl text-muted-foreground">Karteikarten abgeschlossen!</p>
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

      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-md"
          >
            {isRepeat && (
              <div className="mb-3 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  <RotateCcw className="h-3 w-3" /> Wiederholung
                </span>
              </div>
            )}
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
          className="flex justify-center gap-4"
        >
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleAnswer(false)}
          >
            <ThumbsDown className="h-5 w-5" /> Nicht gewusst
          </Button>
          <Button
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleAnswer(true)}
          >
            <ThumbsUp className="h-5 w-5" /> Gewusst
          </Button>
        </motion.div>
      )}
    </div>
  );
}

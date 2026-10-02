'use client';
import { useState } from 'react';

export interface QueueCard {
  id: string;
  germanWord: string;
  englishWord: string;
}

// Wie viele andere Karten zwischen einer falschen Karte und ihrer Wiederholung
// liegen sollen, bevor sie erneut drankommt.
const REQUEUE_GAP = 3;

/**
 * Verwaltet die Lern-Warteschlange einer Sitzung.
 *
 * - Karten, die der Nutzer mit "nicht gewusst" markiert, werden wieder in die
 *   Warteschlange eingereiht (nach einigen weiteren Karten bzw. ans Ende) und
 *   kommen in derselben Sitzung erneut dran.
 * - Die Sitzung endet erst, wenn jede Karte einmal gewusst wurde (oder der
 *   Nutzer abbricht).
 * - Der Fortschritt (SM-2 / DB) wird pro Karte NUR EINMAL pro Sitzung gewertet
 *   (beim ersten Beantworten), damit Wiederholungen die Statistik nicht
 *   verfälschen.
 */
export function useLearnQueue(initial: QueueCard[], sessionId: string) {
  const [queue, setQueue] = useState<QueueCard[]>(() => [...initial]);
  const [step, setStep] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [done, setDone] = useState(initial.length === 0);
  // Karten, die bereits an das Backend gemeldet wurden (einmalige Wertung).
  const [scored] = useState<Set<string>>(() => new Set());
  // Karten, die in dieser Sitzung mindestens einmal falsch waren.
  const [failed] = useState<Set<string>>(() => new Set());

  const total = initial.length;
  const current: QueueCard | undefined = queue[0];
  const isRepeat = current ? failed.has(current.id) : false;
  const remaining = queue.length; // noch zu meisternde Karten (inkl. Wiederholungen)
  const repeatsPending = queue.filter((c) => failed.has(c.id)).length;

  const answer = (wasCorrect: boolean) => {
    const card = queue[0];
    if (!card) return;
    const id = card.id;

    // Fortschritt nur beim ERSTEN Beantworten dieser Karte melden.
    const firstTime = !scored.has(id);
    if (firstTime) {
      scored.add(id);
      fetch('/api/learn/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, vocabId: id, correct: wasCorrect }),
      }).catch(() => {
        /* Netzwerkfehler ignorieren – Lernfluss nicht unterbrechen */
      });
      if (wasCorrect) setFirstTryCorrect((c) => c + 1);
    }

    if (wasCorrect) {
      // Karte gemeistert -> aus der Warteschlange entfernen.
      setMastered((m) => m + 1);
      const next = queue.slice(1);
      setQueue(next);
      if (next.length === 0) setDone(true);
    } else {
      // Karte erneut einreihen, damit sie später wieder drankommt.
      failed.add(id);
      const rest = queue.slice(1);
      const insertAt = Math.min(REQUEUE_GAP, rest.length);
      rest.splice(insertAt, 0, card);
      setQueue(rest);
    }
    setStep((s) => s + 1);
  };

  return {
    current,
    total,
    remaining,
    repeatsPending,
    isRepeat,
    mastered,
    firstTryCorrect,
    done,
    step,
    answer,
  };
}

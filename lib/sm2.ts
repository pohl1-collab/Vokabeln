// SM-2 Spaced Repetition Algorithm
export interface SM2Input {
  quality: number; // 0-5 (0=total fail, 5=perfect)
  repetitions: number;
  easeFactor: number;
  interval: number; // in days
}

export interface SM2Output {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
}

export function sm2(input: SM2Input): SM2Output {
  const { quality, repetitions: reps, easeFactor: ef, interval: intv } = input;
  let newReps = reps;
  let newEF = ef;
  let newInterval = intv;

  if (quality >= 3) {
    // Correct response
    if (reps === 0) {
      newInterval = 1;
    } else if (reps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intv * ef);
    }
    newReps = reps + 1;
  } else {
    // Incorrect — reset
    newReps = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEF = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    repetitions: newReps,
    easeFactor: newEF,
    interval: newInterval,
    nextReview,
  };
}

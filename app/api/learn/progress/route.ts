export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sm2 } from '@/lib/sm2';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  try {
    const body = await request.json();
    const { sessionId, vocabId, correct } = body ?? {};
    if (!sessionId || !vocabId || correct === undefined) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    // Save session entry
    await prisma.sessionEntry.create({
      data: { sessionId, vocabId, correct },
    });

    // Update session stats
    await prisma.learningSession.update({
      where: { id: sessionId },
      data: {
        correctCount: { increment: correct ? 1 : 0 },
      },
    });

    // Update SM-2 progress
    const existing = await prisma.vocabularyProgress.findUnique({
      where: { userId_vocabId: { userId, vocabId } },
    });

    const quality = correct ? 4 : 1;
    const sm2Result = sm2({
      quality,
      repetitions: existing?.repetitions ?? 0,
      easeFactor: existing?.easeFactor ?? 2.5,
      interval: existing?.interval ?? 0,
    });

    await prisma.vocabularyProgress.upsert({
      where: { userId_vocabId: { userId, vocabId } },
      create: {
        userId,
        vocabId,
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        nextReview: sm2Result.nextReview,
        lastReviewed: new Date(),
      },
      update: {
        easeFactor: sm2Result.easeFactor,
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        nextReview: sm2Result.nextReview,
        lastReviewed: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Progress error:', err);
    return NextResponse.json({ error: 'Fortschritt speichern fehlgeschlagen' }, { status: 500 });
  }
}

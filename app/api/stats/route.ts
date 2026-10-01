export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalVocabs, todayVocabs, totalSessions, recentSessions] = await Promise.all([
      prisma.vocabulary.count({ where: { userId } }),
      prisma.vocabulary.count({ where: { userId, dateAdded: { gte: todayStart, lte: todayEnd } } }),
      prisma.learningSession.count({ where: { userId, finishedAt: { not: null } } }),
      prisma.learningSession.findMany({
        where: { userId, finishedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          mode: true,
          direction: true,
          startedAt: true,
          totalCards: true,
          correctCount: true,
        },
      }),
    ]);

    // Calculate overall accuracy
    const allEntries = await prisma.sessionEntry.count({ where: { session: { userId } } });
    const correctEntries = await prisma.sessionEntry.count({ where: { session: { userId }, correct: true } });
    const accuracy = allEntries > 0 ? Math.round((correctEntries / allEntries) * 100) : 0;

    // Due for review
    const dueForReview = await prisma.vocabularyProgress.count({
      where: { userId, nextReview: { lte: new Date() } },
    });

    return NextResponse.json({
      totalVocabs,
      todayVocabs,
      totalSessions,
      accuracy,
      dueForReview,
      recentSessions,
    });
  } catch (err: any) {
    console.error('Stats error:', err);
    return NextResponse.json({ error: 'Statistiken konnten nicht geladen werden' }, { status: 500 });
  }
}

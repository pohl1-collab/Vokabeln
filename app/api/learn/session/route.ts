export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  try {
    const body = await request.json();
    const { mode, direction, from, to } = body ?? {};

    // Load vocabs for the date range
    const where: any = { userId };
    if (from || to) {
      where.dateAdded = {};
      if (from) where.dateAdded.gte = new Date(from + 'T00:00:00.000Z');
      if (to) where.dateAdded.lte = new Date(to + 'T23:59:59.999Z');
    }

    let vocabs;
    if (mode === 'spaced') {
      // For spaced repetition, get vocabs due for review
      const progress = await prisma.vocabularyProgress.findMany({
        where: { userId, nextReview: { lte: new Date() } },
        include: { vocabulary: true },
        orderBy: { nextReview: 'asc' },
        take: 50,
      });
      // Also get vocabs without progress (new ones)
      const existingVocabIds = progress.map((p: any) => p.vocabId);
      const newVocabs = await prisma.vocabulary.findMany({
        where: {
          ...where,
          id: { notIn: existingVocabIds.length > 0 ? existingVocabIds : ['__none__'] },
          progress: { none: { userId } },
        },
        take: 20,
      });
      vocabs = [
        ...progress.map((p: any) => p.vocabulary),
        ...newVocabs,
      ];
    } else {
      vocabs = await prisma.vocabulary.findMany({
        where,
        orderBy: { dateAdded: 'desc' },
      });
    }

    if (vocabs.length === 0) {
      return NextResponse.json({ error: 'Keine Vokabeln für diesen Zeitraum gefunden' }, { status: 404 });
    }

    // Create session
    const learningSession = await prisma.learningSession.create({
      data: {
        userId,
        mode: mode ?? 'flashcard',
        direction: direction ?? 'de-en',
        totalCards: vocabs.length,
      },
    });

    // Shuffle vocabs
    const shuffled = [...vocabs].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      sessionId: learningSession.id,
      vocabs: shuffled,
      total: shuffled.length,
    });
  } catch (err: any) {
    console.error('Session error:', err);
    return NextResponse.json({ error: 'Session konnte nicht erstellt werden' }, { status: 500 });
  }
}

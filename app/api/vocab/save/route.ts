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
    const vocabs = body?.vocabs;
    if (!Array.isArray(vocabs) || vocabs.length === 0) {
      return NextResponse.json({ error: 'Keine Vokabeln zum Speichern' }, { status: 400 });
    }
    const created = await prisma.vocabulary.createMany({
      data: vocabs.map((v: any) => ({
        germanWord: v?.german ?? '',
        englishWord: v?.english ?? '',
        userId,
        dateAdded: new Date(),
      })),
    });
    return NextResponse.json({ count: created.count });
  } catch (err: any) {
    console.error('Save error:', err);
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 });
  }
}

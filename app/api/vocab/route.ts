export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: any = { userId };
  if (from || to) {
    where.dateAdded = {};
    if (from) where.dateAdded.gte = new Date(from + 'T00:00:00.000Z');
    if (to) where.dateAdded.lte = new Date(to + 'T23:59:59.999Z');
  }

  try {
    const vocabs = await prisma.vocabulary.findMany({
      where,
      orderBy: { dateAdded: 'desc' },
    });
    return NextResponse.json(vocabs);
  } catch (err: any) {
    console.error('Vocab list error:', err);
    return NextResponse.json({ error: 'Laden fehlgeschlagen' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  try {
    const body = await request.json();
    const { german, english } = body ?? {};
    if (!german || !english) {
      return NextResponse.json({ error: 'Deutsch und Englisch sind erforderlich' }, { status: 400 });
    }
    const vocab = await prisma.vocabulary.create({
      data: { germanWord: german, englishWord: english, userId },
    });
    return NextResponse.json(vocab, { status: 201 });
  } catch (err: any) {
    console.error('Add vocab error:', err);
    return NextResponse.json({ error: 'Hinzufügen fehlgeschlagen' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
  try {
    await prisma.vocabulary.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete vocab error:', err);
    return NextResponse.json({ error: 'Löschen fehlgeschlagen' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  const userId = (session.user as any).id;
  try {
    const body = await request.json();
    const { id, german, english } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 });
    const updated = await prisma.vocabulary.updateMany({
      where: { id, userId },
      data: {
        ...(german ? { germanWord: german } : {}),
        ...(english ? { englishWord: english } : {}),
      },
    });
    return NextResponse.json({ updated: updated.count });
  } catch (err: any) {
    console.error('Update vocab error:', err);
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
  }
}

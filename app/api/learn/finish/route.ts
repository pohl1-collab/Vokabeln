export const dynamic = 'force-dynamic';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { sessionId } = body ?? {};
    if (!sessionId) return NextResponse.json({ error: 'Session-ID fehlt' }, { status: 400 });
    await prisma.learningSession.update({
      where: { id: sessionId },
      data: { finishedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Finish error:', err);
    return NextResponse.json({ error: 'Session beenden fehlgeschlagen' }, { status: 500 });
  }
}

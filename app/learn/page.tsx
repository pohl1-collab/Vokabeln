import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { LearnSetup } from './_components/learn-setup';

export default async function LearnPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <LearnSetup />
      </main>
    </div>
  );
}

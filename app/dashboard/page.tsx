import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { DashboardContent } from './_components/dashboard-content';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <DashboardContent />
      </main>
    </div>
  );
}

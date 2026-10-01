import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { UploadContent } from './_components/upload-content';

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <UploadContent />
      </main>
    </div>
  );
}

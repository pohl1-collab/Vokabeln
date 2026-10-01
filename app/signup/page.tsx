import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SignupForm } from './_components/signup-form';

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4">
      <SignupForm />
    </div>
  );
}

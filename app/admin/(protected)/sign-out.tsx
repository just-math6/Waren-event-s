'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
export default function SignOut({ loginPath = '/admin/login' }: { loginPath?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setPending(true); setError('');
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace(loginPath);
      router.refresh();
    } catch { setError('Déconnexion impossible. Réessayez.'); setPending(false); }
  }
  return <div className="flex justify-end print:hidden">
    <details className="relative text-sm">
      <summary className="cursor-pointer rounded-lg px-3 py-2 text-gray-600">Mon compte</summary>
      <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2">
        <button type="button" disabled={pending} className="w-full rounded-md px-3 py-2 text-left text-gray-700 hover:bg-gray-50" onClick={signOut}>{pending ? 'Déconnexion…' : 'Se déconnecter'}</button>
        {error && <p role="alert" className="p-2 text-red-600">{error}</p>}
      </div>
    </details>
  </div>;
}

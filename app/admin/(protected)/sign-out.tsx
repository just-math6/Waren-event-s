'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
export default function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function signOut() {
    setPending(true); setError('');
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/admin/login');
      router.refresh();
    } catch { setError('Déconnexion impossible. Réessayez.'); setPending(false); }
  }
  return <>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="button" disabled={pending} onClick={signOut}>{pending ? 'Déconnexion…' : 'Se déconnecter'}</button></>;
}

'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
export default function LoginForm({ accessDenied }: { accessDenied: boolean }) {
  const [error, setError] = useState(accessDenied ? 'Ce compte ne dispose pas de l’accès administrateur.' : '');
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(''); setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: String(data.get('email')).trim(), password: String(data.get('password')) });
      if (error) {
        setError(error.status === 429 ? 'Trop de tentatives. Réessayez dans quelques instants.' : 'Connexion impossible. Vérifiez votre adresse courriel et votre mot de passe.');
        setPending(false); return;
      }
      // Refresh server components after changing the session cookies.
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Le service est indisponible. Veuillez réessayer.'); setPending(false);
    }
  }
  return <form onSubmit={submit} className="space-y-5" aria-busy={pending}>
    <div><label htmlFor="email" className="mb-2 block text-sm font-medium">Adresse courriel</label><input className="input" id="email" name="email" type="email" autoComplete="username" required disabled={pending} /></div>
    <div><label htmlFor="password" className="mb-2 block text-sm font-medium">Mot de passe</label><input className="input" id="password" name="password" type="password" autoComplete="current-password" required disabled={pending} /></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button className="button" disabled={pending} type="submit">{pending ? 'Connexion en cours…' : 'Se connecter'}</button>
  </form>;
}

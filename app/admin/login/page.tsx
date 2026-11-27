import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Connexion administrateur',
  description: 'Connectez-vous avec votre compte administrateur pour gérer les événements et les accès de l’équipe.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <><p className="mb-2 text-sm text-gray-500">Waren Event’s</p><h1 className="mb-2 text-2xl font-semibold">Connexion administrateur</h1><p className="mb-6 text-sm text-gray-500">Connectez-vous pour accéder à votre espace.</p><section className="card"><LoginForm accessDenied={error === 'access'} /></section><Link className="mt-4 underline" href="/equipe">Connexion vendeur ou contrôle entrée</Link></>;
}

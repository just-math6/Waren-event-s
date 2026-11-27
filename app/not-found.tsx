import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable',
  description: 'Cette page est introuvable. Revenez à l’accueil pour accéder à la billetterie ou à votre espace équipe.',
};

export default function NotFound() {
  return <section className="card space-y-3">
    <h1 className="text-2xl font-semibold">Page introuvable</h1>
    <Link className="underline" href="/">Retour à l’accueil</Link>
  </section>;
}

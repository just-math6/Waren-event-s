import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import SignOut from './sign-out';

export const metadata: Metadata = {
  title: 'Tableau de bord administrateur',
  description: 'Retrouvez les raccourcis pour gérer les événements, attribuer les accès ou ouvrir l’espace de l’équipe.',
};

export default async function AdminPage() {
  await requireAdmin();
  return <><SignOut /><p className="mb-2 text-sm text-gray-500">Waren Event’s</p><h1 className="mb-6 text-2xl font-semibold">Espace administrateur</h1><section className="card space-y-5"><p className="text-sm text-green-600">Vous êtes connecté.</p><Link href="/admin/evenements" className="button block text-center">Gérer les événements</Link><Link href="/admin/equipe" className="button block text-center">Gérer les accès</Link><Link href="/equipe" className="button block text-center">Vente et contrôle des billets papier</Link></section></>;
}

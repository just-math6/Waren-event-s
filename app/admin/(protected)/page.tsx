import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import SignOut from './sign-out';
export default async function AdminPage() {
  await requireAdmin();
  return <><SignOut /><p className="mb-2 text-sm text-gray-500">Waren Event’s</p><h1 className="mb-6 text-2xl font-semibold">Espace administrateur</h1><section className="card space-y-5"><p className="text-sm text-green-600">Vous êtes connecté.</p><Link href="/admin/evenements" className="button block text-center">Gérer les événements</Link><Link href="/admin/equipe" className="button block text-center">Gérer les accès</Link><Link href="/equipe" className="button block text-center">Vente et contrôle des billets papier</Link></section></>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import Recovery from './recovery';

export const metadata: Metadata = {
  title: 'Mot de passe oublié du coordinateur',
  description: 'Recevez un lien par e-mail pour choisir un nouveau mot de passe pour votre compte de coordination.',
};

export default function Page(){
 return <section className="space-y-4"><p className="text-sm text-gray-500">Espace coordinateur</p><h1 className="text-2xl font-semibold">Réinitialiser mon mot de passe</h1><Recovery/><Link className="block text-sm underline" href="/equipe?espace=coordination">Retour à la connexion coordinateur</Link></section>;
}

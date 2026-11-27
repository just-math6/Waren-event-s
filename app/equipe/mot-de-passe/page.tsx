import type { Metadata } from 'next';
import Link from 'next/link';
import Recovery from './recovery';

export const metadata: Metadata = {
  title: 'Réinitialiser mon mot de passe',
  description: 'Demandez un lien de réinitialisation ou utilisez le courriel reçu pour choisir un nouveau mot de passe pour votre compte équipe.',
};

export default function Page(){
 return <section className="space-y-4"><p className="text-sm text-gray-500">Waren Event’s · Équipe</p><h1 className="text-2xl font-semibold">Choisir mon mot de passe</h1><Recovery/><Link className="block text-sm underline" href="/equipe">Retour à la connexion équipe</Link></section>;
}

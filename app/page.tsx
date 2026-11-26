import Link from 'next/link';
export default function Home() {
  return <div className="space-y-6">
    <header className="space-y-4 rounded-2xl bg-[#163e30] px-5 py-7 text-white sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">Billetterie événementielle</p>
      <h1 className="text-4xl font-bold tracking-tight">Waren Events</h1>
      <p className="max-w-sm text-sm leading-relaxed text-green-50">Vendez des billets papier et virtuels, suivez vos ventes et contrôlez les entrées depuis votre téléphone.</p>
      <Link className="block rounded-lg bg-lime-200 px-4 py-3 text-center font-semibold text-green-950" href="/equipe">Se connecter · Organisateur et équipe</Link>
    </header>
    <Link className="block rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium" href="/admin">Accès administrateur</Link>
    <p className="text-sm leading-relaxed text-gray-600">Vous avez reçu un billet sur WhatsApp ? Ouvrez directement le lien de votre billet. Aucun compte n’est nécessaire.</p>
  </div>;
}

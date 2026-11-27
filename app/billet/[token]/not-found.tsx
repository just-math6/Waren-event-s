import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billet introuvable',
  description: 'Aucun billet ne correspond à ce lien. Vérifiez que vous avez ouvert le lien complet reçu lors de l’achat.',
};

export default function TicketNotFound() {
  return <section className="card"><h1 className="text-2xl font-semibold">Billet introuvable</h1></section>;
}

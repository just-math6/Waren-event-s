'use client';
export default function TicketError({ reset }: { reset: () => void }) {
  return <section className="card space-y-5"><h1 className="text-xl font-semibold">Billet temporairement indisponible</h1><p className="text-sm text-gray-500">Impossible de charger le billet pour le moment.</p><button className="button" onClick={reset}>Réessayer</button></section>;
}

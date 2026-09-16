'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { ticketBadge, type PublicTicket } from '@/lib/public-ticket';
import EventDate from '@/app/admin/(protected)/evenements/event-date';
export default function TicketCard({ ticket, qrCode }: { ticket: PublicTicket; qrCode: string }) {
  const card = useRef<HTMLElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const badge = ticketBadge(ticket.status);
  async function download() {
    if (!card.current || pending) return;
    setPending(true); setError('');
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(card.current.querySelectorAll('img')).map(img => img.decode()));
      const { toPng } = await import('html-to-image');
      const image = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
      const link = document.createElement('a');
      link.download = 'billet-waren-events.png'; link.href = image;
      document.body.appendChild(link); link.click(); link.remove();
    } catch { setError('Le téléchargement a échoué. Veuillez réessayer.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-5">
    <article ref={card} className="card space-y-6" aria-label="Billet d’entrée">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-medium uppercase tracking-wider text-gray-500">{ticket.ticket_type}</p>
          <h1 className="mt-2 break-words text-2xl font-semibold">{ticket.event_title}</h1>
          <p className="mt-2 text-sm text-gray-500"><EventDate value={ticket.starts_at} /></p>
          <p className="mt-1 break-words text-sm text-gray-500">{ticket.location || 'Lieu non précisé'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      </header>
      <div className="border-t border-dashed border-gray-300" />
      <div className="flex justify-center"><Image src={qrCode} alt="QR code du billet à présenter à l’entrée" width={256} height={256} unoptimized priority className="h-auto max-w-full rounded-lg" /></div>
      <dl className="space-y-4">
        <div><dt className="text-sm text-gray-500">Nom de l’acheteur</dt><dd className="mt-1 break-words text-lg font-semibold">{ticket.buyer_name}</dd></div>
        <div><dt className="text-sm text-gray-500">Numéro de téléphone</dt><dd className="mt-1 break-words text-lg font-medium">{ticket.buyer_phone}</dd></div>
      </dl>
      <div className="border-t border-dashed border-gray-300" />
    </article>
    <button type="button" className="button" onClick={download} disabled={pending}>{pending ? 'Téléchargement…' : 'Télécharger le billet'}</button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}

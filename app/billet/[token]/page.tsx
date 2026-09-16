import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getPublicTicket } from '@/lib/get-public-ticket';
import TicketCard from './ticket-card';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Votre billet — Waren Event’s', description: 'Votre billet d’entrée',
  robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer',
};
export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ticket = await getPublicTicket(token);
  if (!ticket) notFound();
  const qrCode = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 4, width: 512, color: { dark: '#111827', light: '#ffffff' } });
  return <TicketCard ticket={ticket} qrCode={qrCode} />;
}

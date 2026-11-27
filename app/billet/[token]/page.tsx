import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getPublicTicket } from '@/lib/get-public-ticket';
import TicketCard from './ticket-card';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Votre billet d’entrée',
  description: 'Présentez le QR code à l’entrée ou téléchargez votre billet pour le garder sur votre téléphone. Aucun compte n’est nécessaire.',
  robots: { index: false, follow: false, nocache: true }, referrer: 'no-referrer',
};
export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ticket = await getPublicTicket(token);
  if (!ticket) notFound();
  const qrCode = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 4, width: 512, color: { dark: '#111827', light: '#ffffff' } });
  return <TicketCard ticket={ticket} qrCode={qrCode} />;
}

export type PublicTicket = {
  ticket_type: string;
  event_title: string;
  starts_at: string;
  location: string | null;
  status: 'valide' | 'utilise' | 'annule';
  buyer_name: string;
  buyer_phone: string;
};
export const validTicketToken = (token: string) => /^([a-f0-9]{32}|[a-f0-9]{64})$/.test(token);
export function ticketBadge(status: PublicTicket['status']) {
  switch (status) {
    case 'valide': return { label: 'Valide', className: 'bg-green-50 text-green-600' };
    case 'utilise': return { label: 'Déjà utilisé', className: 'bg-gray-200 text-gray-500' };
    case 'annule': return { label: 'Annulé', className: 'bg-red-50 text-red-600' };
    default: return { label: 'Statut indisponible', className: 'bg-gray-200 text-gray-500' };
  }
}

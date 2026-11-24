import Create from './create';
import Link from 'next/link';
import QRCode from 'qrcode';
import {requireAdmin} from '@/lib/auth';
import {footballTypes} from '@/lib/football-art';
import FootballTicket from '@/components/football-ticket';
import Print from '../../evenements/[id]/papier/print';
export default async function Page(){
  await requireAdmin();
  return <div className="space-y-4"><header className="space-y-2"><Link className="underline print:hidden" href="/admin/evenements">← Événements</Link><h1 className="text-xl font-semibold">Football Tournament Two · Épreuve d’impression</h1><p className="text-sm text-gray-500">20 décembre 2026 · QR de démonstration, sans valeur d’entrée.</p></header><Create/><Print label="Imprimer l’épreuve ou enregistrer en PDF"/><div className="football-sheet">{await Promise.all(footballTypes.map(async art=><FootballTicket key={art.src} art={art} qr={await QRCode.toDataURL('DEMO-WAREN-FOOTBALL-'+art.src,{width:320,margin:4})}/>))}</div></div>;
}

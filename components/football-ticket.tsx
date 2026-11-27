import Image from 'next/image';
import {footballTitle, type FootballArt} from '@/lib/football-art';
import {fcfa} from '@/lib/team-view';

type Props = { art: FootballArt; qr: string; usage: 'ticket' | 'proof' | 'decoration' };

export default function FootballTicket({art, qr, usage}: Props) {
  const decorative = usage === 'decoration';
  const category = `${art.name}, ${fcfa(art.price)}`;
  const artworkAlt = usage === 'proof' ? `Épreuve ${category}` : `${footballTitle}, 20 décembre 2026 : billet ${category}`;
  const qrAlt = usage === 'proof' ? 'Code QR de démonstration à droite, sans valeur d’entrée' : 'Code QR à présenter à l’entrée';
  return <article className="football-ticket" aria-hidden={decorative || undefined}>
    <Image src={'/maquettes/football/'+art.src+'.jpg'} unoptimized loading="eager" alt={decorative ? '' : artworkAlt} width={art.w} height={art.h} className="block h-auto w-full"/>
    <Image src={qr} unoptimized loading="eager" alt={decorative ? '' : qrAlt} width={art.size} height={art.size} className="absolute h-auto" style={{left:(100*art.x/art.w)+'%',top:(100*art.y/art.h)+'%',width:(100*art.size/art.w)+'%'}}/>
  </article>;
}

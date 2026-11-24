import Image from 'next/image';
import type {FootballArt} from '@/lib/football-art';
export default function FootballTicket({art,qr}:{art:FootballArt;qr:string}){
  return <article className="football-ticket" aria-label={art.name+' · '+art.price+' FCFA'}>
    <Image src={'/maquettes/football/'+art.src+'.jpg'} unoptimized loading="eager" alt={'Football Tournament Two · '+art.name} width={art.w} height={art.h} className="block h-auto w-full"/>
    <Image src={qr} unoptimized loading="eager" alt="QR du billet" width={art.size} height={art.size} className="absolute h-auto" style={{left:(100*art.x/art.w)+'%',top:(100*art.y/art.h)+'%',width:(100*art.size/art.w)+'%'}}/>
  </article>;
}

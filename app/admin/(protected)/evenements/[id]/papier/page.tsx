import FootballTicket from '@/components/football-ticket';
import {findFootballArt} from '@/lib/football-art';
import QRCode from 'qrcode';
import Image from 'next/image';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {isUuid} from '@/lib/sale-input';
import EventDate from '../../event-date';
import Print from './print';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{lot?:string;msg?:string}>}){
 await requireAdmin();const {id}=await params; if(!isUuid(id))notFound(); const db=await createClient(),base='/admin/evenements/'+id+'/papier';const q=await searchParams;
 const e=await db.from('events').select('title,starts_at,location,ticket_art').eq('id',id).single(); if(!e.data)notFound();
 const types=await db.from('ticket_types').select('id,name').eq('event_id',id);
 const batches=await db.rpc('waren_batches',{p_event:id});
 async function generate(form:FormData){'use server';await requireAdmin();const client=await createClient();const result=await client.rpc('waren_print',{p_type:String(form.get('type')),p_count:Number(form.get('count'))});redirect(base+(result.error?'?msg=Quantité indisponible ou création impossible.':'?lot='+result.data))}
 async function block(form:FormData){'use server';await requireAdmin();const client=await createClient();const result=await client.rpc('waren_block',{p_batch:String(form.get('batch'))});redirect(base+'?msg='+encodeURIComponent(result.error?'Blocage impossible.':'Billets invendus du lot bloqués.'))}
 const batch=(batches.data as {batch:string;name:string;total:number;ready:number}[]|null)?.find(b=>b.batch===q.lot);
 const stock=batch?await db.from('paper_stock').select('code,token,price').eq('batch',batch.batch).eq('state','pret').order('code'):null;
 const cards=await Promise.all((stock?.data??[]).map(async s=>({...s,qr:await QRCode.toDataURL(s.token,{width:240,margin:4})})));
 const football=e.data.ticket_art==='football-two-2026';
 const compatible=cards.every(c=>findFootballArt(batch?.name??'',Number(c.price)));
 return <div className="space-y-4"><section className="space-y-4 print:hidden"><Link href="/admin/evenements">← Événements</Link><h1 className="text-2xl font-semibold">Billets papier · {e.data.title}</h1>
 <p className="text-sm text-gray-600">Prépare les quantités convenues avec le coordinateur, puis sélectionne un lot pour vérifier son aperçu. Les billets imprimés ne permettent pas d’entrer avant leur activation à la vente.</p>
 <form className="card space-y-3" action={generate}><label>Type<select required className="input" name="type">{types.data?.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Quantité (1 à 100)<input className="input" type="number" name="count" min="1" max="100" defaultValue="10" required/></label><button className="button">Préparer un lot</button></form><p role="status">{q.msg}</p>
 <h2 className="font-semibold">Lots préparés</h2>{batches.error?<p>Liste indisponible.</p>:(batches.data as NonNullable<typeof batch>[]).map((b,i)=><Link className="block underline" key={b.batch} href={base+'?lot='+b.batch}>Lot {batches.data.length-i} · {b.name} · {b.ready}/{b.total} disponibles</Link>)}
 {batch&&<details><summary>Bloquer les invendus de ce lot</summary><form action={block}><p>Les billets déjà vendus restent valides.</p><button name="batch" value={batch.batch} className="underline text-red-600">Confirmer le blocage</button></form></details>}{stock?.error&&<p>Impossible de charger les billets.</p>}{batch&&!cards.length&&!stock?.error&&<p>Aucun billet disponible à imprimer.</p>}</section>
 {football&&cards.length>0&&(compatible?<><Print count={cards.length}/><div className="football-sheet">{cards.map(c=><FootballTicket key={c.code} art={findFootballArt(batch!.name,Number(c.price))!} qr={c.qr}/>)}</div></>:<p role="alert">Le tarif ou la catégorie ne correspond pas à la maquette. Impression suspendue.</p>)}
 {!football&&cards.length>0&&<><Print count={cards.length}/><div className="paper-grid">{cards.map(c=><article key={c.code} className="paper-card"><p className="text-xs uppercase text-gray-500">{batch?.name} · {c.price}</p><h2 className="text-xl font-semibold">{e.data.title}</h2><p><EventDate value={e.data.starts_at}/> · {e.data.location}</p><Image src={c.qr} unoptimized loading="eager" width={140} height={140} alt="QR du billet"/><b>{c.code}</b><p className="text-xs">Une entrée · à conserver après paiement</p></article>)}</div></>}</div>
}

import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import Quantity from './quantity';
import Modes from './modes';
import Team,{type Member} from './team';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import SignOut from '@/app/admin/(protected)/sign-out';
type Dashboard={my_name:string|null;title:string;location:string;starts_at:string;types:{id:string;name:string;price:number;quantity:number}[];sales:{seller:string;type_id:string;name:string;sold:number;used:number;revenue:number}[];staff:Member[]};
const count=(n:number)=>new Intl.NumberFormat('fr-FR').format(n);
export default async function Coordination({params}:{params:Promise<{id:string}>}){
 const {id}=await params; if(!isUuid(id))notFound();
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/equipe');
 const {data,error}=await db.rpc('waren_coord_dashboard',{p_event:id});
 if(error?.code==='42501'||(!data&&!error))notFound();
 if(error)return <p role="alert">Impossible de charger cet événement. Réessayez.</p>;
 const d=data as Dashboard;const groups=new Map<string,Dashboard['sales']>();
 for(const row of d.sales)groups.set(row.seller,[...(groups.get(row.seller)??[]),row]);
 const total=(key:'sold'|'used'|'revenue')=>d.sales.reduce((n,r)=>n+Number(r[key]),0);
 return <main className="space-y-5"><SignOut loginPath="/equipe"/><Link className="text-sm text-gray-500 underline" href="/equipe">← Mes événements</Link>
 <header><p className="text-sm text-gray-500">Espace coordinateur</p><h1 className="text-2xl font-semibold">{d.title}</h1><p className="text-sm text-gray-500">{new Date(d.starts_at).toLocaleDateString('fr-FR')} · {d.location}</p></header>
 <Modes id={id} name={d.my_name} title={d.title} starts={d.starts_at}><div className="grid grid-cols-2 gap-3"><div className="card"><p>Recettes totales</p><b>{count(total('revenue'))} FCFA</b></div><div className="card"><p>Présents / vendus</p><b>{count(total('used'))} / {count(total('sold'))}</b></div></div>
 <section className="card space-y-2"><h2 className="font-semibold">Ventes par vendeur</h2>{!groups.size?<p>Aucune vente.</p>:Array.from(groups,([seller,rows])=><div key={seller} className="border-t border-gray-200 py-2"><p className="break-words font-medium">{seller} · {count(rows.reduce((n,r)=>n+r.sold,0))} billet(s)</p><p className="text-sm text-gray-500">{rows.map(r=>r.name+' : '+r.sold).join(' · ')}</p></div>)}</section>
 <section className="card space-y-2"><h2 className="font-semibold">Quantités de billets</h2>{d.types.map(t=><Quantity key={t.id} event={id} type={t.id} name={t.name} price={t.price} value={t.quantity}/>)}</section>
 <Team event={id} members={d.staff}/></Modes></main>;
}

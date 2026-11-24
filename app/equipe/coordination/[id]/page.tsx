import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import SignOut from '@/app/admin/(protected)/sign-out';
type Dashboard={title:string;location:string;starts_at:string;types:{id:string;name:string;price:number;quantity:number}[];sales:{seller:string;type_id:string;name:string;sold:number;used:number;revenue:number}[];staff:{id:string;email:string;role:string}[]};
const count=(n:number)=>new Intl.NumberFormat('fr-FR').format(n);
export default async function Coordination({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string}>}){
 const {id}=await params; if(!isUuid(id))notFound();
 const path='/equipe/coordination/'+id;
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/equipe');
 const {data,error}=await db.rpc('waren_coord_dashboard',{p_event:id});
 if(error?.code==='42501'||(!data&&!error))notFound();
 if(error)return <p role="alert">Impossible de charger cet événement. Réessayez.</p>;
 const d=data as Dashboard;const groups=new Map<string,Dashboard['sales']>();
 for(const row of d.sales)groups.set(row.seller,[...(groups.get(row.seller)??[]),row]);
 const total=(key:'sold'|'used'|'revenue')=>d.sales.reduce((n,r)=>n+Number(r[key]),0);
 async function update(f:FormData){
  'use server';
  const client=await createClient();
  const result=f.has('type')?await client.rpc('waren_coord_quantity',{p_event:id,p_type:String(f.get('type')),p_count:Number(f.get('quantity'))}):await client.rpc('waren_coord_team',{p_event:id,p_email:String(f.get('email')),p_role:String(f.get('role'))});
  revalidatePath(path);
  redirect(path+'?msg='+(result.error?(f.has('type')?'quota':'compte'):'ok'));
 }
 const msg=(await searchParams).msg;
 return <main className="space-y-5"><SignOut loginPath="/equipe"/><Link className="text-sm text-gray-500 underline" href="/equipe">← Mes événements</Link>
 <header><p className="text-sm text-gray-500">Espace coordinateur</p><h1 className="text-2xl font-semibold">{d.title}</h1><p className="text-sm text-gray-500">{new Date(d.starts_at).toLocaleDateString('fr-FR')} · {d.location}</p></header>
 <div className="grid grid-cols-2 gap-3"><div className="card"><p>Recettes totales</p><b>{count(total('revenue'))} FCFA</b></div><div className="card"><p>Présents / vendus</p><b>{count(total('used'))} / {count(total('sold'))}</b></div></div>
 <section className="card space-y-2"><h2 className="font-semibold">Ventes par vendeur</h2>{!groups.size?<p>Aucune vente.</p>:Array.from(groups,([seller,rows])=><div key={seller} className="border-t border-gray-200 py-2"><p className="break-words font-medium">{seller} · {count(rows.reduce((n,r)=>n+r.sold,0))} billet(s)</p><p className="text-sm text-gray-500">{rows.map(r=>r.name+' : '+r.sold).join(' · ')}</p></div>)}</section>
 {msg&&<p role="status" className={msg==='ok'?'text-green-600':'text-red-600'}>{msg==='ok'?'Modification enregistrée.':msg==='quota'?'Quantité refusée. Gardez au moins le nombre de billets déjà vendus ou préparés.':'Modification refusée. Vérifiez le courriel confirmé du membre et votre accès.'}</p>}
 <section className="card space-y-3"><h2 className="font-semibold">Quantités de billets</h2>{d.types.map(t=><form key={t.id} action={update} className="space-y-2"><input type="hidden" name="type" value={t.id}/><label className="block">{t.name} · {count(t.price)} FCFA<input className="input" type="number" min="1" max="2147483647" required name="quantity" defaultValue={t.quantity}/></label><button className="button">Enregistrer la quantité {t.name}</button></form>)}</section>
 <section className="card space-y-3"><h2 className="font-semibold">Mon équipe</h2><p className="text-sm text-gray-500">Le membre doit avoir créé et confirmé son compte équipe. Son accès ne concerne que cet événement.</p>
 {d.staff.map(s=><form key={s.id} action={update} className="flex flex-wrap justify-between gap-2 border-t border-gray-200 py-2"><span>{s.email} · {s.role==='vente'?'Vendeur':'Contrôleur'}</span><input type="hidden" name="email" value={s.email}/><button className="underline" name="role" value="retirer">Retirer</button></form>)}
 <form action={update} className="space-y-2"><label>Courriel<input type="email" className="input" name="email" required/></label><label>Accès<select className="input" name="role"><option value="vente">Vendeur</option><option value="entree">Contrôleur</option></select></label><button className="button">Enregistrer l’accès</button></form></section></main>;
}

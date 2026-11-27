import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Gestion des accès',
  description: 'Nommez un coordinateur et gérez les autorisations des membres qui participent à vos événements.',
};

async function change(form: FormData) {
  'use server';
  await requireAdmin(); const db=await createClient();
  const remove=form.get('remove');
  const result=form.has('coordEvent') ? await db.rpc('waren_name_coordinator',{p_event:String(form.get('coordEvent')),p_email:String(form.get('email'))}) : remove ? await db.from('ticket_staff').delete().eq('user_id',String(remove)) :
    await db.rpc('waren_assign_named',{p_name:String(form.get('name')),p_email:String(form.get('email')),p_role:String(form.get('role'))});
  redirect('/admin/equipe?msg='+encodeURIComponent(result.error ? (result.error.message.includes('confirmé')?'Demandez à la personne de créer son compte équipe et de confirmer son courriel.':'Modification refusée.') : 'Accès mis à jour.'));
}
export default async function Page({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  await requireAdmin(); const db=await createClient(); const {data,error}=await db.from('ticket_staff').select('user_id,email,role,display_name').order('email');
  const events=await db.from('events').select('id,title').order('starts_at',{ascending:false});
  return <div className="space-y-5"><Link href="/admin">← Administration</Link><h1 className="text-2xl font-semibold">Accès de l’équipe</h1><p className="text-sm text-gray-500">Partagez la page /equipe. Après création et confirmation du compte, autorisez son courriel ici. Vous gardez le seul accès administrateur.</p>
  <form action={change} className="card space-y-3"><label>Nom de la personne<input className="input" name="name" required minLength={2} maxLength={60}/></label><label>Courriel de la personne<input className="input" required name="email" type="email"/></label><label>Accès<select className="input" name="role"><option value="vente">Vendeur</option><option value="entree">Contrôle entrée</option></select></label><button className="button">Enregistrer l’accès</button></form>
  {!!events.data?.length&&<form action={change} className="card space-y-3"><h2 className="font-semibold">Nommer un coordinateur</h2><p className="text-sm text-gray-500">Un seul coordinateur par événement. Son compte doit être confirmé.</p><label>Événement<select className="input" name="coordEvent" required>{events.data.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label>Courriel du coordinateur<input type="email" className="input" name="email" required/></label><button className="button">Nommer le coordinateur</button></form>}
  <p role="status">{(await searchParams).msg}</p>{error ? <p>Liste indisponible.</p> : data?.map(row=><form className="card space-y-2" key={row.user_id} action={change}><p>{row.display_name??row.email} · {row.role==='vente'?'Vendeur':'Contrôle entrée'}</p><button className="underline" name="remove" value={row.user_id}>Retirer l’accès</button></form>)}<Link className="underline" href="/equipe">Ouvrir l’espace équipe</Link></div>;
}

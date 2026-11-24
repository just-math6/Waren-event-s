import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
async function change(form: FormData) {
  'use server';
  await requireAdmin(); const db=await createClient();
  const remove=form.get('remove');
  const result=remove ? await db.from('ticket_staff').delete().eq('user_id',String(remove)) :
    await db.rpc('waren_assign',{p_email:String(form.get('email')),p_role:String(form.get('role'))});
  redirect('/admin/equipe?msg='+encodeURIComponent(result.error ? (result.error.message.includes('confirmé')?'Demandez à la personne de créer son compte équipe et de confirmer son courriel.':'Modification refusée.') : 'Accès mis à jour.'));
}
export default async function Page({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  await requireAdmin(); const db=await createClient(); const {data,error}=await db.from('ticket_staff').select('user_id,email,role').order('email');
  return <div className="space-y-5"><Link href="/admin">← Administration</Link><h1 className="text-2xl font-semibold">Accès de l’équipe</h1><p className="text-sm text-gray-500">Partagez la page /equipe. Après création et confirmation du compte, autorisez son courriel ici. Vous gardez le seul accès administrateur.</p>
  <form action={change} className="card space-y-3"><label>Courriel de la personne<input className="input" required name="email" type="email"/></label><label>Accès<select className="input" name="role"><option value="vente">Vendeur</option><option value="entree">Contrôle entrée</option></select></label><button className="button">Enregistrer l’accès</button></form>
  <p role="status">{(await searchParams).msg}</p>{error ? <p>Liste indisponible.</p> : data?.map(row=><form className="card space-y-2" key={row.user_id} action={change}><p>{row.email} · {row.role==='vente'?'Vendeur':'Contrôle entrée'}</p><button className="underline" name="remove" value={row.user_id}>Retirer l’accès</button></form>)}<Link className="underline" href="/equipe">Ouvrir l’espace équipe</Link></div>;
}

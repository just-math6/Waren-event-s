import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import Access from './access';
import Desk from './desk';
import SignOut from '../admin/(protected)/sign-out';

type Assignment = {id:string; title:string; starts_at:string; role:'coordination'|'vente'|'entree'|'terrain'};
export default async function Page(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)return <div className="space-y-4"><h1 className="text-2xl font-semibold">Connexion équipe</h1><Access/></div>;
 const [global,scoped]=await Promise.all([db.rpc('waren_role'),db.rpc('waren_my_assignments')]);
 const assignments:Assignment[]=scoped.data??[];
 const globalDesk=['vente','admin','entree'].includes(global.data);
 const localDesks=assignments.filter(a=>a.role!=='coordination' && global.data!=='admin' && a.role!==global.data);
 const events=globalDesk?await db.from('events').select('id,title,starts_at').order('starts_at',{ascending:false}):null;
 return <div className="team-ui team-index space-y-5"><SignOut loginPath="/equipe"/>
 {global.data==='admin'&&<Link href="/admin">← Administration</Link>}
 {assignments.some(a=>a.role==='coordination')&&<section className="space-y-4"><h1 className="text-2xl font-semibold">Espace coordinateur</h1>
 {assignments.filter(a=>a.role==='coordination').map(a=><div key={a.id} className="card space-y-3"><h2 className="text-lg font-semibold">{a.title}</h2><Link className="button block text-center" href={'/equipe/coordination/'+a.id}>Ouvrir mon événement</Link></div>)}</section>}
 {global.error||scoped.error||events?.error?<p role="alert">Service temporairement indisponible. Actualisez la page.</p>:!assignments.length&&!globalDesk?<p>Aucun événement ne vous est attribué. Demandez au coordinateur ou à l’administrateur de vérifier votre accès.</p>:null}
 {globalDesk&&events&&!events.error&&<Desk events={events.data??[]} role={global.data}/>}
 {(['terrain','vente','entree'] as const).map(role=>localDesks.some(a=>a.role===role)?<Desk key={role} events={localDesks.filter(a=>a.role===role)} role={role}/>:null)}
 </div>;
}

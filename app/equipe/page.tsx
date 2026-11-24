import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import Access from './access';
import Desk from './desk';
import SignOut from '../admin/(protected)/sign-out';
export default async function Page(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)return <div className="space-y-4"><h1 className="text-2xl font-semibold">Connexion équipe</h1><Access/></div>;
 const {data:role,error}=await db.rpc('waren_role');
 if(error||!['vente','admin','entree'].includes(role))return <section className="card space-y-4"><h1>Accès équipe</h1><p>{error?'Service indisponible. Réessayez.':'Demandez à l’administrateur d’autoriser votre courriel : '+user.email}</p><SignOut/></section>;
 const events=await db.from('events').select('id,title,starts_at').order('starts_at',{ascending:false});
 return <div className="space-y-4">{role==='admin'&&<Link href="/admin">← Administration</Link>}{events.error?<p>Liste des événements indisponible.</p>:<Desk events={events.data??[]} role={role}/>}<SignOut/></div>
}

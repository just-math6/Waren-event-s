'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {createClient} from '@/lib/supabase';
export default function Access(){
 const router=useRouter();
 const [signup,setSignup]=useState(false),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 return <form className="card space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMsg('');const f=new FormData(e.currentTarget);const cred={email:String(f.get('email')).trim(),password:String(f.get('pass'))};
 try {const auth=createClient().auth; const r=signup?await auth.signUp({...cred,options:{emailRedirectTo:location.origin+'/equipe'}}):await auth.signInWithPassword(cred);
 if(r.error)setMsg(signup?'Inscription impossible. Vérifiez les champs ou contactez l’administrateur.':'Connexion impossible. Vérifiez vos identifiants.');
 else if(r.data.session)router.refresh();else setMsg('Consultez votre courriel, puis revenez ici pour vous connecter.');}
 catch{setMsg('Service indisponible. Réessayez.');}finally{setBusy(false);}}}>
 <label>Courriel<input name="email" type="email" required className="input" autoComplete="username"/></label><label>Mot de passe<input name="pass" required minLength={signup?8:1} type="password" className="input" autoComplete={signup?'new-password':'current-password'}/></label>
 <button disabled={busy} className="button">{signup?'Créer mon compte':'Me connecter'}</button><button disabled={busy} type="button" className="underline" onClick={()=>{setSignup(!signup);setMsg('')}}>{signup?'J’ai déjà un compte':'Première visite : créer mon compte'}</button>{!signup&&<Link className="block text-sm underline" href="/equipe/mot-de-passe">Mot de passe oublié ?</Link>}<p role="status">{msg}</p></form>
}

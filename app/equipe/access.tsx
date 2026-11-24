'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {createClient} from '@/lib/supabase';
export default function Access(){
 const router=useRouter();
 const [signup,setSignup]=useState(false),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 return <form className="card space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMsg('');const f=new FormData(e.currentTarget);const login=String(f.get('login')).trim(),password=String(f.get('pass'));
 try {const db=createClient(), auth=db.auth;
 let email=login;
 if(!signup&&!login.includes('@')){const a=await db.rpc('waren_staff_address',{p_name:login});if(a.error)throw a.error;email=a.data;}
 const cred={email,password};const r=signup?await auth.signUp({...cred,options:{emailRedirectTo:location.origin+'/equipe'}}):await auth.signInWithPassword(cred);
 if(r.error)setMsg(signup?'Inscription impossible. Vérifiez les champs ou contactez l’administrateur.':'Connexion impossible. Vérifiez vos identifiants.');
 else if(r.data.session)router.refresh();else setMsg('Consultez votre courriel, puis revenez ici pour vous connecter.');}
 catch{setMsg('Service indisponible. Réessayez.');}finally{setBusy(false);}}}>
 <label>{signup?'Courriel':'Nom de connexion'}<input name="login" type={signup?'email':'text'} required className="input" autoComplete="username"/></label>{!signup&&<p className="text-sm text-gray-500">Utilisez le nom donné par votre coordinateur. Les comptes existants peuvent aussi utiliser leur courriel.</p>}<label>Mot de passe<input name="pass" required minLength={signup?8:1} type="password" className="input" autoComplete={signup?'new-password':'current-password'}/></label>
 <button disabled={busy} className="button">{signup?'Créer mon compte':'Me connecter'}</button><button disabled={busy} type="button" className="underline" onClick={()=>{setSignup(!signup);setMsg('')}}>{signup?'J’ai déjà un compte':'Créer un compte par courriel pour une nomination'}</button>{!signup&&<Link className="block text-sm underline" href="/equipe/mot-de-passe">Compte par courriel : mot de passe oublié ?</Link>}{!signup&&<p className="text-sm text-gray-500">Mot de passe oublié pour un compte par nom ? Demandez au coordinateur de le remplacer.</p>}<p role="status">{msg}</p></form>
}

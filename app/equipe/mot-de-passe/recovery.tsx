'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {createBrowserClient} from '@supabase/ssr';
import {getSupabaseConfig} from '@/lib/supabase/config';
import {authReturnUrl} from '@/lib/secure-url';
import {useRouter} from 'next/navigation';

let recoveryClient: ReturnType<typeof createBrowserClient> | undefined;
function createClient(){
 const {url,key}=getSupabaseConfig();
 return recoveryClient??=createBrowserClient(url,key,{isSingleton:false,auth:{detectSessionInUrl:false}});
}
export default function Recovery(){
 const router=useRouter();
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[email,setEmail]=useState('');
 useEffect(()=>{
   // Recovery mail can either open this page, or its original action link can be pasted below.
   const url=new URL(window.location.href);
   const hash=new URLSearchParams(url.hash.slice(1));
   const code=url.searchParams.get('code');
   if(!code&&hash.get('type')!=='recovery')return;
   history.replaceState(null,'',location.pathname);
   async function resume(){
     const auth=createClient().auth;
     try{
       const result=code?await auth.exchangeCodeForSession(code):await auth.setSession({access_token:hash.get('access_token')??'',refresh_token:hash.get('refresh_token')??''});
       if(result.error)throw result.error;
       setReady(true);
     }catch{setMsg('Ce lien ne peut plus être utilisé. Demandez un nouveau courriel ci-dessous.');}
   }
   void resume();
 },[]);
 async function save(e:FormEvent<HTMLFormElement>){
   e.preventDefault(); if(busy)return;setBusy(true);setMsg('');
   const f=new FormData(e.currentTarget);
   try{
     const auth=createClient().auth;
     if(!ready){
       const link=new URL(String(f.get('link')).trim());
       if(link.origin!==new URL(getSupabaseConfig().url).origin || link.pathname!=='/auth/v1/verify'||link.searchParams.get('type')!=='recovery'||!link.searchParams.get('token'))throw new Error('Lien invalide');
       const result=await auth.verifyOtp({token_hash:link.searchParams.get('token')!,type:'recovery'});
       if(result.error||!result.data.session)throw new Error('Lien invalide');setReady(true);
     }
     const r=await auth.updateUser({password:String(f.get('password'))});
     if(r.error){setMsg('Mot de passe refusé. Choisissez un autre mot de passe puis réessayez.');return;}
     router.replace('/equipe');router.refresh();
   }catch{setMsg('Lien invalide ou déjà utilisé. Demandez un nouveau courriel, puis copiez le lien du bouton sans l’ouvrir.');}
   finally{setBusy(false);}
 }
 async function send(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(busy)return;setBusy(true);
   try{
     const r=await createClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:authReturnUrl(location.origin,'/equipe/mot-de-passe')});
     setMsg(r.error?'Envoi impossible pour le moment. Réessayez dans quelques minutes.':'Si le compte existe, un courriel vient d’être envoyé. Copiez le lien du bouton, puis utilisez le formulaire.');
   }catch{setMsg('Connexion impossible. Réessayez.');}finally{setBusy(false);}
 }
 return <><form onSubmit={save} className="card space-y-4">
 {!ready&&<label className="block">Lien de réinitialisation<p className="my-2 text-sm text-gray-500">Dans le nouveau courriel, faites un appui long ou un clic droit sur « Reset Password », puis choisissez « Copier le lien » sans l’ouvrir.</p><input name="link" type="url" required className="input" autoComplete="off" placeholder="Collez le lien ici"/></label>}
 <label className="block">Nouveau mot de passe<input name="password" type="password" minLength={10} required autoComplete="new-password" className="input"/><span className="text-sm text-gray-500">10 caractères minimum.</span></label>
 <button className="button" disabled={busy}>Enregistrer et ouvrir mon espace</button></form>
 {msg&&<p role="status" className="text-sm">{msg}</p>}
 {!ready&&<details className="card"><summary>Recevoir un nouveau courriel</summary><form onSubmit={send} className="mt-3 space-y-3"><label>Courriel<input required type="email" autoComplete="email" className="input" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button" disabled={busy}>Envoyer le courriel</button></form></details>}</>;
}

'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase';
import {authReturnUrl} from '@/lib/secure-url';

export type LoginSpace = 'terrain' | 'coordination';

export default function Access({initialSpace}: {initialSpace: LoginSpace}) {
  const [space, setSpace] = useState(initialSpace);
  const [busy, setBusy] = useState(false);
  return <section className="team-ui space-y-4">
    <div className="segments login-spaces" role="group" aria-label="Choisir mon espace">
      {([['terrain', 'Vendeur / Contrôleur'], ['coordination', 'Coordinateur']] as const).map(([value, label]) =>
        <button type="button" key={value} disabled={busy} aria-pressed={space===value} onClick={()=>setSpace(value)}>{label}</button>)}
    </div>
    <LoginForm key={space} space={space} busy={busy} setBusy={setBusy}/>
  </section>;
}

function LoginForm({space,busy,setBusy}: {space: LoginSpace; busy: boolean; setBusy: (value:boolean)=>void}) {
  const router=useRouter();
  const [signup,setSignup]=useState(false),[message,setMessage]=useState('');
  const coordinator=space==='coordination';
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(busy)return;
    setBusy(true);setMessage('');
    const form=new FormData(e.currentTarget);
    const login=String(form.get('login')).trim(), password=String(form.get('password'));
    try {
      const db=createClient();
      let email=login;
      if(!coordinator){
        const {data,error}=await db.rpc('waren_staff_address',{p_name:login});
        if(error)throw error;
        if(typeof data!=='string'||!data){setMessage('Nom ou mot de passe incorrect.');return}
        email=data;
      }
      const result=coordinator&&signup
        ? await db.auth.signUp({email,password,options:{emailRedirectTo:authReturnUrl(location.origin,'/equipe')}})
        : await db.auth.signInWithPassword({email,password});
      if(result.error){
        setMessage(signup?'Création du compte impossible. Réessayez ou contactez l’administrateur.':coordinator?'Adresse e-mail ou mot de passe incorrect.':'Nom ou mot de passe incorrect.');
      }else if(result.data.session){router.refresh()}
      else if(coordinator&&signup){setMessage('Consultez votre e-mail pour confirmer votre compte.')}
      else{setMessage('Connexion non confirmée. Réessayez.')}
    }catch{setMessage('Connexion indisponible. Réessayez.')}finally{setBusy(false)}
  }
  return <form key={signup?'signup':'login'} onSubmit={submit} className="card space-y-4">
    <label className="block">{coordinator?'Adresse e-mail':'Nom donné par le coordinateur'}
      <input className="input" name="login" type={coordinator?'email':'text'} autoComplete={coordinator&&signup?'email':'username'} autoCapitalize="none" spellCheck={false} required/>
    </label>
    <label className="block">Mot de passe
      <input className="input" name="password" type="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?8:1} required/>
    </label>
    <button className="button" disabled={busy}>{busy?'Veuillez patienter…':signup?'Créer mon compte':'Me connecter'}</button>
    {message&&<p role="status" className="text-sm">{message}</p>}
    {coordinator?<div className="space-y-2 text-sm">
      {!signup&&<Link className="block underline" href="/equipe/mot-de-passe">Mot de passe oublié ?</Link>}
      <button disabled={busy} className="underline" type="button" onClick={()=>{setSignup(!signup);setMessage('')}}>{signup?'Retour à la connexion':'Première connexion ? Créer mon compte'}</button>
    </div>:<details className="text-sm"><summary className="cursor-pointer underline">Mot de passe oublié ?</summary><p className="mt-2">Demandez un nouveau mot de passe à votre coordinateur.</p></details>}
  </form>;
}

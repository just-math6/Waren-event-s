'use client';
import Link from 'next/link';
import {useState,useEffect,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';
import Desk from '../../desk';
import SignOut from '@/app/admin/(protected)/sign-out';
const sections={overview:'Vue d’ensemble',vente:'Vendre',entree:'Contrôler',team:'Équipe',cash:'Caisse et bilan',settings:'Réglages'} as const;
type Section=keyof typeof sections;
export default function Modes({id,title,starts,name,...views}:{id:string;title:string;starts:string;name:string|null;overview:ReactNode;team:ReactNode;cash:ReactNode;settings:ReactNode}){
 const [mode,select]=useState<Section>('overview'),[locked,lock]=useState(false),[registered,setName]=useState(name),[error,setError]=useState(''),[busy,wait]=useState(false),[open,menu]=useState(false);
 const router=useRouter();
 useEffect(()=>{if(mode!=='overview'&&mode!=='cash')return;const refresh=()=>{if(document.visibilityState==='visible')router.refresh()};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[mode,router]);
 const date=new Date(starts).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
 const field=mode==='vente'||mode==='entree';
 return <div className="team-ui workspace"><aside className="workspace-side"><div className="side-top"><div><p className="eyebrow">Waren / Équipe</p><b>Mon événement</b><small>{date}</small></div><button type="button" className="menu-trigger" aria-expanded={open} aria-controls="workspace-menu" onClick={()=>menu(!open)}>{open?'Fermer':'Menu'}</button></div>
 <div id="workspace-menu" className={'side-body '+(open?'is-open':'')}><nav aria-label="Navigation de l’événement">{(Object.entries(sections) as [Section,string][]).map(([s,label])=><button type="button" key={s} aria-current={mode===s?'page':undefined} disabled={locked||busy} onClick={()=>{select(s);menu(false);setError('');if(s==='overview'||s==='cash')router.refresh()}}>{label}</button>)}</nav>
 <footer><Link href="/equipe">Mes événements</Link><SignOut label="Compte et session" loginPath="/equipe"/><small>{name||'Profil du coordinateur'}</small></footer></div></aside>
 <div className="workspace-main"><header className="event-title"><div><h1>{title}</h1><p>{sections[mode]}{mode==='overview'?' / pendant l’événement':''}</p></div><span className="role-pill">Coordination</span></header>
 {locked&&<p className="muted">Terminez l’opération en cours pour changer de rubrique.</p>}
 {!field?views[mode]:!registered?<form className="ui-panel form-stack" onSubmit={async e=>{e.preventDefault();const n=String(new FormData(e.currentTarget).get('name')).trim();wait(true);try{const r=await createClient().rpc('waren_coord_label',{p_event:id,p_name:n});if(r.error)throw r.error;setName(n)}catch{setError('Impossible d’enregistrer le nom. Réessayez.')}finally{wait(false)}}}><label>Votre nom pour les ventes et les contrôles<input className="input" name="name" minLength={2} maxLength={60} required/></label><button disabled={busy} className="button">Enregistrer mon nom</button>{error&&<p role="alert">{error}</p>}</form>:<Desk key={mode} fixed role={mode} events={[{id,title,starts_at:starts}]} onLock={lock}/>}</div></div>
}

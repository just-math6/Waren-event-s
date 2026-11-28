'use client';
import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';
import {footballTitle,footballTypes} from '@/lib/football-art';
import FootballTicket from '@/components/football-ticket';
import SignOut from '@/app/admin/(protected)/sign-out';
import Desk from '../../desk';
import './coordination.css';

const sections={overview:'Accueil',vente:'Vendre',entree:'Contrôler',team:'Équipe',cash:'Caisse'} as const;
type Section=keyof typeof sections;
const actions=[['vente','Vendre un billet'],['entree','Contrôle entrée'],['team','Accès de l’équipe']] as const;
function Icon({kind}:{kind:'vente'|'entree'|'team'}){
 const shape=kind==='vente'?<><path d="M3 5h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6z"/><path d="M14 6v2m0 3v2m0 3v2"/></>:kind==='entree'?<><path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3m-8 0H5a2 2 0 0 1-2-2v-3M7 12h10"/></>:<><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2M16 3a4 4 0 0 1 0 8m2 3a5 5 0 0 1 4 5v2"/></>;
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
type Props={id:string;title:string;starts:string;name:string|null;overview:ReactNode;team:ReactNode;cash:ReactNode};
export default function Modes({id,title,starts,name,...views}:Props){
 const [mode,select]=useState<Section>('overview'),[locked,lock]=useState(false),[registered,setName]=useState(name),[error,setError]=useState(''),[busy,wait]=useState(false);
 const router=useRouter(), football=title.trim().toLowerCase()===footballTitle.toLowerCase();
 useEffect(()=>{if(mode!=='overview'&&mode!=='cash')return;const refresh=()=>{if(document.visibilityState==='visible')router.refresh()};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[mode,router]);
 const date=new Date(starts).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
 function navigate(s:Section){if(busy||locked)return;select(s);setError('');if(s==='overview'||s==='cash')router.refresh()}
 const field=mode==='vente'||mode==='entree';
 return <div className="team-ui coordination">
  <header className="coord-mast"><div className="coord-brand"><span className="coord-monogram" aria-hidden="true">W</span><span><b>Waren</b> Events</span></div><span className="coord-private">Espace privé</span></header>
  <nav className="coord-nav" aria-label="Navigation de l’événement">{(Object.entries(sections) as [Section,string][]).map(([s,label])=><button key={s} type="button" aria-current={mode===s?'page':undefined} disabled={locked||busy} onClick={()=>navigate(s)}>{label}</button>)}</nav>
  <div className="coord-content">
  {mode==='overview'?<><section className={'coord-hero'+(football?' with-ticket':'')} aria-labelledby="event-heading">
  <div className="coord-hero-copy"><p className="coord-kicker">{football?'Football · Jour de match':'Événement · Coordination'}</p><h1 id="event-heading">{title}</h1><p className="coord-date">{date}<span aria-hidden="true"> · </span>Espace coordination</p></div>
  {football&&<div className="coord-art" aria-hidden="true"><FootballTicket usage="decoration" loading="eager" art={footballTypes[1]} qr="/maquettes/football/illustration-qr.svg"/></div>}
  <div className="coord-actions">{actions.map(([s,label])=><button key={s} type="button" onClick={()=>navigate(s)}><Icon kind={s}/><span>{label}</span></button>)}</div>
  </section>{views.overview}</>:<>
  {(mode!=='entree'||!registered)&&<header className="coord-subhead"><p className="eyebrow">{sections[mode]} · Espace coordination</p><h1>{title}</h1></header>}
  {locked&&<p className="muted">Terminez l’opération en cours pour changer de rubrique.</p>}
  {!field?views[mode]:!registered?<form className="ui-panel form-stack" onSubmit={async e=>{e.preventDefault();const n=String(new FormData(e.currentTarget).get('name')).trim();wait(true);try{const r=await createClient().rpc('waren_coord_label',{p_event:id,p_name:n});if(r.error)throw r.error;setName(n)}catch{setError('Impossible d’enregistrer le nom. Réessayez.')}finally{wait(false)}}}><label>Votre nom pour les ventes et les contrôles<input className="input" name="name" minLength={2} maxLength={60} required/></label><button disabled={busy} className="button">Enregistrer mon nom</button>{error&&<p role="alert">{error}</p>}</form>:<Desk key={mode} fixed role={mode} events={[{id,title,starts_at:starts}]} onLock={lock}/>}</>}
  </div>
  <footer className="coord-footer"><Link href="/equipe">Mes événements</Link><SignOut label="Mon compte" loginPath="/equipe"/></footer>
 </div>
}

'use client';
import {useEffect,useState,type ReactNode} from 'react';
import FootballTicket from '@/components/football-ticket';
import {footballTitle,footballTypes} from '@/lib/football-art';
import {gateMessage} from '@/lib/team-view';
import './station.css';

export type GateEvent={id:string;title:string;starts_at:string};
export type Entry={id:string;outcome:string;at?:string;scanned_at:string;type?:string;channel?:string;sold_by?:string;checked_by?:string};
export type StationData={operator:string|null;sold:number;used:number;history:Entry[]};
const dateFmt=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'UTC'});
function hour(stamp:string){return new Date(stamp).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
type Glyph='scan'|'keyboard'|'history';
export function Icon({name}:{name:Glyph}){
 return <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {name==='scan'?<path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3m-8 0H5a2 2 0 0 1-2-2v-3m4-4h10"/>:name==='keyboard'?<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 13h.01M11 13h.01M15 13h.01M7 16h10"/></>:<><path d="M3 3v5h5"/><path d="M3.7 7.7a9 9 0 1 1-1 7M12 7v5l4 2"/></>}
 </svg>
}
function brand(demo:boolean){return <header className="gate-mast"><div className="gate-brand"><span aria-hidden="true">W</span><div><b>Waren</b> Events</div></div><span className="gate-pill">{demo?'Démo contrôle':'Espace contrôle'}</span></header>}
export function Reader({football,demo=false,reference,category='VIP'}:{football:boolean;demo?:boolean;reference?:string;category?:string}){
 const art=footballTypes.find(t=>t.name===category)??footballTypes[1];
 return <div className="gate-reader"><p>{demo?'Lecteur de démonstration':'Lecteur de billets'}</p><div className="gate-frame" aria-hidden="true">{football?<FootballTicket usage="decoration" art={art} qr="/maquettes/football/illustration-qr.svg"/>:<Icon name="scan"/>}</div><div>{reference?'Référence : '+reference:'Placez le QR dans le cadre de la caméra'}</div></div>
}
function Signal({tone}:{tone:string}){return <span className="gate-sign" aria-hidden="true">{tone==='ok'?'✓':tone==='warn'?'!':'×'}</span>}
function Verdict({row,compact=false}:{row:Entry;compact?:boolean}){
 const {tone,title}=gateMessage(row.outcome);
 return <div className={'gate-verdict '+tone+(compact?' compact':'')}><div className="gate-verdict-title"><Signal tone={tone}/><b>{title}</b>{compact&&<time dateTime={row.scanned_at}>{hour(row.scanned_at)}</time>}</div>
 {(row.channel||row.type||row.sold_by)&&<p>{[row.channel,row.type,row.sold_by&&'Vendu par '+row.sold_by].filter(Boolean).join(' · ')}</p>}
 {row.at&&<p>{row.outcome==='utilise'?'Premier passage : ':'Entrée à '}{hour(row.at)}{row.checked_by?' · '+row.checked_by:''}</p>}
 </div>
}
type Props={event:GateEvent;data:StationData|null;demo?:boolean;embedded?:boolean;roleLabel?:string;busy:boolean;offline?:boolean;error?:string;result:Entry|null;camera:ReactNode;manual:ReactNode;onHistory?:()=>void};
export default function Station({event,data,demo=false,embedded=false,roleLabel='Contrôle entrée',busy,offline=false,error,result,camera,manual,onHistory}:Props){
 const [tab,tabTo]=useState<'scan'|'history'>('scan'),[method,methodTo]=useState<'qr'|'manual'>('qr');
 const [dismissed,dismiss]=useState<string|null>(null);
 useEffect(()=>{if(!result)return;const t=setTimeout(()=>dismiss(result.id),result.outcome==='accepted'?8000:15000);return()=>clearTimeout(t)},[result]);
 return <section className={'gate-shell'+(embedded?' gate-embedded':'')} aria-label="Poste de contrôle des entrées">
 {!embedded&&brand(demo)}
 <div className="gate-content">
 <div className="gate-person"><div><i className={offline?'down':''} aria-hidden="true"/><b>{data?.operator||'Équipe'}</b> · {roleLabel}</div><span>Poste d’entrée</span></div>
 <section className="gate-event"><div><p>Contrôle entrée</p><h1>{event.title}</h1><span>{dateFmt.format(new Date(event.starts_at))} · {demo?'Porte principale':'Poste d’entrée'}</span></div>
 <div className="gate-meter"><span>Billets scannés</span><strong>{data?data.used:'—'} <small>/ {data?data.sold:'—'}</small></strong><progress aria-label="Billets scannés sur billets vendus" value={data?.used??0} max={Math.max(1,data?.sold??0)}/></div></section>
 {offline&&<p className="gate-error" role="status">Hors connexion. Attendez la confirmation du serveur avant d’autoriser une entrée.</p>}
 {error&&<p className="gate-error" role="alert">{error}</p>}
 {tab==='scan'?<>
 <div className="gate-switch" role="group" aria-label="Mode de lecture">{([['qr','scan','Scan QR'],['manual','keyboard','Saisie manuelle']] as const).map(([key,icon,label])=><button key={key} type="button" aria-pressed={method===key} disabled={busy} onClick={()=>{if(method!==key&&result)dismiss(result.id);methodTo(key)}}><Icon name={icon}/><span>{label}</span></button>)}</div>
 <div aria-live="polite" aria-atomic="true" className="gate-feedback">{result&&result.id!==dismissed&&!busy&&<Verdict row={result}/>}</div>
 <section className="gate-tool">{method==='qr'?camera:manual}</section>
 </>:<section className="gate-log"><h2>Historique des contrôles</h2><p>Vos 40 derniers contrôles pour cet événement.</p>
 {!data?<p>{error?'Historique indisponible.':'Chargement…'}</p>:data.history.length?<ol>{data.history.map(row=><li key={row.id}><Verdict row={row} compact/></li>)}</ol>:<p>Aucun contrôle enregistré pour le moment.</p>}</section>}
 </div>
 <nav className="gate-bottom" aria-label="Navigation du poste">{([['scan','scan','Contrôler'],['history','history','Historique']] as const).map(([key,icon,label])=><button type="button" key={key} aria-current={tab===key?'page':undefined} disabled={busy} onClick={()=>{if(tab!==key&&result)dismiss(result.id);tabTo(key);if(key==='history')onHistory?.()}}><Icon name={icon}/><span>{label}</span></button>)}</nav>
 </section>
}
export function Manual({busy,onScan,demo=false}:{busy:boolean;onScan:(key:string)=>Promise<void>;demo?:boolean}){
 const [code,setCode]=useState('');
 return <form className="gate-form" onSubmit={e=>{e.preventDefault();if(!busy&&code.trim()){void onScan(code.trim());setCode('')}}}><label>Référence du billet<input type="text" value={code} maxLength={160} placeholder={demo?'Ex. : P-102':'Saisir le code imprimé'} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} onChange={e=>setCode(e.target.value)} required disabled={busy}/></label><button className="gate-primary" disabled={busy||!code.trim()}><Icon name="keyboard"/>{busy?'Vérification…':'Contrôler ce billet'}</button></form>
}
export const isFootball=(event:GateEvent)=>event.title.trim().toLowerCase()===footballTitle.toLowerCase();

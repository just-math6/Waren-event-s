'use client';
import dynamic from 'next/dynamic';
import {useState,useEffect,useRef} from 'react';
import {createClient} from '@/lib/supabase';
import {fcfa} from '@/lib/team-view';
import {footballPreview, footballTypes} from '@/lib/football-art';
import LiveGate from './controle/live';
import {VirtualSale,MySales} from './virtual-sale';
const Camera=dynamic(()=>import('../admin/(protected)/evenements/[id]/scan/camera'),{ssr:false});
type EventItem={id:string;title:string;starts_at:string};
type Item={code:string;price:number;name:string};
type Result={tone:string;title:string;detail?:string;extra?:string};
export default function Desk({events,role,fixed=false,onLock}:{events:EventItem[];role:string;fixed?:boolean;onLock?:(v:boolean)=>void}){
 const [event,setEvent]=useState(fixed||events.length===1?events[0]?.id??'':''),[mode,setMode]=useState(role==='entree'?'entree':'vente'),[section,go]=useState<'home'|'paper'|'virtual'|'history'>('home');
 const [code,input]=useState(''),[manual,show]=useState(false),[cart,items]=useState<Item[]>([]),[result,note]=useState<Result|null>(null),[busy,wait]=useState(false),[virtualLock,hold]=useState(false),[online,network]=useState(true);
 const locked=busy||!!cart.length||virtualLock, guard=useRef(false),request=useRef('');
 useEffect(()=>{onLock?.(locked);return()=>onLock?.(false)},[locked,onLock]);
 useEffect(()=>{const update=()=>network(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
 function reset(){input('');show(false);note(null);go('home')}
 async function operate(fn:()=>Promise<void>){if(guard.current)return;guard.current=true;wait(true);try{await fn()}catch{note({tone:'bad',title:'Connexion interrompue',detail:'Réessayez avant de remettre le billet ou d’autoriser l’entrée.'})}finally{wait(false);guard.current=false}}
 async function scan(raw:string){if(!online||!raw.trim())return;await operate(async()=>{
 const {data:d,error}=await createClient().rpc('waren_quote',{p_event:event,p_key:raw.trim()});input('');if(error){note({tone:'bad',title:error.message.includes('Billet inconnu')?'Billet indisponible':'Vérification impossible',detail:'Vérifiez le code, votre accès et la connexion.'});return}
 if(cart.some(x=>x.code===d.code)||cart.length>=50){note({tone:'warn',title:cart.length>=50?'Panier complet':'Déjà dans le panier'});return}items([...cart,d]);request.current='';note(null);
 })}
 const total=cart.reduce((n,x)=>n+Number(x.price),0);
 async function pay(){await operate(async()=>{request.current ||=crypto.randomUUID();const {error}=await createClient().rpc('waren_sell',{p_event:event,p_codes:cart.map(x=>x.code),p_sale:request.current});if(error){note({tone:'bad',title:'Paiement non confirmé',detail:'Vérifiez le panier puis réessayez.'});return}note({tone:'ok',title:'Paiement enregistré',detail:cart.length+' billet(s) activé(s) · '+fcfa(total)});items([]);request.current=''})}
 const selling=mode==='vente',current=events.find(e=>e.id===event);
 return <section className="team-ui field-desk">
 {!fixed&&(selling||!current)&&<header className="field-header"><p className="eyebrow">Waren / Équipe</p><h1>{current?.title||'Mon événement'}</h1>{current&&<small>{new Date(current.starts_at).toLocaleDateString('fr-FR',{dateStyle:'long',timeZone:'UTC'})}</small>}</header>}
 {!fixed&&(events.length!==1)&&<label>Événement<select className="input" disabled={locked} value={event} onChange={e=>{setEvent(e.target.value);reset()}}><option value="">Choisir un événement</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>}
 {['admin','terrain'].includes(role)&&<nav aria-label="Mode du poste" className="segments">{(['vente','entree'] as const).map(m=><button disabled={locked} aria-pressed={m===mode} type="button" key={m} onClick={()=>{setMode(m);reset()}}>{m==='vente'?'Vente':'Contrôle entrée'}</button>)}</nav>}
 {event&&<>{selling&&section!=='home'&&<button className="text-action" disabled={locked} onClick={()=>{go('home');show(false);note(null)}}>Retour à la vente</button>}
 {!selling&&current?<LiveGate key={event} event={current} embedded={fixed} onLock={hold}/>:selling&&section==='home'?<section className="sell-home"><p className="eyebrow">Espace vendeur</p><h2>Vendre un billet</h2><div className="sale-choices">
 <button onClick={()=>go('paper')}><span className="eyebrow">01 / Papier</span><strong>Activer un billet papier</strong><small>Activer le billet après avoir reçu le prix complet.</small></button>
 <button onClick={()=>go('virtual')}><span className="eyebrow">02 / Virtuel</span><strong>Envoyer un billet virtuel</strong><small>Remettre le billet par WhatsApp après paiement.</small></button></div><button className="secondary" onClick={()=>go('history')}>Mes ventes</button></section>
 :selling&&section==='virtual'?<VirtualSale key={event} event={event} eventTitle={current!.title} onLock={hold}/>:selling&&section==='history'?<MySales key={event} event={event} eventTitle={current!.title}/>:<section className="ui-panel scan-panel">
 <p className="eyebrow">01 / Papier</p><h2>Activer le ticket imprimé</h2>
 {selling&&current?.title.trim().toLowerCase()==='football tournament two'&&<img className="paper-example" {...footballPreview(footballTypes[0])} loading="lazy" alt="Billet Standard : emplacement du code QR à droite"/>}
 {selling&&<p className="muted">Scannez les billets, puis confirmez quand vous avez reçu le total affiché.</p>}
 {!online?<div className="notice warn">Connexion requise pour ce poste. Suspendez les ventes.</div>:<Camera disabled={busy} onScan={scan}/>}
 {result&&<div className={'notice '+result.tone} role="status" aria-live="polite"><strong>{result.title}</strong>{result.detail&&<p>{result.detail}</p>}{result.extra&&<small>{result.extra}</small>}</div>}
 <button className="secondary" type="button" aria-expanded={manual} onClick={()=>show(!manual)}>{manual?'Fermer la saisie':'Saisir le code si le QR est illisible'}</button>{manual&&<form className="form-stack" onSubmit={e=>{e.preventDefault();void scan(code)}}><label>Code du billet<input className="input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={code} onChange={e=>input(e.target.value)} required/></label><button className="button" disabled={busy||!online}>Vérifier le billet</button></form>}
 {selling&&<><div>{cart.map(x=><div key={x.code} className="cart-item"><div><b>{x.name} · {fcfa(x.price)}</b><small>{x.code}</small></div><button disabled={busy} className="text-action" onClick={()=>{items(cart.filter(i=>i.code!==x.code));request.current=''}}>Retirer</button></div>)}</div><button className="button" disabled={busy||!online||!cart.length} onClick={pay}>{busy?'Vérification…':cart.length?'J’ai reçu '+fcfa(total):'Confirmer le paiement complet'}</button><small>Aucun nom ni téléphone demandé à l’acheteur.</small></>}</section>}</>}
 </section>
}

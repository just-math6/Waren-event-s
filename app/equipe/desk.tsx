'use client';
import dynamic from 'next/dynamic';
import {useState,useEffect,useRef} from 'react';
import {createClient} from '@/lib/supabase';
import {fcfa,gateMessage} from '@/lib/team-view';
import {VirtualSale,MySales} from './virtual-sale';
const Camera=dynamic(()=>import('../admin/(protected)/evenements/[id]/scan/camera'),{ssr:false});
type EventItem={id:string;title:string;starts_at:string};
type Item={code:string;price:number;name:string};
type Result={tone:string;title:string;detail?:string;extra?:string};
const clock=(at:string)=>new Date(at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
export default function Desk({events,role,fixed=false,onLock}:{events:EventItem[];role:string;fixed?:boolean;onLock?:(v:boolean)=>void}){
 const [event,setEvent]=useState(fixed||events.length===1?events[0]?.id??'':''),[mode,setMode]=useState(role==='entree'?'entree':'vente'),[section,go]=useState<'home'|'paper'|'virtual'|'history'>('home');
 const [code,input]=useState(''),[manual,show]=useState(false),[cart,items]=useState<Item[]>([]),[result,note]=useState<Result|null>(null),[busy,wait]=useState(false),[virtualLock,hold]=useState(false),[online,network]=useState(true),[count,setCount]=useState<{used:number;sold:number}|null>(null),[revision,refresh]=useState(0);
 const locked=busy||!!cart.length||virtualLock, guard=useRef(false),request=useRef('');
 useEffect(()=>{onLock?.(locked);return()=>onLock?.(false)},[locked,onLock]);
 useEffect(()=>{const update=()=>network(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
 useEffect(()=>{if(!event||mode!=='entree'||!online)return;let live=true;async function read(){try{const r=await createClient().rpc('waren_gate_count',{p_event:event});if(live)setCount(r.error?null:r.data)}catch{if(live)setCount(null)}}void read();const t=setInterval(read,10000);return()=>{live=false;clearInterval(t)}},[event,mode,online,revision]);
 function reset(){input('');show(false);note(null);setCount(null);go('home')}
 async function operate(fn:()=>Promise<void>){if(guard.current)return;guard.current=true;wait(true);try{await fn()}catch{note({tone:'bad',title:'Connexion interrompue',detail:'Réessayez avant de remettre le billet ou d’autoriser l’entrée.'})}finally{wait(false);guard.current=false}}
 async function scan(raw:string){if(!online||!raw.trim())return;await operate(async()=>{
 const {data:d,error}=await createClient().rpc(mode==='vente'?'waren_quote':'waren_gate_detail',{p_event:event,p_key:raw.trim()});input('');if(error){note({tone:'bad',title:error.message.includes('Billet inconnu')?'Billet indisponible':'Vérification impossible',detail:mode==='entree'?'N’autorisez pas l’entrée sans résultat.':'Vérifiez le code, votre accès et la connexion.'});return}
 if(mode==='entree'){const type=[d.type,d.channel,d.sold_by?'Vendu par '+d.sold_by:null].filter(Boolean).join(' · ');
 const time=d.at&&clock(d.at);note({...gateMessage(d.outcome),detail:type,extra:d.outcome==='utilise'?(time?'Premier passage : '+time+'. ':'')+'Orienter le détenteur vers le coordinateur.':d.outcome==='accepted'?(time?'Contrôlé à '+time:'')+(d.checked_by?' · '+d.checked_by:''):'Entrée refusée.'});refresh(n=>n+1);return}
 if(cart.some(x=>x.code===d.code)||cart.length>=50){note({tone:'warn',title:cart.length>=50?'Panier complet':'Déjà dans le panier'});return}items([...cart,d]);request.current='';note(null);
 })}
 const total=cart.reduce((n,x)=>n+Number(x.price),0);
 async function pay(){await operate(async()=>{request.current ||=crypto.randomUUID();const {error}=await createClient().rpc('waren_sell',{p_event:event,p_codes:cart.map(x=>x.code),p_sale:request.current});if(error){note({tone:'bad',title:'Paiement non confirmé',detail:'Vérifiez le panier puis réessayez.'});return}note({tone:'ok',title:'Paiement enregistré',detail:cart.length+' billet(s) activé(s) · '+fcfa(total)});items([]);request.current=''})}
 const selling=mode==='vente',current=events.find(e=>e.id===event);
 return <section className="team-ui field-desk">
 {!fixed&&<header className="field-header"><p className="eyebrow">Waren / Équipe</p><h1>{current?.title||'Mon événement'}</h1>{current&&<small>{new Date(current.starts_at).toLocaleDateString('fr-FR',{dateStyle:'long',timeZone:'UTC'})}</small>}</header>}
 {!fixed&&(events.length!==1)&&<label>Événement<select className="input" disabled={locked} value={event} onChange={e=>{setEvent(e.target.value);reset()}}><option value="">Choisir un événement</option>{events.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>}
 {['admin','terrain'].includes(role)&&<nav aria-label="Mode du poste" className="segments">{(['vente','entree'] as const).map(m=><button disabled={locked} aria-pressed={m===mode} type="button" key={m} onClick={()=>{setMode(m);reset()}}>{m==='vente'?'Vente':'Contrôle entrée'}</button>)}</nav>}
 {event&&<>{selling&&section!=='home'&&<button className="text-action" disabled={locked} onClick={()=>{go('home');show(false);note(null)}}>Retour à la vente</button>}
 {selling&&section==='home'?<section className="sell-home"><p className="eyebrow">Espace vendeur</p><h2>Vendre un billet</h2><div className="sale-choices">
 <button onClick={()=>go('paper')}><span className="eyebrow">01 / Papier</span><strong>Activer un billet papier</strong><small>Scanner le ticket imprimé et confirmer les espèces.</small></button>
 <button onClick={()=>go('virtual')}><span className="eyebrow">02 / Virtuel</span><strong>Envoyer un billet virtuel</strong><small>Remettre le billet par WhatsApp après paiement.</small></button></div><button className="secondary" onClick={()=>go('history')}>Mes ventes</button></section>
 :selling&&section==='virtual'?<VirtualSale event={event} onLock={hold}/>:selling&&section==='history'?<MySales event={event}/>:<section className="ui-panel scan-panel">
 <p className="eyebrow">{selling?'01 / Papier':'Téléphone du contrôleur'}</p><h2>{selling?'Activer le ticket imprimé':'Contrôle entrée'}</h2>
 {!selling&&<p className={'connection '+(!online?'amber':'')}><i/>{online?'En ligne':'Hors connexion'}{online&&count?' · '+count.used+' / '+count.sold+' entrées':''}</p>}
 {selling&&current?.title.trim().toLowerCase()==='football tournament two'&&<img className="paper-example" src="/maquettes/football/standard.jpg" alt="Maquette du billet Standard"/>}
 {selling&&<p className="muted">Scannez le QR du billet du lot, puis vérifiez sa catégorie et son prix.</p>}
 {!online?<div className="notice warn">Connexion requise pour ce poste. {selling?'Suspendez les ventes.':'N’autorisez pas l’entrée depuis cet appareil.'}</div>:<Camera disabled={busy} onScan={scan}/>}
 {result&&<div className={'notice '+result.tone} role="status" aria-live="polite"><strong>{result.title}</strong>{result.detail&&<p>{result.detail}</p>}{result.extra&&<small>{result.extra}</small>}</div>}
 <button className="secondary" type="button" aria-expanded={manual} onClick={()=>show(!manual)}>{manual?'Fermer la saisie':'Saisir le code si le QR est illisible'}</button>{manual&&<form className="form-stack" onSubmit={e=>{e.preventDefault();void scan(code)}}><label>Code du billet<input className="input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={code} onChange={e=>input(e.target.value)} required/></label><button className="button" disabled={busy||!online}>{selling?'Vérifier le billet':'Contrôler ce billet'}</button></form>}
 {selling&&<><div>{cart.map(x=><div key={x.code} className="cart-item"><div><b>{x.name} · {fcfa(x.price)}</b><small>{x.code}</small></div><button disabled={busy} className="text-action" onClick={()=>{items(cart.filter(i=>i.code!==x.code));request.current=''}}>Retirer</button></div>)}</div><button className="button" disabled={busy||!online||!cart.length} onClick={pay}>{cart.length?'Confirmer les '+fcfa(total)+' reçus':'Confirmer les espèces reçues'}</button><small>Aucun nom ni téléphone demandé à l’acheteur.</small></>}</section>}</>}
 </section>
}

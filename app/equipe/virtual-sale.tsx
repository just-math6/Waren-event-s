'use client';
import {useEffect,useState,useRef} from 'react';
import {createClient} from '@/lib/supabase';
import {validPhone,normalizePhone,whatsappLink} from '@/lib/sale-input';
import {fcfa} from '@/lib/team-view';
type Cat={id:string;name:string;price:number;available:number};
export function Delivery({token,phone,buyer}:{token:string;phone:string;buyer:string}){
 const [msg,set]=useState(''),[origin,host]=useState('');useEffect(()=>host(window.location.origin),[]);
 if(!origin)return null;
 const href=origin+'/billet/'+token;
 return <div className="delivery"><a className="button" target="_blank" rel="noopener noreferrer" href={whatsappLink(phone,buyer,href)}>Ouvrir WhatsApp</a><button className="secondary" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(href);set('Lien copié.')}catch{set(href)}}}>Copier le lien</button><p className="muted break-all" role="status">{msg}</p></div>
}
export function VirtualSale({event,onLock}:{event:string;onLock:(b:boolean)=>void}){
 const [cats,setCats]=useState<Cat[]>([]),[id,select]=useState(''),[buyer,name]=useState(''),[phone,num]=useState(''),[busy,wait]=useState(false),[message,note]=useState(''),[token,finish]=useState(''),[retry,again]=useState(0),[loading,load]=useState(true);
 const req=useRef(''),attempt=useRef(false),[uncertain,hold]=useState(false);
 useEffect(()=>{let live=true;load(true);note('');async function fetchTypes(){try{const {data,error}=await createClient().rpc('waren_sales_catalog',{p_event:event});if(error)throw error;if(live){const c=data as Cat[];setCats(c);select(old=>c.some(x=>x.id===old)?old:c.find(x=>x.available>0)?.id??'')}}catch{if(live)note('Impossible de charger les catégories.')}finally{if(live)load(false)}}void fetchTypes();return()=>{live=false}},[event,retry]);
 const chosen=cats.find(c=>c.id===id);
 useEffect(()=>{onLock(busy||uncertain);return()=>onLock(false)},[busy,uncertain,onLock]);
 if(token)return <section className="ui-panel"><p className="eyebrow">Après confirmation</p><h2>Paiement enregistré</h2><p className="muted">{buyer} · {chosen?.name}</p><Delivery token={token} buyer={buyer} phone={phone}/><button className="text-action" onClick={()=>{finish('');name('');num('');again(n=>n+1)}}>Nouvelle vente virtuelle</button></section>;
 return <form className="ui-panel form-stack" onSubmit={async e=>{e.preventDefault();if(attempt.current||!chosen||!buyer.trim())return;if(!validPhone(phone)){note('Indiquez le numéro WhatsApp avec son indicatif pays.');return}
 attempt.current=true;wait(true);note('');req.current ||=crypto.randomUUID();try{const {data,error}=await createClient().rpc('waren_sell_virtual',{p_event:event,p_type:id,p_name:buyer.trim(),p_phone:normalizePhone(phone),p_request:req.current});if(error){if(!error.code||error.code.startsWith('5'))throw error;hold(false);note(error.message.includes('disponibles')?'Plus de billets disponibles pour cette catégorie.':error.message.includes('confirmation')?'Cette confirmation a déjà servi. Consultez Mes ventes.':'Vente refusée. Vérifiez la catégorie et le contact.');return}finish(data);hold(false);req.current=''}catch{hold(true);note('Réponse non reçue. Réessayez la même confirmation pour vérifier la vente.')}finally{attempt.current=false;wait(false)}}}>
 <p className="eyebrow">02 / Virtuel</p><h2>Envoyer le billet par WhatsApp</h2>
 <fieldset disabled={busy||uncertain}><legend>Catégorie</legend><div className="category-options">{cats.map(c=><button type="button" key={c.id} disabled={!c.available} aria-pressed={c.id===id} onClick={()=>select(c.id)}>{c.name}<small>{c.available?fcfa(c.price):'Épuisé'}</small></button>)}</div></fieldset>
 {loading&&<p className="muted">Chargement des catégories…</p>}{!loading&&!cats.length&&<button className="text-action" type="button" onClick={()=>again(n=>n+1)}>Actualiser les catégories</button>}
 <label>Prénom de l’acheteur<input className="input" value={buyer} onChange={e=>name(e.target.value)} disabled={busy||uncertain} maxLength={200} required autoComplete="given-name"/></label>
 <label>Numéro WhatsApp<input className="input" type="tel" value={phone} onChange={e=>num(e.target.value)} disabled={busy||uncertain} required placeholder="+226 …" autoComplete="tel"/></label>
 <button disabled={!chosen||busy||(!chosen.available&&!uncertain)} className="button">{busy?'Confirmation…':chosen?'Confirmer les '+fcfa(chosen.price)+' reçus':'Confirmer les espèces reçues'}</button>{message&&<p className="notice warn" role="status">{message}</p>}
 <small>Si le message ne part pas, renvoyez le même lien depuis « Mes ventes ».</small></form>
}
type Sale={id:string;sold_at:string;name:string;price_paid:number;channel:string;status:string;token:string|null;phone:string;buyer:string};
export function MySales({event}:{event:string}){
 const [rows,set]=useState<Sale[]>([]),[msg,note]=useState(''),[retry,again]=useState(0),[opened,open]=useState(''),[loading,load]=useState(true);
 useEffect(()=>{let live=true;load(true);note('');(async()=>{try{const r=await createClient().rpc('waren_my_sales',{p_event:event});if(r.error)throw r.error;if(live)set(r.data)}catch{if(live)note('Impossible de charger vos ventes.')}finally{if(live)load(false)}})();return()=>{live=false}},[event,retry]);
 return <section className="ui-panel"><p className="eyebrow">Vente</p><h2>Mes ventes</h2><button className="text-action" onClick={()=>again(n=>n+1)}>Actualiser</button>{loading?<p>Chargement…</p>:msg?<p role="alert">{msg}</p>:!rows.length?<p className="empty">Aucune vente pour cet événement.</p>:<><p className="muted">Les 100 dernières ventes de votre poste.</p>{rows.map(s=><div className="sale-line" key={s.id}><div><b>{s.name} · {fcfa(s.price_paid)}</b><small>{s.channel} · {new Date(s.sold_at).toLocaleString('fr-FR')} · {s.buyer}{s.status==='annule'?' · Annulé':''}</small></div>{s.token&&<><button className="text-action" onClick={()=>open(opened===s.id?'':s.id)}>Renvoyer le même billet</button>{opened===s.id&&<Delivery token={s.token} phone={s.phone} buyer={s.buyer}/>}</>}</div>)}</>}</section>
}

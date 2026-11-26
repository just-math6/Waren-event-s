'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase';
import {validPhone,normalizePhone,phoneHint} from '@/lib/sale-input';
import {availableCategory,type Receipt} from '@/lib/ticket-delivery';
import {validTicketToken} from '@/lib/public-ticket';
import {fcfa} from '@/lib/team-view';
import TicketDelivery,{prepareWhatsApp} from '@/components/ticket-delivery';
type Cat={id:string;name:string;price:number;available:number};
export function VirtualSale({event,eventTitle,onLock}:{event:string;eventTitle:string;onLock:(b:boolean)=>void}){
 const [cats,setCats]=useState<Cat[]>([]),[id,select]=useState(''),[buyer,name]=useState(''),[phone,num]=useState(''),[busy,wait]=useState(false),[message,note]=useState(''),[receipt,finish]=useState<Receipt|null>(null),[revision,revise]=useState(0),[loading,load]=useState(true),[catalogError,setCatalogError]=useState(false);
 const request=useRef(''),attempt=useRef(false),[uncertain,hold]=useState(false);
 useEffect(()=>{let live=true;load(true);setCatalogError(false);
   (async()=>{try{const {data,error}=await createClient().rpc('waren_sales_catalog',{p_event:event});if(error||!Array.isArray(data))throw new Error();
     if(live){const c=data as Cat[];setCats(c);select(old=>availableCategory(c,old,x=>x.available)?.id??'')}}
     catch{if(live){setCats([]);select('');setCatalogError(true)}}finally{if(live)load(false)}})();
   return()=>{live=false}
 },[event,revision]);
 useEffect(()=>{onLock(busy||uncertain);return()=>onLock(false)},[busy,uncertain,onLock]);
 const chosen=cats.find(c=>c.id===id);
 function refresh(){load(true);revise(x=>x+1)}
 async function submit(e:FormEvent){
   e.preventDefault();if(attempt.current||receipt||loading||!chosen||(!chosen.available&&!uncertain)||!buyer.trim())return;
   if(!validPhone(phone)){note(phoneHint);return}
   const popup=prepareWhatsApp();attempt.current=true;wait(true);note('');
   try{
     request.current ||=crypto.randomUUID();
     const {data,error}=await createClient().rpc('waren_sell_virtual',{p_event:event,p_type:id,p_name:buyer.trim(),p_phone:normalizePhone(phone),p_request:request.current});
     if(error){
       if(!error.code||error.code.startsWith('5'))throw error;
       hold(false);popup.cancel();
       if(/disponibles|catégorie introuvable/i.test(error.message)){note('Cette catégorie n’est plus disponible. Vérifiez le nouveau stock avant de confirmer.');refresh()}
       else note(error.message.includes('confirmation')?'Cette confirmation a déjà servi. Consultez Mes ventes.':'Vente refusée. Vérifiez la catégorie et le contact.');
       return;
     }
     if(typeof data!=='string'||!validTicketToken(data))throw new Error();
     const paid={token:data,phone,buyer:buyer.trim(),category:chosen.name,eventTitle};
     finish(paid);hold(false);request.current='';popup.open(paid);
   }catch{popup.cancel();hold(true);note('Réponse non reçue. Reprenez la même confirmation : aucun deuxième billet ne sera créé.')}
   finally{attempt.current=false;wait(false)}
 }
 if(receipt)return <section className="ui-panel"><p className="eyebrow">Billet virtuel</p><h2>Paiement enregistré</h2><p className="muted">{receipt.buyer} · {receipt.category}</p><TicketDelivery receipt={receipt}/><button className="text-action" onClick={()=>{finish(null);name('');num('');note('');refresh()}}>Nouvelle vente virtuelle</button></section>;
 return <form className="ui-panel form-stack" onSubmit={submit}>
 <p className="eyebrow">02 / Virtuel</p><h2>Envoyer le billet par WhatsApp</h2>
 <fieldset disabled={busy||uncertain||loading}><legend>Catégorie du billet</legend><div className="category-options">{cats.map(c=><button key={c.id} type="button" disabled={c.available<=0} aria-pressed={c.id===id&&c.available>0} onClick={()=>{select(c.id);note('')}}>{c.name}<small>{fcfa(c.price)} · {c.available>0?c.available+' disponible'+(c.available>1?'s':''):'Épuisé'}</small></button>)}</div></fieldset>
 {loading?<p className="muted">Chargement des catégories…</p>:catalogError?<p role="alert">Impossible de charger les catégories.</p>:!chosen&&<p role="status">Aucun billet virtuel disponible. Les billets déjà préparés pour l’impression sont réservés au papier.</p>}
 {!chosen&&!loading&&<button className="text-action" type="button" onClick={refresh}>Actualiser les catégories</button>}
 <label>Prénom de l’acheteur<input className="input" value={buyer} onChange={e=>name(e.target.value)} disabled={busy||uncertain} maxLength={200} required autoComplete="given-name"/></label>
 <label>Numéro WhatsApp<input className="input" type="tel" value={phone} onChange={e=>num(e.target.value)} disabled={busy||uncertain} maxLength={30} required placeholder="Ex. : 70 12 34 56" aria-describedby="virt-phone-hint" autoComplete="tel"/></label>
 <p className="muted" id="virt-phone-hint">{phoneHint}{validPhone(phone)&&' Destinataire : +'+normalizePhone(phone)+'.'}</p>
 <button disabled={loading||!chosen||busy||(!chosen.available&&!uncertain)} className="button">{busy?'Confirmation…':uncertain?'Reprendre la confirmation':chosen?'J’ai reçu '+fcfa(chosen.price)+' · Ouvrir WhatsApp':'Confirmer le paiement complet'}</button>{message&&<p className="notice warn" role="status">{message}</p>}
 <small>Vous appuierez sur « Envoyer » dans WhatsApp. Le lien reste disponible dans « Mes ventes ».</small></form>;
}
type Sale={id:string;sold_at:string;name:string;price_paid:number;channel:string;status:string;token:string|null;phone:string;buyer:string};
export function MySales({event,eventTitle}:{event:string;eventTitle:string}){
 const [rows,set]=useState<Sale[]>([]),[msg,note]=useState(''),[retry,again]=useState(0),[opened,open]=useState(''),[loading,load]=useState(true);
 useEffect(()=>{let live=true;load(true);note('');(async()=>{try{const r=await createClient().rpc('waren_my_sales',{p_event:event});if(r.error)throw r.error;if(live)set(r.data)}catch{if(live)note('Impossible de charger vos ventes.')}finally{if(live)load(false)}})();return()=>{live=false}},[event,retry]);
 return <section className="ui-panel"><p className="eyebrow">Vente</p><h2>Mes ventes</h2><button className="text-action" onClick={()=>again(n=>n+1)}>Actualiser</button>{loading?<p>Chargement…</p>:msg?<p role="alert">{msg}</p>:!rows.length?<p className="empty">Aucune vente pour cet événement.</p>:<><p className="muted">Les 100 dernières ventes de votre poste.</p>{rows.map(s=><div className="sale-line" key={s.id}><div><b>{s.name} · {fcfa(s.price_paid)}</b><small>{s.channel} · {new Date(s.sold_at).toLocaleString('fr-FR')} · {s.buyer}{s.status==='annule'?' · Annulé':''}</small></div>{s.token&&<><button className="text-action" onClick={()=>open(opened===s.id?'':s.id)}>Renvoyer le même billet</button>{opened===s.id&&<TicketDelivery receipt={{token:s.token,phone:/^[1-9]\d{8,14}$/.test(s.phone)?'+'+s.phone:s.phone||'',buyer:s.buyer,category:s.name,eventTitle}}/>}</>}</div>)}</>}</section>
}

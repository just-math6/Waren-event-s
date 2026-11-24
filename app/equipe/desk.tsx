'use client';
import dynamic from 'next/dynamic';
import {useState,useRef} from 'react';
import {createClient} from '@/lib/supabase';
const Camera=dynamic(()=>import('../admin/(protected)/evenements/[id]/scan/camera'),{ssr:false});
type Item={code:string;price:number;name:string};
export default function Desk({events,role}:{events:{id:string;title:string;starts_at:string}[];role:string}){
 const [event,setEvent]=useState(''),[mode,setMode]=useState(role==='entree'?'entree':'vente'),[key,setKey]=useState(''),[cart,items]=useState<Item[]>([]),[msg,status]=useState(''),[color,tint]=useState('text-gray-500'),[busy,wait]=useState(false);
 const lock=useRef(false),request=useRef('');
 function note(s:string,c='text-gray-500'){status(s);tint(c)}
 async function run(f:()=>Promise<void>){if(lock.current)return;lock.current=true;wait(true);try{await f()}catch{note('Connexion interrompue. Réessayez avant de remettre le billet ou d’autoriser l’entrée.','text-red-600')}finally{lock.current=false;wait(false)}}
 async function scan(raw:string){await run(async()=>{
 const p_key=raw.trim();if(!event||!p_key)return;setKey('');
 const {data,error}=await createClient().rpc(mode==='vente'?'waren_quote':'waren_gate',{p_event:event,p_key});
 if(error){note(error.message.includes('Billet inconnu')?error.message:'Vérification impossible. Vérifiez votre accès et la connexion.','text-red-600');return}
 if(mode==='vente'){if(cart.some(x=>x.code===data.code)){note('Déjà dans le panier.','text-amber-600');return}if(cart.length>=50){note('Maximum 50 billets par vente.');return}items([...cart,data]);request.current='';note('Billet ajouté.');return}
 const out=data.outcome;note(out==='accepted'?'Entrée autorisée':out==='utilise'?'Déjà utilisé à '+new Date(data.at).toLocaleTimeString('fr-CA'):out==='pret'?'Billet non vendu':out==='bloque'||out==='annule'?'Billet bloqué ou annulé':'Billet inconnu pour cet événement',out==='accepted'?'text-green-600':out==='utilise'?'text-amber-600':'text-red-600')
 })}
 async function pay(){await run(async()=>{request.current ||= crypto.randomUUID();const {error}=await createClient().rpc('waren_sell',{p_event:event,p_codes:cart.map(x=>x.code),p_sale:request.current});
 if(error){note(error.message.includes('déjà vendu')?error.message:'Confirmation impossible. Réessayez avec le même panier.','text-red-600');return}
 note(cart.length+' billet(s) activé(s). Paiement enregistré.','text-green-600');items([]);request.current='';})}
 return <section className="space-y-4"><h1 className="text-2xl font-semibold">{mode==='vente'?'Vente de billets papier':'Contrôle entrée'}</h1>
 {role==='admin'&&<select aria-label="Mode" className="input" disabled={busy||!!cart.length} value={mode} onChange={e=>{setMode(e.target.value);note('')}}><option value="vente">Vente</option><option value="entree">Contrôle entrée</option></select>}
 <label>Événement<select className="input" disabled={busy||!!cart.length} value={event} onChange={e=>{setEvent(e.target.value);note('')}}><option value="">Choisir un événement</option>{events.map(e=><option key={e.id} value={e.id}>{e.title} · {new Date(e.starts_at).toLocaleDateString('fr-CA')}</option>)}</select></label>
 {event&&<><Camera onScan={scan} disabled={busy}/><form className="space-y-2" onSubmit={e=>{e.preventDefault();void scan(key)}}><label>Code imprimé<input className="input" value={key} onChange={e=>setKey(e.target.value)} required/></label><button disabled={busy} className="button">{mode==='vente'?'Ajouter au panier':'Contrôler le billet'}</button></form></>}
 <p role="status" className={color}>{msg}</p>{mode==='vente'&&cart.length>0&&<div className="card space-y-3">{cart.map(x=><p key={x.code}>{x.name} · {x.code} · {x.price} <button className="underline" disabled={busy} onClick={()=>{items(cart.filter(i=>i.code!==x.code));request.current=''}}>Retirer</button></p>)}<b>Total : {(cart.reduce((s,i)=>s+Math.round(i.price*100),0)/100).toLocaleString('fr-CA')}</b><button disabled={busy} onClick={pay} className="button">Paiement reçu · Activer les billets</button></div>}</section>
}

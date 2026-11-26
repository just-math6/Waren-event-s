'use client';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase';
import Station,{Manual,Reader,isFootball,type GateEvent,type Entry,type StationData} from './station';
const Camera=dynamic(()=>import('../../admin/(protected)/evenements/[id]/scan/camera'),{ssr:false,loading:()=> <p>Chargement du lecteur…</p>});
export default function LiveGate({event,embedded,onLock}:{event:GateEvent;embedded:boolean;onLock:(v:boolean)=>void}){
 const [data,setData]=useState<StationData|null>(null),[result,setResult]=useState<Entry|null>(null),[fault,setFault]=useState(''),[unavailable,setUnavailable]=useState(false),[busy,setBusy]=useState(false),[offline,setOffline]=useState(false);
 const guard=useRef(false),version=useRef(0),alive=useRef(false);
 const load=useCallback(async()=>{
  if(!navigator.onLine||document.visibilityState==='hidden')return;
  const seq=++version.current;
  try{const r=await createClient().rpc('waren_gate_station',{p_event:event.id});if(!alive.current||seq!==version.current)return;if(r.error)throw r.error;setData(r.data);setUnavailable(false)}
  catch{if(alive.current&&seq===version.current){setData(null);setUnavailable(true)}}
 },[event.id]);
 useEffect(()=>{alive.current=true;const sync=()=>{setOffline(!navigator.onLine);if(navigator.onLine)void load()};sync();const timer=setInterval(load,10000);
  window.addEventListener('online',sync);window.addEventListener('offline',sync);document.addEventListener('visibilitychange',sync);return()=>{alive.current=false;version.current++;clearInterval(timer);window.removeEventListener('online',sync);window.removeEventListener('offline',sync);document.removeEventListener('visibilitychange',sync)}
 },[load]);
 async function scan(raw:string){
  if(guard.current||!navigator.onLine||!raw.trim())return;
  guard.current=true;setBusy(true);onLock(true);setResult(null);setFault('');
  try{const {data:entry,error}=await createClient().rpc('waren_gate_detail',{p_event:event.id,p_key:raw.trim()});if(error||!entry?.outcome)throw new Error();if(!alive.current)return;
   version.current++;setResult(entry);setData(prev=>prev?{...prev,history:[entry,...prev.history.filter(x=>x.id!==entry.id)].slice(0,40)}:prev);
  }catch{if(alive.current)setFault('Contrôle non confirmé. Vérifiez l’historique avant de laisser entrer la personne.')}
  finally{onLock(false);guard.current=false;if(alive.current){setBusy(false);void load()}}
 }
 return <Station event={event} data={data} embedded={embedded} roleLabel={embedded?'Coordination':'Contrôle entrée'} busy={busy} offline={offline} result={result} error={fault||(unavailable?'Compteur et historique indisponibles. Vérifiez la connexion et votre accès.':'')} onHistory={load}
 camera={offline?<Reader football={isFootball(event)}/>:<Camera disabled={busy} onScan={scan} idle={<Reader football={isFootball(event)}/>}/>} manual={<Manual busy={busy||offline} onScan={scan}/>}/>;
}

'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {footballTypes} from '@/lib/football-art';
import {createFootball} from './save';
export default function Create(){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
 return <details className="card print:hidden"><summary className="cursor-pointer font-semibold">Créer mon événement avec ces billets</summary><form className="mt-4 space-y-4" onSubmit={async e=>{
 e.preventDefault(); if(busy)return; const f=new FormData(e.currentTarget);
 const date=new Date('2026-12-20T'+f.get('time'));if(!Number.isFinite(date.getTime())) return;
 setBusy(true);setError('');try{const r=await createFootball(String(f.get('location')),date.toISOString(),footballTypes.map(a=>String(f.get(a.src))));if(r.id)router.push('/admin/evenements/'+r.id+'/papier');else setError('Création impossible. Vérifiez les champs et réessayez.');}catch{setError('Confirmation non reçue. Vérifiez votre liste d’événements avant de recommencer.')}finally{setBusy(false)}
 }}><p>Football Tournament Two · 20 décembre 2026</p><label className="block">Lieu<input required maxLength={300} className="input" name="location"/></label><label className="block">Heure (heure locale de votre appareil)<input required type="time" className="input" name="time"/></label>{footballTypes.map(a=><label className="block" key={a.src}>Quantité {a.name} · {a.price.toLocaleString('fr-FR')} FCFA<input required type="number" min="1" max="2147483647" step="1" className="input" name={a.src}/></label>)}<button disabled={busy} className="button">{busy?'Création…':'Créer l’événement'}</button><p role="status">{error}</p></form></details>
}

'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';
export default function Quantity({event,type,name,price,value}:{event:string;type:string;name:string;price:number;value:number}){
 const [saved,save]=useState(value),[editing,edit]=useState(false),[draft,change]=useState(String(value)),[busy,wait]=useState(false),[msg,note]=useState('');
 const router=useRouter();
 return <div className="border-t border-gray-200 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-medium">{name}</h3><p className="text-sm text-gray-500">{price.toLocaleString('fr-FR')} FCFA · {saved.toLocaleString('fr-FR')} billets prévus</p></div>
 {!editing&&<button type="button" aria-label={'Modifier la quantité '+name} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" onClick={()=>{edit(true);change(String(saved));note('')}}>Modifier</button>}</div>
 {editing&&<form className="mt-3 space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;wait(true);note('');
 try{const n=Number(draft);const res=await createClient().rpc('waren_coord_quantity',{p_event:event,p_type:type,p_count:n});if(res.error){note(res.error.message.includes('couvrir')?'La quantité doit couvrir les billets déjà vendus ou préparés.':'Quantité non enregistrée. Vérifiez votre accès et réessayez.');return}save(n);edit(false);note('Quantité enregistrée.');router.refresh();}
 catch{note('Connexion interrompue. Réessayez.')}finally{wait(false)}}}><label>Nouvelle quantité · {name}<input className="input" type="number" min="1" max="2147483647" step="1" required disabled={busy} value={draft} onChange={e=>change(e.target.value)}/></label><button className="button" disabled={busy||Number(draft)===saved}>{busy?'Enregistrement…':'Enregistrer'}</button><button className="underline text-sm" type="button" disabled={busy} onClick={()=>{edit(false);note('')}}>Annuler</button></form>}
 {msg&&<p role="status" className={'mt-2 text-sm '+(editing?'text-red-600':'text-green-600')}>{msg}</p>}</div>
}

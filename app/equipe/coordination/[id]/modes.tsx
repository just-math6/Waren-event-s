'use client';
import {useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';
import Desk from '../../desk';
type Mode='coordination'|'vente'|'entree';
export default function Modes({id,title,starts,name,children}:{id:string;title:string;starts:string;name:string|null;children:ReactNode}){
 const [mode,select]=useState<Mode>('coordination'),[locked,lock]=useState(false),[registered,setName]=useState(name),[error,setError]=useState(''),[busy,wait]=useState(false);
 const router=useRouter();
 return <><nav aria-label="Mon mode pour cet événement" className="grid grid-cols-3 gap-1 rounded-xl bg-gray-50 p-1">{([['coordination','Coordination'],['vente','Vente'],['entree','Contrôle']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} disabled={locked||busy} onClick={()=>{select(value);setError('');if(value==='coordination')router.refresh()}} className={'rounded-lg px-1 py-3 text-sm font-medium disabled:opacity-60 '+(mode===value?'bg-gray-900 text-white':'text-gray-700')}>{label}</button>)}</nav>
 {locked&&<p className="text-sm text-amber-600">Terminez l’opération ou videz le panier pour changer de mode.</p>}
 {mode==='coordination'?children:!registered?<form className="card space-y-3" onSubmit={async e=>{e.preventDefault();const n=String(new FormData(e.currentTarget).get('name')).trim();wait(true);setError('');try{const r=await createClient().rpc('waren_coord_label',{p_event:id,p_name:n});if(r.error)throw r.error;setName(n)}catch{setError('Impossible d’enregistrer le nom. Réessayez.')}finally{wait(false)}}}><label>Votre nom pour les ventes et les contrôles<input className="input" name="name" minLength={2} maxLength={60} required/></label><button disabled={busy} className="button">Enregistrer mon nom</button>{error&&<p role="alert">{error}</p>}</form>:<Desk key={mode} fixed role={mode} events={[{id,title,starts_at:starts}]} onLock={lock}/>}</>;
}

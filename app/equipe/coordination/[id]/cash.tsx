'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase';
import {fcfa,fmt,type SalesRow} from '@/lib/team-view';
export type CashCount={seller:string;counted:number;expected:number;note:string};
export default function Cash({event,sales,counts}:{event:string;sales:SalesRow[];counts:CashCount[]|null}){
 const [selected,select]=useState(''),[busy,wait]=useState(false),[msg,note]=useState(''); const router=useRouter();
 const rows=Array.from(new Set(sales.map(s=>s.seller))).map(seller=>{const list=sales.filter(r=>r.seller===seller); return {seller,list,expected:list.reduce((a,r)=>a+Number(r.revenue),0),count:counts?.find(c=>c.seller===seller)}});
 const expected=rows.reduce((n,r)=>n+r.expected,0),received=rows.reduce((n,r)=>n+Number(r.count?.counted??0),0),complete=rows.length>0&&rows.every(r=>r.count);
 return <section className="ui-panel"><p className="eyebrow">Espace du coordinateur</p><h2>Clôture de caisse</h2><p className="muted">Après comptage des espèces</p>{!rows.length?<p className="empty">Aucune vente enregistrée.</p>:<>
 <div className="cash-head"><span>Vendeur</span><span>Attendu</span><span>Remis</span><span>Écart</span></div>
 {rows.map(r=><div key={r.seller} className="cash-line"><div className="cash-row"><div><b>{r.seller}</b><small>{r.list.map(x=>fmt(x.sold)+' '+x.name).join(' · ')}</small></div>
 {([['Attendu',r.expected],['Remis',r.count?.counted],['Écart',r.count?r.count.counted-r.expected:null]] as const).map(([label,value])=><div key={label} className={label==='Écart'&&value?'amber':''}><small>{label}</small><b>{value==null?'—':fmt(value)}</b></div>)}</div>
 {r.count?.note&&<p className="muted">{r.count.note}</p>}<button className="text-action" disabled={busy||counts===null} onClick={()=>{select(selected===r.seller?'':r.seller);note('')}}>{selected===r.seller?'Fermer':r.count?'Modifier la remise':'Enregistrer la remise'}</button>
 {selected===r.seller&&<form className="form-stack" onSubmit={async e=>{e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);wait(true);note('');try{const res=await createClient().rpc('waren_count_cash',{p_event:event,p_seller:r.seller,p_amount:Number(f.get('amount')),p_note:String(f.get('note'))});if(res.error)throw res.error;select('');note('Remise enregistrée.');router.refresh()}catch{note('Remise non enregistrée. Indiquez le motif de tout écart et réessayez.')}finally{wait(false)}}}><label>Espèces remises (FCFA)<input className="input" type="number" name="amount" required step="1" min="0" defaultValue={r.count?.counted}/></label><label>Motif en cas d’écart<input className="input" name="note" defaultValue={r.count?.note} maxLength={500}/></label><button className="button" disabled={busy}>Valider la remise</button></form>}</div>)}
 <div className="cash-row cash-total"><strong>Total FCFA</strong><b><small>Attendu</small>{fmt(expected)}</b><b><small>Remis</small>{counts?.length?fmt(received):'—'}</b><b><small>Écart</small>{complete?fmt(received-expected):'—'}</b></div><p className="muted">Écart = remis − attendu.</p>{complete&&received!==expected&&<div className="notice warn"><b>{fcfa(Math.abs(received-expected))} à expliquer</b></div>}</>}
 {counts===null&&<p role="alert">Le registre des remises est indisponible.</p>}<p role="status">{msg}</p></section>
}

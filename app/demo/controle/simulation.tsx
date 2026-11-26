'use client';
import {useState} from 'react';
import Station,{Icon,Manual,Reader,type Entry,type StationData} from '../../equipe/controle/station';
import {footballTitle} from '@/lib/football-art';
const event={id:'demo',title:footballTitle,starts_at:'2026-12-20T12:00:00Z'};
const examples=[
 {code:'P-102',channel:'Papier',type:'VIP',seller:'Aminata'},
 {code:'V-204',channel:'Virtuel',type:'Standard',seller:'Moussa'},
 {code:'P-101',channel:'Papier',type:'VVIP',seller:'Aminata'},
 {code:'INCONNU',channel:'',type:'',seller:''}
];
export default function Demo(){
 const [selected,select]=useState('P-102'),[data,setData]=useState<StationData>({operator:'Salimata',used:9,sold:13,history:[]}),[last,setLast]=useState<Entry|null>(null),[used,mark]=useState<Record<string,string>>({'P-101':'2026-12-20T10:00:00Z'});
 const example=examples.find(x=>x.code===selected)!;
 async function simulate(raw:string){
  const x=examples.find(t=>t.code===raw.trim().toUpperCase()&&t.code!=='INCONNU');
  const when=new Date().toISOString(),first=x?used[x.code]:null;
  const row:Entry={id:crypto.randomUUID(),outcome:x?(first?'utilise':'accepted'):'missing',scanned_at:when,...(x?{at:first||when,type:x.type,channel:x.channel,sold_by:x.seller,checked_by:'Salimata'}:{})};
  if(x&&!first)mark(prev=>({...prev,[x.code]:when}));
  setLast(row);setData(prev=>({...prev,used:prev.used+(row.outcome==='accepted'?1:0),history:[row,...prev.history].slice(0,40)}));
 }
 return <Station demo event={event} data={data} busy={false} roleLabel="Contrôleuse" result={last} manual={<Manual demo busy={false} onScan={simulate}/>}
 camera={<div className="gate-form"><Reader football demo reference={selected} category={example.type}/>
 <label>Billet à présenter<select value={selected} onChange={e=>select(e.target.value)}>{examples.map(x=><option key={x.code} value={x.code}>{x.code==='INCONNU'?'Billet inconnu':x.channel+' '+x.type+' · '+x.code+(x.code==='P-101'?' (déjà utilisé)':'')}</option>)}</select></label>
 <button className="gate-primary" type="button" onClick={()=>void simulate(selected)}><Icon name="scan"/>Simuler le scan</button></div>}/>;
}

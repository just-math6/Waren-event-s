import {fmt,fcfa,inventory,type SalesRow,type StockCategory} from '@/lib/team-view';
import Stock from './stock';
export default function Overview({event,types,sales}:{event:string;types:StockCategory[];sales:SalesRow[]}){
 const rows=inventory(types,sales),sum=(k:'quantity'|'sold'|'paperSold')=>rows.reduce((a,r)=>a+r[k],0),total=sum('sold'),paper=sum('paperSold'),virtual=total-paper;
 const metrics=[
  ['Billets vendus',fmt(total)+' / '+fmt(sum('quantity')),fmt(paper)+' papier · '+fmt(virtual)+(virtual===1?' virtuel':' virtuels')],
  ['Entrées validées',fmt(sales.reduce((a,s)=>a+Number(s.used),0))+' / '+fmt(total),'Premier passage uniquement'],
  ['Espèces attendues',fcfa(sales.reduce((a,s)=>a+Number(s.revenue),0)),'Avant remise en caisse'],
 ];
 return <><dl className="coord-metrics">{metrics.map(([label,value,sub])=><div key={label}><dt>{label}</dt><dd><strong>{value}</strong><span>{sub}</span></dd></div>)}</dl><Stock event={event} types={types} sales={sales}/></>
}

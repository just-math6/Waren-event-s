import {fcfa,fmt,inventory,type SalesRow,type StockCategory} from '@/lib/team-view';
import Quantity from './quantity';
export default function Stock({event,types,sales}:{event:string;types:StockCategory[];sales:SalesRow[]}){
 const rows=inventory(types,sales);
 return <section className="coord-stock" aria-labelledby="stock-label">
  <div className="coord-stock-head"><h2 id="stock-label">Stock par catégorie</h2>
  {rows.length>0&&<details className="coord-edit"><summary><span>Modifier les quantités</span><span>Fermer les quantités</span></summary>
   <div className="coord-edit-panel"><p className="muted">La quantité prévue couvre les billets déjà vendus et le stock papier préparé.</p>{types.map(t=><Quantity key={t.id} event={event} type={t.id} name={t.name} price={t.price} value={t.quantity}/>)}</div>
  </details>}</div>
  {rows.length?rows.map(r=><div key={r.id} className="coord-category"><div className="coord-category-heading"><h3>{r.name}</h3><span>{fcfa(r.price)}</span></div>
   <div aria-hidden="true" className="coord-bar">{([['sold',r.sold],['paper',r.paper_ready],['free',r.available]] as const).map(([key,n])=>n>0?<span key={key} className={key} style={{flexGrow:n}}/>:null)}</div>
   <p>{fmt(r.sold)} {r.sold===1?'vendu':'vendus'} · {fmt(r.paper_ready)} papier {r.paper_ready===1?'prêt':'prêts'} · {fmt(r.available)} {r.available===1?'virtuel disponible':'virtuels disponibles'}</p>
  </div>):<p className="empty">Aucune catégorie de billet.</p>}
 </section>
}

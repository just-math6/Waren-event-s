import {fcfa,fmt,inventory,type SalesRow,type StockCategory} from '@/lib/team-view';
export type {StockCategory} from '@/lib/team-view';
export default function Stock({types,sales}:{types:StockCategory[];sales:SalesRow[]}){
 const rows=inventory(types,sales);
 return <section className="stock-view"><h2>Stock disponible</h2>{rows.length?<><div className="stock-head" aria-hidden="true"><span>Catégorie</span><span>Papier prêt</span><span>Virtuel disponible</span><span>Vendus</span></div>
 {rows.map(r=><div key={r.id} className="stock-row"><div className="stock-name"><strong>{r.name}</strong><small>{fcfa(r.price)}</small></div>{[['Papier prêt',r.paper_ready],['Virtuel disponible',r.available],['Vendus',r.sold]].map(([key,n])=><div className={key==='Virtuel disponible'&&!n?'amber':''} key={key}><small>{key}</small><b>{fmt(Number(n))}</b></div>)}</div>)}
 {rows.filter(r=>!r.available&&r.paper_ready>0).map(r=><div className="notice warn" key={r.id}><b>{r.name} : la réserve virtuelle est épuisée.</b><p>Il reste {fmt(r.paper_ready)} {r.paper_ready===1?"billet papier prêt":"billets papier prêts"}. Un QR déjà imprimé garde sa place tant qu’il reste actif.</p></div>)}</>:<p className="muted">Aucune catégorie de billet.</p>}</section>
}

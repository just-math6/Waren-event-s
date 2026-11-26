export type StockCategory={id:string;name:string;price:number;quantity:number;paper_ready:number;paper_prepared:number};
export type SalesRow={seller:string;type_id:string;name:string;sold:number;used:number;revenue:number};
export const fmt=(value:number)=>Number(value).toLocaleString('fr-FR');
export const fcfa=(value:number)=>fmt(value)+' FCFA';
export function inventory(types:StockCategory[],sales:SalesRow[]){
 return types.map(t=>{const sold=sales.filter(s=>s.type_id===t.id).reduce((a,s)=>a+Number(s.sold),0);
 return {...t,sold,paperSold:Math.max(0,t.paper_prepared-t.paper_ready),available:Math.max(0,t.quantity-t.paper_ready-sold)}});
}
export function gateMessage(outcome:string){
 switch(outcome){
  case 'accepted': return {tone:'ok',title:'Entrée autorisée'};
  case 'utilise':return {tone:'warn',title:'Déjà utilisé'};
  case 'pret':return {tone:'bad',title:'Billet non activé'};
  case 'annule':return {tone:'bad',title:'Billet annulé'};
  case 'bloque':return {tone:'bad',title:'Billet bloqué'};
  default:return {tone:'bad',title:'Billet introuvable'};
 }
}

import {normalizePhone,validPhone} from './sale-input';
import {validTicketToken} from './public-ticket';

// Use the buyer-facing domain, even when the seller signed into a deployment alias.
export function publicTicketUrl(token:string, origin=process.env.NEXT_PUBLIC_TICKET_ORIGIN || 'https://waren-events.vercel.app') {
  if (!validTicketToken(token)) throw new Error('Référence de billet invalide.');
  const base = new URL(origin);
  if (base.protocol!=='https:' || base.username || base.password) throw new Error('Domaine de billetterie invalide.');
  return new URL('/billet/'+token,base.origin).href;
}
export type Receipt = {token:string;phone:string;buyer:string;category:string;eventTitle:string};
export function deliveryLinks(receipt:Receipt) {
  const ticket=publicTicketUrl(receipt.token);
  const digits=normalizePhone(receipt.phone);
  const first=receipt.buyer.trim().split(/\s+/u)[0];
  const message='Bonjour '+first+', voici votre billet '+receipt.category+' pour '+receipt.eventTitle+' :\n'+ticket+'\nPrésentez ce billet à l’entrée.';
  return {ticket,recipient:digits,whatsapp:validPhone(receipt.phone)?'https://wa.me/'+digits+'?text='+encodeURIComponent(message):null};
}
export function availableCategory<T extends {id:string}>(types:T[],selected:string,available:(type:T)=>number){
  return types.find(t=>t.id===selected&&available(t)>0)??types.find(t=>available(t)>0);
}

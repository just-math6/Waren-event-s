'use client';
import {useState} from 'react';
import {deliveryLinks,type Receipt} from '@/lib/ticket-delivery';

// Reserve the secondary tab during the seller's tap. No recipient or token is
// handed to WhatsApp until the server has confirmed the sale.
export function prepareWhatsApp(){
  let tab:Window|null=null;
  try{
    tab=window.open('about:blank','_blank');
    if(tab){
      tab.opener=null;
      tab.document.title='Préparation du billet';
      tab.document.documentElement.lang='fr';
      const meta=tab.document.createElement('meta');meta.name='referrer';meta.content='no-referrer';tab.document.head.append(meta);
      tab.document.body.textContent='Confirmation du paiement en cours… WhatsApp s’ouvrira si la vente est enregistrée.';
    }
  }catch{try{tab?.close()}catch{}tab=null}
  return {
    cancel(){try{tab?.close()}catch{}},
    open(receipt:Receipt){
      try{const {whatsapp}=deliveryLinks(receipt);if(tab&&!tab.closed&&whatsapp){tab.location.replace(whatsapp);return true}}catch{/* Receipt retains a normal click-to-chat link. */}
      try{tab?.close()}catch{}return false;
    }
  };
}
export default function TicketDelivery({receipt}:{receipt:Receipt}){
  const [copied,setCopied]=useState('');
  let links:ReturnType<typeof deliveryLinks>;
  try{links=deliveryLinks(receipt)}catch{return <p role="alert">Billet enregistré, mais son lien est indisponible. Ne refaites pas la vente ; contactez le coordinateur.</p>}
  return <div className="delivery grid gap-3">
    <label className="block text-sm font-medium">Lien du billet<input className="input mt-1" type="url" readOnly value={links.ticket} onFocus={e=>e.currentTarget.select()}/></label>
    {links.whatsapp?<><a className="button block text-center" href={links.whatsapp} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp</a><p className="muted text-sm">Message préparé pour +{links.recipient}. Dans WhatsApp, appuyez sur « Envoyer ».</p></>:<p role="status">Numéro WhatsApp incomplet. Copiez le lien et partagez-le avec le bon contact.</p>}
    <button type="button" className="secondary min-h-11 rounded-lg border px-3" onClick={async()=>{try{await navigator.clipboard.writeText(links.ticket);setCopied('Lien copié.')}catch{setCopied('Sélectionnez le lien ci-dessus pour le copier.')}}}>Copier le lien</button>
    {copied&&<p className="muted text-sm" role="status">{copied}</p>}
  </div>;
}

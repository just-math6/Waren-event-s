'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { validPhone, normalizePhone, phoneHint } from '@/lib/sale-input';
import {availableCategory,type Receipt} from '@/lib/ticket-delivery';
import TicketDelivery,{prepareWhatsApp} from '@/components/ticket-delivery';
import {fcfa} from '@/lib/team-view';
import { checkPhone, confirmSale } from './actions';
export type TicketType = { id: string; name: string; price: number; remaining: number };
export default function SaleForm({ eventId, eventTitle, types, sellers, initialToken }: { eventId: string; eventTitle:string; types: TicketType[]; sellers: string[]; initialToken: string }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState(availableCategory(types,'',t=>t.remaining)?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seller, setSeller] = useState(sellers[0]);
  const [token, setToken] = useState(initialToken);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [warning, setWarning] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Receipt | null>(null);
  const [uncertain,setUncertain]=useState(false);
  const selected=types.find(t=>t.id===typeId);
  useEffect(() => {
    if (!validPhone(phone) || result) return;
    let active = true;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const response = await checkPhone(eventId, phone);
        if (active) setWarning(response.exists ? 'Un billet existe déjà pour ce numéro' : response.error || '');
      } catch { if (active) setWarning('Vérification des doublons indisponible.'); }
      finally { if (active) setChecking(false); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [eventId, phone, result]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || result || !selected || (!uncertain && selected.remaining<=0)) return;
    if (!validPhone(phone)) {setError(phoneHint);return}
    const popup=prepareWhatsApp();
    busy.current = true; setPending(true); setError('');
    try {
      const response = await confirmSale({ eventId, typeId, buyerName: name, phone, seller, token });
      if (response.error || !response.token) { popup.cancel();setUncertain(false);setError(response.error || 'Vente non confirmée.'); router.refresh(); return; }
      const paid={token:response.token,phone,buyer:name.trim(),category:selected.name,eventTitle};
      setResult(paid);setUncertain(false);popup.open(paid);
      router.refresh();
    } catch {popup.cancel();setUncertain(true);setError('Réponse interrompue. Réessayez avec ce formulaire : la même vente ne sera pas enregistrée deux fois.'); }
    finally { busy.current = false; setPending(false); }
  }
  if (result) return <section className="card space-y-5"><h2 className="text-lg font-semibold text-green-700">Vente confirmée</h2><p>{result.buyer} · {result.category}</p><TicketDelivery receipt={result}/><button className="button" onClick={() => { setToken(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')); setResult(null); setName(''); setPhone(''); setWarning(''); setChecking(false); setTypeId(availableCategory(types,typeId,t=>t.remaining)?.id??''); setError(''); }}>Nouvelle vente</button></section>;
  return <form onSubmit={submit} className="space-y-5" aria-busy={pending}><fieldset disabled={pending} className="space-y-5"><legend className="mb-4 text-lg font-semibold">Vendre un billet</legend><fieldset disabled={uncertain}><legend className="mb-3 text-sm font-medium">Type de billet</legend><div className="flex gap-3 overflow-x-auto pb-2">{types.map(type => <label key={type.id} className={`relative min-w-36 flex-1 has-disabled:cursor-not-allowed cursor-pointer rounded-xl border-[3px] bg-gray-50 p-4 ${typeId === type.id ? 'border-green-600' : 'border-transparent'}`}><input className="mb-2 accent-green-600" type="radio" disabled={type.remaining<=0} name="ticket-type" value={type.id} checked={typeId === type.id} onChange={() => setTypeId(type.id)} required /><span className="block font-semibold">{type.name}</span><span className="mt-2 block">{fcfa(type.price)}</span><span className={`mt-2 block text-sm ${type.remaining ? 'text-gray-500' : 'text-amber-700'}`}>{type.remaining} restant{type.remaining > 1 ? 's' : ''}</span></label>)}</div></fieldset><div><label className="mb-2 block text-sm font-medium" htmlFor="buyer-name">Nom de l’acheteur</label><input disabled={uncertain} className="input" id="buyer-name" value={name} onChange={event => setName(event.target.value)} maxLength={200} autoComplete="name" required /></div><div><label className="mb-2 block text-sm font-medium" htmlFor="buyer-phone">Numéro de téléphone</label><input disabled={uncertain} className="input" id="buyer-phone" type="tel" value={phone} onChange={event => { setPhone(event.target.value); setWarning(''); setChecking(false); }} autoComplete="tel" maxLength={30} aria-describedby="phone-help phone-warning" required /><p id="phone-help" className="mt-2 text-sm text-gray-500">{phoneHint}{validPhone(phone)&&' Destinataire : +'+normalizePhone(phone)+'.'}</p><p id="phone-warning" role="status" className="mt-2 text-sm text-amber-700">{warning || (checking ? 'Vérification du numéro…' : '')}</p></div><div><label className="mb-2 block text-sm font-medium" htmlFor="seller">Vendu par</label><select disabled={uncertain} className="input" id="seller" value={seller} onChange={event => setSeller(event.target.value)} required>{sellers.map(value => <option key={value}>{value}</option>)}</select></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="button" type="submit" disabled={!selected||(!uncertain&&selected.remaining<=0)}>{uncertain?'Reprendre la confirmation':pending ? 'Enregistrement…' : selected?'J’ai reçu '+fcfa(selected.price)+' · Ouvrir WhatsApp':'Confirmer le paiement complet'}</button></fieldset></form>;
}

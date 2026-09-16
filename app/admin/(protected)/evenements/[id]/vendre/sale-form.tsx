'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { validPhone, whatsappLink } from '@/lib/sale-input';
import { checkPhone, confirmSale } from './actions';
export type TicketType = { id: string; name: string; price: number; remaining: number };
export default function SaleForm({ eventId, types, sellers, initialToken }: { eventId: string; types: TicketType[]; sellers: string[]; initialToken: string }) {
  const router = useRouter();
  const [typeId, setTypeId] = useState(types[0]?.id || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [seller, setSeller] = useState(sellers[0]);
  const [token, setToken] = useState(initialToken);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [warning, setWarning] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ link: string; whatsapp: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
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
    if (busy.current || result) return;
    busy.current = true; setPending(true); setError('');
    try {
      const response = await confirmSale({ eventId, typeId, buyerName: name, phone, seller, token });
      if (response.error || !response.token) { setError(response.error || 'Vente non confirmée.'); router.refresh(); return; }
      const url = new URL(`/billet/${response.token}`, window.location.origin);
      if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.protocol = 'https:';
      const link = url.toString();
      setResult({ link, whatsapp: whatsappLink(phone, name, link) });
      router.refresh();
    } catch { setError('Réponse interrompue. Réessayez avec ce formulaire : la même vente ne sera pas enregistrée deux fois.'); }
    finally { busy.current = false; setPending(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(result!.link); setCopyStatus('Lien copié.'); }
    catch { setCopyStatus('Copie impossible. Sélectionnez et copiez le lien ci-dessus.'); }
  }
  if (result) return <section className="card space-y-5"><h2 className="text-lg font-semibold text-green-600">Vente confirmée</h2><label htmlFor="ticket-link" className="block text-sm font-medium">Lien du billet</label><input id="ticket-link" className="input" readOnly value={result.link} onFocus={event => event.target.select()} /><button className="button" onClick={copy}>Copier le lien</button>{copyStatus && <p role="status" className="text-sm text-gray-500">{copyStatus}</p>}<a className="button block text-center" href={result.whatsapp} target="_blank" rel="noopener noreferrer">Envoyer sur WhatsApp</a><button className="button" onClick={() => { setToken(Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('')); setResult(null); setName(''); setPhone(''); setWarning(''); setChecking(false); setCopyStatus(''); setError(''); }}>Nouvelle vente</button></section>;
  return <form onSubmit={submit} className="space-y-5" aria-busy={pending}><fieldset disabled={pending} className="space-y-5"><legend className="mb-4 text-lg font-semibold">Vendre un billet</legend><fieldset><legend className="mb-3 text-sm font-medium">Type de billet</legend><div className="flex gap-3 overflow-x-auto pb-2">{types.map(type => <label key={type.id} className={`relative min-w-36 flex-1 cursor-pointer rounded-xl border-[3px] bg-gray-50 p-4 ${typeId === type.id ? 'border-green-600' : 'border-transparent'}`}><input className="mb-2 accent-green-600" type="radio" name="ticket-type" value={type.id} checked={typeId === type.id} onChange={() => setTypeId(type.id)} required /><span className="block font-semibold">{type.name}</span><span className="mt-2 block">{new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(type.price)}</span><span className={`mt-2 block text-sm ${type.remaining ? 'text-gray-500' : 'text-amber-600'}`}>{type.remaining} restant{type.remaining > 1 ? 's' : ''}</span></label>)}</div></fieldset><div><label className="mb-2 block text-sm font-medium" htmlFor="buyer-name">Nom de l’acheteur</label><input className="input" id="buyer-name" value={name} onChange={event => setName(event.target.value)} maxLength={200} autoComplete="name" required /></div><div><label className="mb-2 block text-sm font-medium" htmlFor="buyer-phone">Numéro de téléphone</label><input className="input" id="buyer-phone" type="tel" value={phone} onChange={event => { setPhone(event.target.value); setWarning(''); setChecking(false); }} autoComplete="tel" maxLength={30} aria-describedby="phone-help phone-warning" required /><p id="phone-help" className="mt-2 text-sm text-gray-500">Avec indicatif pays, par exemple +1 819 555 0123.</p><p id="phone-warning" role="status" className="mt-2 text-sm text-amber-600">{warning || (checking ? 'Vérification du numéro…' : '')}</p></div><div><label className="mb-2 block text-sm font-medium" htmlFor="seller">Vendu par</label><select className="input" id="seller" value={seller} onChange={event => setSeller(event.target.value)} required>{sellers.map(value => <option key={value}>{value}</option>)}</select></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="button" type="submit">{pending ? 'Enregistrement…' : 'Confirmer la vente'}</button></fieldset></form>;
}

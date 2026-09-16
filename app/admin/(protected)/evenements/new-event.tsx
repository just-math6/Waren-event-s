'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent } from './actions';
import { validateEvent } from '@/lib/event-input';
export default function NewEvent() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([0]);
  const nextId = useRef(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    const data = new FormData(event.currentTarget);
    const localDate = new Date(String(data.get('date')));
    if (!Number.isFinite(localDate.getTime())) { setError('Indiquez une date et une heure valides.'); return; }
    const input = { title: String(data.get('title')), location: String(data.get('location')), startsAt: localDate.toISOString(), ticketTypes: rows.map(id => ({ name: String(data.get(`name-${id}`)), price: String(data.get(`price-${id}`)), quantity: String(data.get(`quantity-${id}`)) })) };
    const validation = validateEvent(input);
    if (validation) { setError(validation); return; }
    setPending(true);
    try {
      const result = await createEvent(input);
      if (result.error) { setError(result.error); return; }
      setOpen(false); setRows([nextId.current++]); setSuccess(true); router.refresh();
    } catch { setError('La connexion a été interrompue. Actualisez la liste avant de réessayer pour éviter un doublon.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-4">
    <button type="button" className="button" aria-expanded={open} aria-controls="new-event-form" disabled={pending} onClick={() => { setOpen(!open); setSuccess(false); setError(''); }}>{open ? 'Fermer le formulaire' : 'Nouvel événement'}</button>
    {success && <p role="status" className="text-sm text-green-600">Événement créé avec ses types de billets.</p>}
    {open && <form id="new-event-form" onSubmit={submit} className="card space-y-5" aria-busy={pending}>
      <h2 className="text-lg font-semibold">Nouvel événement</h2>
      <fieldset disabled={pending} className="space-y-5">
        <div><label className="mb-2 block text-sm font-medium" htmlFor="event-title">Titre</label><input id="event-title" className="input" name="title" required maxLength={200} /></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="event-date">Date et heure</label><input id="event-date" className="input" name="date" type="datetime-local" required /><p className="mt-2 text-sm text-gray-500">Heure locale de votre appareil.</p></div>
        <div><label className="mb-2 block text-sm font-medium" htmlFor="event-location">Lieu</label><input id="event-location" className="input" name="location" required maxLength={300} /></div>
        <h3 className="font-semibold">Types de billets</h3>
        {rows.map((id, index) => <fieldset key={id} className="space-y-4 rounded-xl border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium">Type {index + 1}</legend>
          <div><label className="mb-2 block text-sm" htmlFor={`name-${id}`}>Nom</label><input className="input" id={`name-${id}`} name={`name-${id}`} required maxLength={100} placeholder="Ex. Standard, VIP" /></div>
          <div><label className="mb-2 block text-sm" htmlFor={`price-${id}`}>Prix</label><input className="input" id={`price-${id}`} name={`price-${id}`} inputMode="decimal" required pattern="[0-9]{1,8}([.,][0-9]{1,2})?" placeholder="0,00" /></div>
          <div><label className="mb-2 block text-sm" htmlFor={`quantity-${id}`}>Quantité totale</label><input className="input" id={`quantity-${id}`} name={`quantity-${id}`} type="number" min="1" max="2147483647" step="1" required /></div>
          {rows.length > 1 && <button className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-red-600" type="button" onClick={() => setRows(rows.filter(row => row !== id))}>Supprimer ce type</button>}
        </fieldset>)}
        <button className="button" type="button" disabled={rows.length >= 50} onClick={() => setRows([...rows, nextId.current++])}>Ajouter un type de billet</button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="button" type="submit">{pending ? 'Enregistrement…' : 'Créer l’événement'}</button>
      </fieldset>
    </form>}
  </div>;
}

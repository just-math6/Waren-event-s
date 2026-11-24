'use client';
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEvent } from './actions';

export default function DeleteEvent({ id, title }: { id: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const heading = useId();
  const description = useId();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function confirm() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await deleteEvent(id);
      if (result.error) setError(result.error);
      else { dialog.current?.close(); router.refresh(); }
    } catch {
      setError('Confirmation non reçue. Actualisez la liste pour vérifier si l’événement a été supprimé.');
    } finally { lock.current = false; setBusy(false); }
  }
  return <>
    <button type="button" className="w-full rounded-lg border border-red-200 p-3 text-sm text-red-600" onClick={() => {
      setError(''); dialog.current?.showModal(); cancel.current?.focus();
    }}>Supprimer l’événement</button>
    <dialog ref={dialog} aria-labelledby={heading} aria-describedby={description} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-5 backdrop:bg-black/40" onCancel={e => { if (lock.current) e.preventDefault(); }}>
      <h2 id={heading} className="break-words text-xl font-semibold">Supprimer « {title} » ?</h2>
      <div id={description} className="my-4 space-y-2 text-sm"><p>Cette action est définitive. Tous les billets, lots papier, ventes et enregistrements de présence de cet événement seront supprimés.</p><p>Pour garder une copie des ventes, exportez le CSV depuis le bilan avant de continuer.</p></div>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      <button ref={cancel} type="button" className="button" disabled={busy} onClick={() => dialog.current?.close()}>Annuler</button>
      <button type="button" className="mt-2 w-full rounded-lg bg-red-700 p-3 text-sm font-medium text-white disabled:opacity-50" disabled={busy} onClick={confirm}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</button>
    </dialog>
  </>;
}

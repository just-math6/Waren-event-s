'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshStock() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button type="button" className="rounded-lg px-2 py-2 text-sm underline" aria-label="Actualiser le stock des billets" disabled={pending} onClick={() => start(() => router.refresh())}>
    {pending ? 'Actualisation…' : 'Actualiser'}
  </button>;
}

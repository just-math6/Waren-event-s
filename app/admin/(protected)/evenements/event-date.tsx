'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
export default function EventDate({ value }: { value: string }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <time dateTime={value}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', ...(mounted ? {} : { timeZone: 'UTC' }) }).format(new Date(value))}{!mounted && ' UTC'}</time>;
}

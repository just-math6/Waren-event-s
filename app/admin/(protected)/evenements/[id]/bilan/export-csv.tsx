'use client';
import { useState } from 'react';

export default function ExportCsv({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/admin/evenements/${eventId}/bilan/export`, { cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/csv')) throw new Error('Export failed');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `billets-${eventId}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Export impossible. Vérifiez votre connexion et votre session, puis réessayez.'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><button className="button" disabled={busy} onClick={() => void download()}>{busy ? 'Préparation du CSV…' : 'Exporter en CSV'}</button>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}</div>;
}

'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function Camera({ onScan, disabled }: { onScan: (token: string) => Promise<void>; disabled: boolean }) {
  const id = useId().replace(/:/g, '');
  const callback = useRef(onScan);
  const blocked = useRef(disabled);
  useEffect(() => { callback.current = onScan; blocked.current = disabled; }, [onScan, disabled]);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let busy = false;
    let last = '';
    let lastAt = 0;
    const scanner = new Html5Qrcode(id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
    const started = scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, token => {
      if (disposed || busy || blocked.current || (token === last && Date.now() - lastAt < 4000)) return;
      busy = true; last = token; lastAt = Date.now();
      void callback.current(token).finally(() => { busy = false; });
    }, () => {});
    void started.catch(() => { if (!disposed) { setError('Caméra inaccessible. Autorisez la caméra dans votre navigateur, ou utilisez la recherche manuelle.'); setActive(false); } });
    return () => {
      disposed = true;
      void started.then(() => scanner.stop()).then(() => scanner.clear()).catch(() => {});
    };
  }, [active, id]);
  return <div className="card space-y-3"><div id={id} className="min-h-64 overflow-hidden rounded-lg" />{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button type="button" className="button" disabled={disabled && !active} onClick={() => { setError(''); setActive(!active); }}>{active ? 'Arrêter la caméra' : 'Démarrer la caméra'}</button></div>;
}

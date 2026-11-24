'use client';
export default function Print(){return <button className="button print:hidden" onClick={()=>window.print()}>Imprimer les billets disponibles</button>}

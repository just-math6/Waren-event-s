'use client';
import {useState} from 'react';
export default function Print({label='Imprimer les billets disponibles'}:{label?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 return <div className="print:hidden"><button className="button" disabled={busy} onClick={async()=>{
 setBusy(true);setError(false);try { await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.football-sheet img,.paper-grid img')).map(i=>i.decode()));window.print();} catch {setError(true)}finally {setBusy(false)}
 }}>{busy?'Préparation…':label}</button>{error&&<p role="alert">Image indisponible. Actualisez avant d’imprimer.</p>}</div>;
}

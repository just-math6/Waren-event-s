'use client';
import {useState} from 'react';
export default function Print({count,label='Ouvrir l’impression / PDF'}:{count?:number;label?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 return <div className="card space-y-2 print:hidden">{count!==undefined&&<><h2 className="font-semibold">Fichier pour l’imprimeur</h2><p className="text-sm text-gray-600">{count} billet(s) disponible(s) dans cet aperçu. Dans la fenêtre d’impression, choisis « Enregistrer au format PDF », puis remets le fichier à l’imprimeur.</p></>}<button className="button" disabled={busy} onClick={async()=>{
 setBusy(true);setError(false);try { await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.football-sheet img,.paper-grid img')).map(i=>i.decode()));window.print();} catch {setError(true)}finally {setBusy(false)}
 }}>{busy?'Préparation…':label}</button>{error&&<p role="alert" className="text-sm text-red-600">Image indisponible. Actualisez avant d’imprimer.</p>}</div>;
}

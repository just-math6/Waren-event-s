'use client';
import {useState,type FormEvent} from 'react';
import {teamAccount} from './team-actions';
export type Member={id:string;name:string;role:string;managed:boolean};
export default function Team({event,members}:{event:string;members:Member[]}){
 const [busy,wait]=useState(false),[result,note]=useState<{ok:boolean;message:string}|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;const form=e.currentTarget;const f=new FormData(form);
  if(f.get('action')==='retirer'&&!window.confirm('Retirer à cette personne son accès à cet événement ?'))return;
  wait(true);note(null);
  try{const r=await teamAccount(event,f);note(r);if(r.ok)form.reset()}catch{note({ok:false,message:'Connexion interrompue. Réessayez.'})}finally{wait(false)}
 }
 return <section className="card space-y-4"><h2 className="font-semibold">Mon équipe</h2>
 <p className="text-sm text-gray-500">Créez le compte, puis communiquez le nom et le mot de passe à la personne. Aucun courriel de confirmation.</p>
 {members.map(m=><div key={m.id} className="space-y-2 border-t border-gray-200 py-3"><p className="font-medium">{m.name}</p><p className="text-sm text-gray-500">{m.role==='inactif'?'Accès retiré':m.role==='vente'?'Vendeur':'Contrôleur'}</p>
 <details><summary className="text-sm underline">Gérer cet accès</summary><div className="space-y-3 pt-3">
 {m.role==='inactif'?<form onSubmit={submit}><input type="hidden" name="user" value={m.id}/><label>Réactiver comme<select name="action" className="input"><option value="vente">Vendeur</option><option value="entree">Contrôleur</option></select></label><button disabled={busy} className="button">Réactiver</button></form>:<><form onSubmit={submit}><input type="hidden" name="user" value={m.id}/><input type="hidden" name="action" value={m.role==='vente'?'entree':'vente'}/><button disabled={busy} className="text-sm underline">{m.role==='vente'?'Passer au contrôle':'Passer à la vente'}</button></form>
 {m.managed&&<form onSubmit={submit} className="space-y-2"><input type="hidden" name="user" value={m.id}/><input type="hidden" name="action" value="password"/><label>Nouveau mot de passe<input className="input" type="password" name="password" autoComplete="new-password" minLength={10} required/></label><button disabled={busy} className="button">Remplacer le mot de passe</button></form>}
 <form onSubmit={submit}><input type="hidden" name="action" value="retirer"/><input type="hidden" name="user" value={m.id}/><button disabled={busy} className="text-sm text-red-600 underline">Retirer l’accès</button></form></>}</div></details></div>)}
 <form className="space-y-3 border-t border-gray-200 pt-4" onSubmit={submit}><h3 className="font-medium">Ajouter un membre</h3><input type="hidden" name="action" value="create"/>
 <label className="block">Nom de connexion<input className="input" name="name" autoComplete="off" placeholder="Ex. Awa Diop" minLength={2} maxLength={60} required/></label>
 <label className="block">Rôle<select name="role" className="input"><option value="vente">Vendeur</option><option value="entree">Contrôleur</option></select></label>
 <label className="block">Mot de passe<input className="input" type="password" autoComplete="new-password" name="password" minLength={10} required/><span className="text-sm text-gray-500">10 caractères minimum.</span></label><button className="button" disabled={busy}>{busy?'Enregistrement…':'Valider et créer le compte'}</button></form>
 {result&&<p role="status" className={result.ok?'text-green-600':'text-red-600'}>{result.message}</p>}</section>
}

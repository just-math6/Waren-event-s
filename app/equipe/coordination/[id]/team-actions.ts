'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
export async function teamAccount(event:string,form:FormData){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return {ok:false,message:'Reconnectez-vous.'};
 const action=String(form.get('action'));
 if(action==='create'||action==='password'){
  try{
   const {data,error}=await client.functions.invoke('team-account',{body:{action,event,name:form.get('name'),password:form.get('password'),role:form.get('role'),user:form.get('user')}});
   if(error){const detail=await error.context?.json?.().catch(()=>null);return {ok:false,message:detail?.message||'Compte non enregistré. Réessayez.'}}
   revalidatePath('/equipe/coordination/'+event);return {ok:true,message:String(data.message)};
  }catch{return {ok:false,message:'Service indisponible. Réessayez.'}}
 }
 if(!['retirer','vente','entree','terrain'].includes(action))return {ok:false,message:'Action inconnue.'};
 const {error}=await client.rpc('waren_manage_member',{p_event:event,p_user:form.get('user'),p_action:action});
 if(error)return {ok:false,message:'Modification refusée.'};
 revalidatePath('/equipe/coordination/'+event);return {ok:true,message:action==='retirer'?'Accès retiré.':'Rôle enregistré.'};
}

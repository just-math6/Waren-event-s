'use server';
import {requireAdmin} from '@/lib/auth';
import {footballTitle,footballTypes} from '@/lib/football-art';
import {validateEvent} from '@/lib/event-input';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
export async function createFootball(location:string,startsAt:string,counts:string[]):Promise<{id?:string}>{
 await requireAdmin();
 const ticketTypes=footballTypes.map((a,i)=>({name:a.name,price:String(a.price),quantity:counts?.[i]}));
 if(validateEvent({title:footballTitle,location,startsAt,ticketTypes}))return {};
 const db=await createClient();const {data,error}=await db.rpc('create_football_event',{p_location:location,p_starts_at:startsAt,p_ticket_types:ticketTypes.map(t=>({name:t.name,price:t.price,quantity_total:Number(t.quantity)}))});
 if(error)return {};revalidatePath('/admin/evenements');return {id:data};
}

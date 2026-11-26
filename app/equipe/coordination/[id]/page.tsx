import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isUuid} from '@/lib/sale-input';
import {type SalesRow,type StockCategory} from '@/lib/team-view';
import Modes from './modes';import Overview from './overview';import Cash from './cash';import Team,{type Member} from './team';
type Dashboard={my_name:string|null;title:string;location:string;starts_at:string;types:StockCategory[];sales:SalesRow[];staff:Member[]};
export default async function Coordination({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!isUuid(id))notFound();const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/equipe');
 const [dash,cash]=await Promise.all([db.rpc('waren_coord_dashboard',{p_event:id}),db.rpc('waren_cash_counts',{p_event:id})]);
 if(dash.error?.code==='42501'||(!dash.data&&!dash.error))notFound();if(dash.error)return <p role="alert">Impossible de charger cet événement. Réessayez.</p>;
 const d=dash.data as Dashboard;
 return <Modes id={id} title={d.title} starts={d.starts_at} name={d.my_name}
  overview={<Overview event={id} types={d.types} sales={d.sales}/>} team={<Team event={id} members={d.staff}/>}
  cash={<Cash event={id} sales={d.sales} counts={cash.error?null:cash.data}/>}/>;
}

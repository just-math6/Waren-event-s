import {describe,it,expect,vi} from 'vitest';
import {teamAccountHandler} from '../supabase/functions/team-account/handler';
const event='00000000-0000-4000-8000-000000000010',actor='00000000-0000-4000-8000-000000000020',user='00000000-0000-4000-8000-000000000030';
function invoke(responses:Response[],body:object,login=true){
 const network=vi.fn<typeof fetch>().mockImplementation(async ()=>{const r=responses.shift();if(!r)throw Error('unexpected request');return r});
 const handler=teamAccountHandler(k=>({SUPABASE_URL:'https://app.example.test',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'unit-test-only'}[k]),network);
 const result=handler(new Request('https://app.example.test/functions/v1/team-account',{method:'POST',headers:login?{Authorization:'Bearer user-session'}:{},body:JSON.stringify(body)}));
 return {network,result};
}
const create={event,action:'create',name:'Awa Pahima',password:'test-password-only',role:'vente'};
const res=(data:object={},status=200)=>Response.json(data,{status});
describe('coordinator provisioning',()=>{
 it('uses the caller for both membership checks and creates only the generated staff identity',async()=>{
  const {network,result}=invoke([res({id:actor}),res(),res({id:user}),res()],create);
  expect((await result).status).toBe(200);
  expect(network.mock.calls.map(([u])=>new URL(String(u)).pathname)).toEqual(['/auth/v1/user','/rest/v1/rpc/waren_staff_preflight','/auth/v1/admin/users','/rest/v1/rpc/waren_activate_named']);
  const payload=JSON.parse(String(network.mock.calls[2][1]?.body));expect(payload.email).toMatch(/^[a-f0-9-]{36}@staff\.waren\.invalid$/);
  expect(payload.app_metadata.waren_staff_seed).toEqual({name:create.name,event,creator:actor,role:'vente'});
  expect(network.mock.calls[3][1]?.headers).toMatchObject({Authorization:'Bearer user-session'});
 });
 it('rejects unauthenticated calls and refuses to provision after a denied event check',async()=>{
  const anon=invoke([],create,false);expect((await anon.result).status).toBe(401);expect(anon.network).not.toHaveBeenCalled();
  const denied=invoke([res({id:actor}),res({code:'42501'},403)],create);expect((await denied.result).status).toBe(403);expect(denied.network.mock.calls).toHaveLength(2);
 });
 it('does not reset an account without its original event ownership marker',async()=>{
  const deny=invoke([res({id:actor}),res(),res({app_metadata:{}})],{...create,user,action:'password'});
  expect((await deny.result).status).toBe(403);expect(deny.network.mock.calls.some(([,o])=>o?.method==='PUT')).toBe(false);
 });
});

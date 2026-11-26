// Only this server-side function can provision password-only staff identities.
const json = (status: number, message: string) => Response.json({message}, {status, headers:{'Cache-Control':'no-store'}});
const uuid = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
export function teamAccountHandler(env:(key:string)=>string|undefined,request:typeof fetch=fetch){
 return async function handle(req:Request){
 if(req.method!=='POST')return json(405,'Méthode refusée.');
 const base=env('SUPABASE_URL')!, pub=env('SUPABASE_ANON_KEY')!, secret=env('SUPABASE_SERVICE_ROLE_KEY')!;
 const authorization=req.headers.get('Authorization')||'';
 if(!authorization.startsWith('Bearer '))return json(401,'Connexion requise.');
 try{
  const userHeaders={apikey:pub,Authorization:authorization,'Content-Type':'application/json'};
  const who=await request(base+'/auth/v1/user',{headers:userHeaders});
  if(!who.ok)return json(401,'Connexion requise.');
  const {id:actor}=await who.json();
  const {event,action,name,role,password,user}=await req.json();
  if(!uuid.test(event)||typeof password!=='string'||password.length<10||new TextEncoder().encode(password).length>72)return json(400,'Mot de passe : au moins 10 caractères et au plus 72 octets.');
  const create=action==='create';
  if(create?(typeof name!=='string'||name.trim().length<2||name.length>60||!['vente','entree','terrain'].includes(role)):(action!=='password'||!uuid.test(user)))return json(400,'Nom, rôle ou membre invalide.');
  const guard=create?'waren_staff_preflight':'waren_manage_member';
  const args=create?{p_event:event,p_name:name,p_role:role}:{p_event:event,p_user:user,p_action:'password'};
  const allowed=await request(base+'/rest/v1/rpc/'+guard,{method:'POST',headers:userHeaders,body:JSON.stringify(args)});
  if(!allowed.ok){
   const reason=await allowed.json();
   return reason.code==='23505'?json(409,'Ce nom est déjà utilisé. Ajoutez une initiale ou un numéro.'):json(403,'Accès refusé ou membre indisponible.');
  }
  const headers={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  let endpoint=base+'/auth/v1/admin/users';
  if(!create){
   endpoint+='/'+user;
   const lookup=await request(endpoint,{headers}); if(!lookup.ok)return json(404,'Membre introuvable.');
   const u=await lookup.json();if(u.app_metadata?.waren_staff_seed?.event!==event)return json(403,'Accès refusé.');
  }
  const body=create?{email:crypto.randomUUID()+'@staff.waren.invalid',email_confirm:true,password,app_metadata:{waren_staff_seed:{event,creator:actor,name,role}}}:{password};
  const saved=await request(endpoint,{method:create?'POST':'PUT',headers,body:JSON.stringify(body)});
  if(!saved.ok)return json(400,'Enregistrement refusé. Vérifiez le nom et choisissez un mot de passe plus fort.');
  if(create){
   const account=await saved.json();
   const bind=await request(base+'/rest/v1/rpc/waren_activate_named',{method:'POST',headers:userHeaders,body:JSON.stringify({p_event:event,p_user:account.id})});
   if(!bind.ok){
    // Definitive database rejections roll back membership. Never delete on an ambiguous network failure.
    if(bind.status>=400&&bind.status<500)await request(endpoint+'/'+account.id,{method:'DELETE',headers});
    return json(409,'Compte non activé. Vérifiez que le nom est disponible et que vous coordonnez cet événement.');
   }
  }
  return json(200,create?'Compte validé. La personne peut se connecter avec son nom.':'Nouveau mot de passe enregistré.');
 }catch{return json(503,'Service temporairement indisponible.');}
 }
}

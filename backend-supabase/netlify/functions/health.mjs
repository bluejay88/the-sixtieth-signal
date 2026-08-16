import {configuration,publicHeaders,safeJson} from '../../lib/supabase.mjs';

export default async request=>{
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  try{
    const {url,publishableKey,serviceRoleKey}=configuration();
    const response=await fetch(`${url}/rest/v1/rpc/list_live_audiobook_clips`,{method:'POST',headers:{...publicHeaders(publishableKey),'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
    return safeJson({service:'the-sixtieth-signal-supabase-api',supabase_reachable:response.ok,public_access_configured:true,admin_access_configured:Boolean(serviceRoleKey),schema_migration_status:response.ok?'applied':'verification_failed'},response.ok?200:503);
  }catch(error){
    console.error('health check failed',error instanceof Error?error.message:'unknown');
    return safeJson({service:'the-sixtieth-signal-supabase-api',supabase_reachable:false,public_access_configured:false,admin_access_configured:false,schema_migration_status:'blocked'},503);
  }
};

export const config={path:'/api/health'};

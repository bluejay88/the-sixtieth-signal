import {configuration,publicHeaders,safeJson} from '../../lib/supabase.mjs';

export default async request=>{
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  try{
    const {url,publishableKey}=configuration();
    const response=await fetch(`${url}/rest/v1/rpc/list_live_audiobook_clips`,{method:'POST',headers:{...publicHeaders(publishableKey),'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
    if(!response.ok){console.error('audiobook RPC unavailable',response.status);return safeJson({clips:[],status:'schema_migration_required'},503);}
    const clips=await response.json();
    return safeJson({clips:Array.isArray(clips)?clips:[],status:'live_assets_only'});
  }catch(error){
    console.error('audiobook read failed',error instanceof Error?error.message:'unknown');
    return safeJson({clips:[],status:'service_unavailable'},503);
  }
};

export const config={path:'/api/public/audiobook'};

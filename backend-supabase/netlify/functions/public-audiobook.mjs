import {configuration,corsHeaders,publicHeaders,safeJson} from '../../lib/supabase.mjs';

export default async request=>{
  const cors=corsHeaders(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET',...cors}});
  try{
    const {url,publishableKey}=configuration();
    const response=await fetch(`${url}/rest/v1/rpc/list_live_audiobook_clips`,{method:'POST',headers:{...publicHeaders(publishableKey),'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(5000)});
    if(!response.ok){console.error('audiobook RPC unavailable',response.status);return safeJson({clips:[],status:'schema_migration_required'},503,cors);}
    const clips=await response.json();
    return safeJson({clips:Array.isArray(clips)?clips:[],status:'live_assets_only'},200,cors);
  }catch(error){
    console.error('audiobook read failed',error instanceof Error?error.message:'unknown');
    return safeJson({clips:[],status:'service_unavailable'},503,cors);
  }
};

export const config={path:'/api/public/audiobook'};

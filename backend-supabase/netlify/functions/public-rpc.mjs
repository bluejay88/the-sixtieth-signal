import {configuration,corsHeaders,publicHeaders,safeJson} from '../../lib/supabase.mjs';

const routes={
  '/api/public/stats':{method:'GET',rpc:'get_public_signal_stats'},
  '/api/public/waitlist':{method:'POST',rpc:'join_signal_waitlist'},
  '/api/public/feedback':{method:'POST',rpc:'submit_signal_feedback'},
  '/api/public/track':{method:'POST',rpc:'track_signal_event'}
};

export default async request=>{
  const cors=corsHeaders(request);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const route=routes[new URL(request.url).pathname];
  if(!route)return safeJson({error:'not_found'},404,cors);
  if(request.method!==route.method)return new Response('Method not allowed',{status:405,headers:{Allow:route.method,...cors}});
  const {url,publishableKey}=configuration();
  const input=route.method==='POST'?await request.json().catch(()=>null):{};
  if(route.method==='POST'&&(!input||input.company_website))return safeJson(input?.company_website?{ok:true}:{error:'invalid_json'},input?.company_website?200:400,cors);
  const response=await fetch(`${url}/rest/v1/rpc/${route.rpc}`,{method:'POST',headers:{...publicHeaders(publishableKey),'Content-Type':'application/json'},body:JSON.stringify(route.method==='POST'?{p:input}:{}),signal:AbortSignal.timeout(8000)});
  if(!response.ok){console.error('public RPC failed',route.rpc,response.status);return safeJson({error:'service_unavailable'},503,cors);}
  const body=await response.json();
  return safeJson(route.method==='GET'?body:{ok:true,stored:Boolean(body?.stored)},200,cors);
};

export const config={path:['/api/public/stats','/api/public/waitlist','/api/public/feedback','/api/public/track']};

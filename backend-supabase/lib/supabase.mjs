export function configuration(){
  const url=Netlify.env.get('SUPABASE_URL')?.replace(/\/$/,'');
  const publishableKey=Netlify.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey=Netlify.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!publishableKey)throw new Error('Supabase public configuration is incomplete');
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('Supabase URL is invalid');
  return {url,publishableKey,serviceRoleKey};
}

export function publicHeaders(key){return {apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'};}

export function corsHeaders(request){
  const origin=request.headers.get('origin');
  const allowed=(Netlify.env.get('ALLOWED_PUBLIC_ORIGINS')||'').split(',').map(value=>value.trim()).filter(Boolean);
  if(!origin||!allowed.includes(origin))return {};
  return {
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'86400',
    'Vary':'Origin'
  };
}

export function safeJson(body,status=200,headers={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});}

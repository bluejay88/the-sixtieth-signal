const templates={
  waitlist_welcome:({name})=>({
    subject:'Welcome to The Sixtieth Signal',
    html:`<p>Hello${name?` ${escapeHtml(name)}`:''},</p><p>You are on the launch list for <em>The Sixtieth Signal</em>.</p><p>We will only send the updates you requested. You can unsubscribe from any marketing message.</p>`
  }),
  loam_archives_welcome:({name})=>({
    subject:'Your LOAM Archives access is recorded',
    html:`<p>Hello${name?` ${escapeHtml(name)}`:''},</p><p>Your request to enter the LOAM Archives has been recorded. The first approved dossier will arrive when it is released.</p>`
  })
};

const escapeHtml=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const env=name=>Netlify.env.get(name);
const headers=key=>({apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'});

async function rpc(name,body,url,key){
  const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(key),body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`supabase_${name}_${response.status}`);
  const text=await response.text();
  return text?JSON.parse(text):null;
}

async function sendResend(job,apiKey,from){
  const render=templates[job.template_key];
  if(!render)throw new Error('unapproved_template');
  const message=render({name:job.recipient_name,payload:job.payload});
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[job.recipient_email],subject:message.subject,html:message.html}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error(`resend_${response.status}`);
  return response.json();
}

export default async()=>{
  const provider=env('EMAIL_PROVIDER');
  const enabled=env('EMAIL_DISPATCH_ENABLED')==='true';
  const url=env('SUPABASE_URL'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey=env('RESEND_API_KEY'),from=env('EMAIL_FROM');
  if(!enabled||provider!=='resend'||!url||!serviceKey||!resendKey||!from){
    console.log('Email dispatcher disabled: approval or required configuration is missing.');
    return Response.json({ok:true,mode:'disabled',processed:0});
  }

  const jobs=await rpc('claim_approved_email',{batch_size:10},url,serviceKey);
  let sent=0,failed=0;
  for(const job of jobs||[]){
    try{
      const result=await sendResend(job,resendKey,from);
      await rpc('complete_email_delivery',{target_queue_id:job.queue_id,delivered:true,message_id:result.id,failure_message:null},url,serviceKey);
      sent++;
    }catch(error){
      await rpc('complete_email_delivery',{target_queue_id:job.queue_id,delivered:false,message_id:null,failure_message:error.message},url,serviceKey);
      failed++;
    }
  }
  console.log(`Email dispatch completed: ${sent} sent, ${failed} failed.`);
  return Response.json({ok:true,mode:'active',processed:(jobs||[]).length,sent,failed});
};

export const config={schedule:'*/15 * * * *'};

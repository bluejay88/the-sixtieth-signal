export const config={path:'/.netlify/functions/public-status',rateLimit:{action:'rate_limit',windowLimit:60,windowSize:60,aggregateBy:['ip']}};

export default async request=>{
  if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  const configured=name=>Boolean(Netlify.env.get(name));
  const outboundEmail=['RESEND_API_KEY','SENDGRID_API_KEY','POSTMARK_SERVER_TOKEN','SMTP_URL','GMAIL_REFRESH_TOKEN'].some(configured);
  const dispatchEnabled=configured('EMAIL_PROVIDER')&&Netlify.env.get('EMAIL_DISPATCH_ENABLED')==='true'&&configured('SUPABASE_SERVICE_ROLE_KEY')&&outboundEmail;
  return Response.json({
    service:'the-sixtieth-signal',
    coupon_delivery_configured:configured('COUPON_SIGNING_SECRET')&&configured('SUPABASE_URL')&&configured('SUPABASE_PUBLISHABLE_KEY'),
    outbound_email_configured:outboundEmail,
    outbound_email_mode:dispatchEnabled?'active':'queue_only',
    email_queue_available:configured('EMAIL_QUEUE_READY'),
    audiobook_delivery_mode:'approved_assets_only',
    checked_at:new Date().toISOString()
  },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};

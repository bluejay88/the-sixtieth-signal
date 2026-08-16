(() => {
  'use strict';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const api='https://the-sixtieth-signal-supabase-api.netlify.app';
  const localDevelopment=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const withTimeout=(url,options={},ms=7000)=>fetch(url,{...options,signal:AbortSignal.timeout(ms)});

  // Normalize links, images, forms, and browser metadata without changing canon copy.
  $$('a[target="_blank"]').forEach(a=>a.rel='noopener noreferrer');
  $$('img').forEach((img,index)=>{img.decoding='async';if(index>1)img.loading='lazy';});
  document.documentElement.dataset.js='true';
  document.documentElement.style.setProperty('--safe-bottom','env(safe-area-inset-bottom, 0px)');

  const year=$('.footer-bottom span');
  if(year)year.textContent=year.textContent.replace(/©\s*\d{4}/,`© ${new Date().getFullYear()}`);

  // Network and API status: never equate database readiness with email delivery.
  const network=$('#networkIndicator');
  const showNetwork=message=>{network.hidden=false;network.textContent=message;};
  const hideNetwork=()=>{network.hidden=true;};
  addEventListener('offline',()=>showNetwork('You are offline. Forms will not submit until the connection returns.'));
  addEventListener('online',()=>{showNetwork('Connection restored.');setTimeout(hideNetwork,2400);});
  if(!navigator.onLine)showNetwork('You are offline. Forms will not submit until the connection returns.');

  const production=$('#audioProductionStatus');
  const verified=$('#audioVerifiedAt');
  withTimeout(`${api}/api/public/audiobook`).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    const count=Array.isArray(data.clips)?data.clips.length:0;
    production.classList.add('online');
    $('b',production).textContent=count?`${count} approved audio ${count===1?'clip':'clips'} published`:'Audio production active · 0 approved clips published';
    verified.textContent=`Verified ${new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date())}`;
  }).catch(()=>{$('b',production).textContent='Audio inventory verification unavailable';verified.textContent='Try again later';});
  const emailReadiness=$('#emailReadiness');
  const statusRequest=localDevelopment?Promise.resolve({outbound_email_configured:false}):withTimeout('/.netlify/functions/public-status').then(r=>r.ok?r.json():Promise.reject());
  statusRequest.then(data=>{
    emailReadiness.textContent=data.outbound_email_mode==='active'?'Instant download active · approved confirmation emails enabled':data.email_queue_available?'Instant download active · email requests queued for approval':'Instant download active · outbound email awaiting provider connection';
  }).catch(()=>emailReadiness.textContent='Instant download active · email status unavailable');

  // Back-to-top and navigation state.
  const topButton=$('#backToTop');
  const updateTop=()=>topButton.classList.toggle('show',scrollY>700);
  addEventListener('scroll',updateTop,{passive:true});updateTop();
  topButton.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));

  const navLinks=$$('nav.gates a[href^="#"]');
  const observed=navLinks.map(a=>document.querySelector(a.hash)).filter(Boolean);
  if('IntersectionObserver' in window){
    const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){navLinks.forEach(a=>a.removeAttribute('aria-current'));const active=navLinks.find(a=>a.hash===`#${entry.target.id}`);if(active)active.setAttribute('aria-current','location');}}),{rootMargin:'-35% 0px -55%'});
    observed.forEach(section=>sectionObserver.observe(section));
  }

  // Mobile drawer: semantic state, Escape close, focus restoration, scroll lock.
  const toggle=$('#navToggle'),drawer=$('#mobileDrawer'),close=$('#drawerClose');let priorFocus=null;
  if(toggle&&drawer&&close){
    toggle.setAttribute('aria-controls','mobileDrawer');toggle.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');
    const syncDrawer=open=>{toggle.setAttribute('aria-expanded',String(open));drawer.setAttribute('aria-hidden',String(!open));document.body.style.overflow=open?'hidden':'';if(open){priorFocus=document.activeElement;close.focus();}else if(priorFocus)priorFocus.focus();};
    toggle.addEventListener('click',()=>syncDrawer(true));close.addEventListener('click',()=>syncDrawer(false));
    $$('#mobileDrawer a').forEach(a=>a.addEventListener('click',()=>syncDrawer(false)));
    addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer.classList.contains('open')){drawer.classList.remove('open');syncDrawer(false);}});
  }

  // Forms: native semantics, privacy-conscious persistence, trim, validation, and busy state.
  const configure=(id,{name,email,button})=>{
    const form=$(id);if(!form)return;
    const nameInput=name&&$(name),emailInput=email&&$(email),submit=$(button,form);
    if(nameInput){nameInput.autocomplete='name';nameInput.maxLength=120;}
    if(emailInput){emailInput.autocomplete='email';emailInput.inputMode='email';emailInput.maxLength=254;emailInput.spellcheck=false;}
    $$('input[type="text"],input[type="email"],textarea',form).forEach(input=>input.addEventListener('blur',()=>input.value=input.value.trim()));
    form.addEventListener('invalid',event=>{event.target.setAttribute('aria-invalid','true');},true);
    form.addEventListener('input',event=>event.target.removeAttribute('aria-invalid'));
    form.addEventListener('submit',()=>{if(form.checkValidity()){submit?.setAttribute('aria-busy','true');submit?.setAttribute('aria-disabled','true');}},true);
  };
  configure('#waitlistForm',{name:'#wl-name',email:'#wl-email',button:'button[type="submit"]'});
  configure('#feedbackForm',{email:'#fb-email',button:'button[type="submit"]'});
  configure('#leadMagnetForm',{name:'#lm-first',email:'#lm-email',button:'button[type="submit"]'});
  const preferred=$('#wl-format');
  if(preferred){const saved=localStorage.getItem('signal_preferred_format');if(saved&&$$('option',preferred).some(o=>o.value===saved))preferred.value=saved;preferred.addEventListener('change',()=>localStorage.setItem('signal_preferred_format',preferred.value));}
  const campaign={source:new URLSearchParams(location.search).get('utm_source'),medium:new URLSearchParams(location.search).get('utm_medium'),campaign:new URLSearchParams(location.search).get('utm_campaign')};
  if(Object.values(campaign).some(Boolean))sessionStorage.setItem('signal_campaign',JSON.stringify(campaign));

  // FAQ behaves as a restrained accordion and remains keyboard-native.
  const faqs=$$('.faq-list details');
  faqs.forEach(item=>item.addEventListener('toggle',()=>{if(item.open)faqs.filter(other=>other!==item).forEach(other=>other.open=false);}));

  // Share uses the native sheet where available, with a clipboard fallback.
  const connect=$('.footer-grid > div:first-child');
  if(connect){const share=document.createElement('button');share.type='button';share.className='share-signal';share.textContent='Share the Signal ↗';share.addEventListener('click',async()=>{const data={title:'The Sixtieth Signal',text:'LOAM was built to predict famine. It finds Antarctica instead.',url:location.origin};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.origin);share.textContent='Link copied ✓';setTimeout(()=>share.textContent='Share the Signal ↗',1800);}}catch{}});connect.append(share);}

  // Keep hash navigation focusable for keyboard and screen-reader users.
  addEventListener('hashchange',()=>{const target=$(location.hash);if(target){target.tabIndex=-1;target.focus({preventScroll:true});}});
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('page-hidden',document.hidden));
})();

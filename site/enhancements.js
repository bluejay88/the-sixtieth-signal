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

  // Full-cast audition room: one accessible controller for ten cached ElevenLabs auditions.
  const castAudio=$('#castAudio'),castCards=$$('[data-cast-audio]'),castPlay=$('#castMainPlay');
  if(castAudio&&castCards.length&&castPlay){
    const now=$('#castNowPlaying'),voice=$('#castVoiceName'),status=$('#castStatus'),seek=$('#castSeek'),elapsed=$('#castElapsed'),duration=$('#castDuration'),back=$('#castBack'),forward=$('#castForward'),mute=$('#castMute'),volume=$('#castVolume'),speed=$('#castSpeed');
    let active=null,seeking=false;
    const fmt=value=>{if(!Number.isFinite(value))return '0:00';const seconds=Math.max(0,Math.floor(value));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
    const controls=[castPlay,seek,back,forward,mute,volume,speed];
    const setEnabled=enabled=>controls.forEach(control=>control.disabled=!enabled);
    const syncPlay=()=>{const playing=!castAudio.paused&&!castAudio.ended;castPlay.setAttribute('aria-pressed',String(playing));castPlay.setAttribute('aria-label',playing?'Pause selected audition':'Play selected audition');active?.classList.toggle('is-playing',playing);active?.setAttribute('aria-pressed','true');};
    const save=()=>{if(active)localStorage.setItem('signal_cast_player',JSON.stringify({role:active.dataset.role,time:Math.floor(castAudio.currentTime),volume:castAudio.volume,speed:castAudio.playbackRate}));};
    const load=async card=>{
      const same=active===card;
      if(same&&castAudio.readyState){if(castAudio.paused)await castAudio.play();else castAudio.pause();return;}
      castAudio.pause();castCards.forEach(item=>{item.classList.remove('is-playing');item.setAttribute('aria-pressed','false');});active=card;card.setAttribute('aria-pressed','true');
      now.textContent=card.dataset.role;voice.textContent=`${card.dataset.voice} · ElevenLabs audition candidate`;status.className='cast-status';status.textContent=`Loading ${card.dataset.role} audition…`;castPlay.setAttribute('aria-busy','true');setEnabled(false);
      castAudio.src=card.dataset.castAudio;castAudio.load();
      try{await castAudio.play();}catch(error){if(error.name!=='AbortError'){status.classList.add('error');status.textContent='Playback was blocked or the audio could not load. Select the role again to retry.';}}
    };
    castCards.forEach(card=>{card.setAttribute('aria-pressed','false');card.addEventListener('click',()=>load(card));});
    castAudio.addEventListener('loadedmetadata',()=>{setEnabled(true);duration.textContent=fmt(castAudio.duration);castPlay.removeAttribute('aria-busy');status.textContent=`Ready · ${fmt(castAudio.duration)} AI-generated audition`;});
    castAudio.addEventListener('playing',()=>{syncPlay();status.textContent=`Playing ${active?.dataset.role||'audition'}`;});
    castAudio.addEventListener('pause',()=>{syncPlay();if(!castAudio.ended&&castAudio.currentTime)status.textContent=`Paused at ${fmt(castAudio.currentTime)}`;save();});
    castAudio.addEventListener('timeupdate',()=>{elapsed.textContent=fmt(castAudio.currentTime);if(!seeking&&castAudio.duration)seek.value=String(Math.round(castAudio.currentTime/castAudio.duration*1000));});
    castAudio.addEventListener('ended',()=>{syncPlay();seek.value='0';elapsed.textContent='0:00';status.textContent=`${active?.dataset.role||'Audition'} complete`;});
    castAudio.addEventListener('error',()=>{castPlay.removeAttribute('aria-busy');setEnabled(Boolean(active));status.classList.add('error');status.textContent='This audition could not be decoded or reached. Check the connection and select the role to retry.';syncPlay();});
    castPlay.addEventListener('click',async()=>{if(!active)return;if(castAudio.paused)await castAudio.play();else castAudio.pause();});
    back.addEventListener('click',()=>castAudio.currentTime=Math.max(0,castAudio.currentTime-10));forward.addEventListener('click',()=>castAudio.currentTime=Math.min(castAudio.duration||0,castAudio.currentTime+10));
    seek.addEventListener('input',()=>{seeking=true;if(castAudio.duration)elapsed.textContent=fmt(Number(seek.value)/1000*castAudio.duration);});seek.addEventListener('change',()=>{if(castAudio.duration)castAudio.currentTime=Number(seek.value)/1000*castAudio.duration;seeking=false;});
    mute.addEventListener('click',()=>{castAudio.muted=!castAudio.muted;mute.setAttribute('aria-pressed',String(castAudio.muted));mute.textContent=castAudio.muted?'Unmute':'Mute';});volume.addEventListener('input',()=>{castAudio.volume=Number(volume.value);if(castAudio.volume)castAudio.muted=false;mute.textContent=castAudio.muted?'Unmute':'Mute';save();});speed.addEventListener('change',()=>{castAudio.playbackRate=Number(speed.value);save();});
    document.addEventListener('keydown',event=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;if(event.code==='Space'||event.key.toLowerCase()==='k'){event.preventDefault();castPlay.click();}else if(event.key==='ArrowLeft')back.click();else if(event.key==='ArrowRight')forward.click();else if(event.key.toLowerCase()==='m')mute.click();});
    try{const saved=JSON.parse(localStorage.getItem('signal_cast_player'));if(saved){castAudio.volume=Math.min(1,Math.max(0,Number(saved.volume)||1));volume.value=String(castAudio.volume);castAudio.playbackRate=Number(saved.speed)||1;speed.value=String(castAudio.playbackRate);const card=castCards.find(item=>item.dataset.role===saved.role);if(card){now.textContent=saved.role;voice.textContent=`${card.dataset.voice} · resume available`;status.textContent='Previous audition remembered. Select it to resume.';card.addEventListener('click',()=>{if(Number(saved.time)>0)castAudio.addEventListener('loadedmetadata',()=>castAudio.currentTime=Math.min(saved.time,castAudio.duration),{once:true});},{once:true});}}}catch{}
    addEventListener('beforeunload',save);
  }

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

const parts = [
  ["I", ["The Hunger Map","A Variable with No Crop","Missing Water","The Man Who Counts Tomorrow","Nico's Leak","Six Coordinates","The Southern Window","Count What Is Missing","White Transit","The Mouth in the Ice"]],
  ["II", ["Imani Says No","The Ledger Before Language","A Number That Refuses Ten","The First Checksum","The Prism","The Field of Three Graves","Compare","The Archive Opens Sideways","Nara","Gods Are Bad Translations"]],
  ["III", ["The Government Already Knew","Pike's Model","The Species That Prayed for Data","Preserve Order","Half Turn","After the Turn","The Mercy Doctrine","The City Beneath Memory","Seren's Crime","What the Flood Kept"]],
  ["IV", ["The Third Witness","The First Public Proof","Overlay","Seventy-Two Hours","The Death of One Truth","The Returners","The God Who Stayed","Nico Broadcasts the Impossible","LOAM Refuses","The War of Definitions"]],
  ["V", ["Three Votes","Witness","The Iru-Shai Divide","The Last Reset","Pike Opens the Files","The Human Variable","Signal from Outside","The Creators' Fear","The Consent Protocol","Full Circle"]]
];
const cast = [
  ["Narrator","STORY ANCHOR","Intimate low register · documentary restraint","narrator","The map did not show hunger. It showed everything that would become hunger before anyone admitted the connection."],
  ["Cassian Osei-Lorne","SYSTEMS ARCHITECT","Warm baritone · analytical · dry humor","cassian","Pattern hunger was one of the oldest bugs in the human brain. See three points, invent a constellation."],
  ["Dr. Imani Sayegh","EPIGRAPHER","Low mezzo · exact · surgical wit","imani","No. You have an incomplete provenance and a pattern you are already calling intentional."],
  ["Nico Ashbourne","INVESTIGATIVE HOST","Bright tenor · agile · attentive","nico","The story is not what they found. The story is who decided the rest of us were not ready to know."],
  ["Director Maelin Pike","COMMAND","Low alto · measured · decisive","pike","Keeping the files closed had become another form of command."],
  ["LOAM","THIRD WITNESS","Synthetic neutral · literal · calibrated","loam","Predictive value is not equivalent to mechanistic confidence. Pattern detection does not establish pattern authorship."],
  ["Seren","ARCHIVIST / CONFESSOR","Contralto · patient · burdened","seren","Preservation without consent is only another name for possession."],
  ["Shaal-Amur","IRU-SHAI AUTHORITY","Alien baritone · calm · persuasive","shaal","We did not choose control because we hated freedom. We chose it because we remembered extinction."],
  ["Nara","THE HUMAN RECORD","Grounded mezzo · intimate · specific","nara","A life does not become small because an archive cannot measure it."],
  ["Abena","HUMAN GROUNDING","Mature warmth · unsentimental wit","abena","A model is an argument with numbers attached. Go and see the nothing for yourself."]
];
const episodes = [
  ["01","The Wrong Part Is Useful","Chapters 1–5","When does an impossible variable justify action?"],
  ["02","Count What Is Missing","Chapters 6–10","Can absence become evidence without becoming conspiracy?"],
  ["03","The Ledger Before Language","Chapters 11–15","Does counting precede culture?"],
  ["04","Gods Are Bad Translations","Chapters 16–20","What does translation do to moral status?"],
  ["05","The Government Already Knew","Chapters 21–25","When does protective secrecy become power?"],
  ["06","The Mercy Doctrine","Chapters 26–30","Can mercy exist without consent?"],
  ["07","Public Proof","Chapters 31–35","Who controls the timing of destabilizing truth?"],
  ["08","LOAM Refuses","Chapters 36–40","Is refusal agency, design, or both?"],
  ["09","Three Votes","Chapters 41–45","Who can consent for a civilization?"],
  ["10","Keep the Variable","Chapters 46–50","Can uncertainty protect freedom?"]
];
const products = [
  ["ebook","Digital Edition","EPUB + reader guide","A clean, portable edition for immediate reading."],
  ["audiobook","Audiobook In Production","50 scripts locked · casting pending","The locked novel is prepared for a distinct voice ensemble; release opens only after generation, mastering, and listening QA."],
  ["bundle","Signal Bundle","Ebook + audiobook + dossier","The complete story and companion listening path."],
  ["collector","Collector Edition","Premium print + archive access","Join the interest list for the physical artifact."]
];

const tabs = document.querySelector('.part-tabs'), chapters = document.querySelector('.chapters');
let productionChapters=[];
function showPart(i){ tabs.querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-selected',j===i)); chapters.innerHTML=parts[i][1].map((t,j)=>{const n=i*10+j+1,p=productionChapters.find(x=>x.number===n);return `<div><span>${String(n).padStart(2,'0')}</span><strong>${t}</strong><button disabled aria-label="${t} production status">${p?`Script locked · ${p.segments} segments · ~${Math.round(p.estimated_minutes)} min`:'Production audit pending'}</button></div>`}).join(''); }
parts.forEach((p,i)=>{ const b=document.createElement('button'); b.textContent=`PART ${p[0]}`; b.setAttribute('role','tab'); b.onclick=()=>showPart(i); tabs.appendChild(b); }); showPart(0);
fetch('/data/audiobook-production.json').then(r=>r.ok?r.json():Promise.reject()).then(data=>{productionChapters=data.chapters||[];const selected=[...tabs.querySelectorAll('button')].findIndex(b=>b.getAttribute('aria-selected')==='true');showPart(Math.max(0,selected))}).catch(()=>{});
document.querySelector('.cast-list').innerHTML=cast.map((c,i)=>`<article class="cast-row reveal"><span>${String(i+1).padStart(2,'0')}</span><div><h3>${c[0]}</h3><small>${c[1]}</small></div><p>${c[2]}</p><button class="mini-play" data-voice="${c[3]}" data-preview="${c[4]}" aria-label="Play ${c[0]} voice preview">▶ Preview</button></article>`).join('');
document.querySelector('.episode-list').innerHTML=episodes.map(e=>`<article class="episode reveal"><span>${e[0]}</span><div><h3>${e[1]}</h3><small>${e[2]}</small></div><p>${e[3]}</p><button aria-label="Episode ${e[0]} coming soon">COMING SOON</button></article>`).join('');
document.querySelector('.products').innerHTML=products.map(p=>`<article class="product reveal"><div><small>${p[1]}</small><h3>${p[2]}</h3><p>${p[3]}</p></div><a class="button ${p[0]==='bundle'?'primary':'ghost'} checkout" data-product="${p[0]}" href="#store">${p[0]==='collector'?'Join interest list':'Buy / preorder'}</a></article>`).join('');

let activeAudio;
async function speakPreview(key,text,button){
  button.textContent='Loading…';button.disabled=true;
  try{const r=await fetch(`/.netlify/functions/voice-preview?character=${encodeURIComponent(key)}`,{method:'POST'});if(!r.ok)throw new Error('fallback');const blob=await r.blob();if(activeAudio)activeAudio.pause();activeAudio=new Audio(URL.createObjectURL(blob));button.textContent='■ Stop';activeAudio.onended=()=>{button.textContent='▶ Preview';button.disabled=false};await activeAudio.play();}
  catch{button.disabled=false;button.textContent='▶ Preview';toast('This natural ElevenLabs voice is still being mastered. No robotic fallback will be played.')}
}
document.addEventListener('click',e=>{
  const voiceBtn=e.target.closest('[data-voice]'); if(voiceBtn){ if(activeAudio&&!activeAudio.paused){activeAudio.pause();voiceBtn.textContent='▶ Preview';voiceBtn.disabled=false}else{speakPreview(voiceBtn.dataset.voice,voiceBtn.dataset.preview,voiceBtn)} return; }
  const audioBtn=e.target.closest('[data-audio]');
  if(audioBtn){ const src=audioBtn.dataset.audio; if(activeAudio && activeAudio.src.endsWith(src)){ activeAudio.paused?activeAudio.play():activeAudio.pause(); return; } if(activeAudio) activeAudio.pause(); activeAudio=new Audio(src); activeAudio.play().catch(()=>toast('Audio preview is being mastered. Join the release list for the first listen.')); }
  const checkout=e.target.closest('.checkout'); if(checkout){ const url=window.SIGNAL_CONFIG?.checkout?.[checkout.dataset.product]; if(url){ checkout.href=url; checkout.target='_blank'; } else { e.preventDefault(); document.querySelector('.interest-form input').focus(); toast('Secure checkout is awaiting your live payment link. We moved you to release notifications.'); } }
  const payment=e.target.closest('.payment-link'); if(payment){ const url=window.SIGNAL_CONFIG?.donations?.[payment.dataset.kind]; if(url){ payment.href=url; payment.target='_blank'; } else { e.preventDefault(); toast('Donation checkout is awaiting your secure PayPal, Ko-fi, or Stripe link.'); } }
});
function toast(msg){ const t=document.querySelector('.toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),5000); }
const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('seen')),{threshold:.12}); document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
document.querySelector('.nav-toggle').onclick=e=>{ const open=e.currentTarget.getAttribute('aria-expanded')==='true'; e.currentTarget.setAttribute('aria-expanded',!open); document.querySelector('#nav-links').classList.toggle('open'); };
window.addEventListener('scroll',()=>document.querySelector('[data-nav]').classList.toggle('solid',scrollY>50));
document.querySelector('#year').textContent=new Date().getFullYear();
document.querySelectorAll('[data-social]').forEach(link=>{const url=window.SIGNAL_CONFIG?.social?.[link.dataset.social];if(url){link.href=url;link.target='_blank';link.rel='noopener'}else link.onclick=e=>{e.preventDefault();toast(`${link.textContent} account setup is in the owner launch queue.`)}});
const couponForm=document.querySelector('#coupon-form');
if(couponForm){const qp=new URLSearchParams(location.search);['utm_source','utm_medium','utm_campaign'].forEach(k=>couponForm.elements[k].value=qp.get(k)||'direct');couponForm.addEventListener('submit',async e=>{e.preventDefault();const status=couponForm.querySelector('.form-status'),button=couponForm.querySelector('button[type=submit]');button.disabled=true;status.textContent='Registering your reader access…';const fd=new FormData(couponForm),body={};for(const [k,v] of fd){if(k==='interests'||k==='programs')(body[k]??=[]).push(v);else body[k]=v}body.delivery_consent=fd.has('delivery_consent');body.email_marketing_consent=fd.has('email_marketing_consent');body.sms_marketing_consent=fd.has('sms_marketing_consent');try{const response=await fetch('/.netlify/functions/coupon-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw new Error(`coupon ${response.status}`);const result=await response.json();document.querySelector('#coupon-code').textContent=result.code;document.querySelector('#coupon-download').href=result.download_url;couponForm.hidden=true;document.querySelector('#coupon-result').hidden=false;}catch{status.textContent='Reader access is temporarily unavailable. Please try again.';button.disabled=false}});document.querySelector('#copy-coupon').onclick=()=>{navigator.clipboard.writeText(document.querySelector('#coupon-code').textContent);toast('Coupon copied.')}}

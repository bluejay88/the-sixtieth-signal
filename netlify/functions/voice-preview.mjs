const scripts = {
  narrator: "The map did not show hunger. It showed everything that would become hunger before anyone admitted the connection.",
  cassian: "Pattern hunger was one of the oldest bugs in the human brain. See three points, invent a constellation.",
  imani: "No. You have an incomplete provenance and a pattern you are already calling intentional.",
  nico: "The story is not what they found. The story is who decided the rest of us were not ready to know.",
  pike: "Keeping the files closed had become another form of command.",
  loam: "Predictive value is not equivalent to mechanistic confidence. Pattern detection does not establish pattern authorship.",
  seren: "Preservation without consent is only another name for possession.",
  shaal: "We did not choose control because we hated freedom. We chose it because we remembered extinction.",
  nara: "A life does not become small because an archive cannot measure it.",
  abena: "A model is an argument with numbers attached. Go and see the nothing for yourself."
};
const settings = {
  narrator:{stability:.74,similarity_boost:.76,style:.12},cassian:{stability:.7,similarity_boost:.78,style:.18},imani:{stability:.82,similarity_boost:.75,style:.1},nico:{stability:.55,similarity_boost:.8,style:.32},pike:{stability:.86,similarity_boost:.76,style:.08},loam:{stability:.96,similarity_boost:.82,style:0},seren:{stability:.78,similarity_boost:.8,style:.16},shaal:{stability:.9,similarity_boost:.84,style:.08},nara:{stability:.7,similarity_boost:.75,style:.2},abena:{stability:.66,similarity_boost:.78,style:.25}
};
export default async (request) => {
  if(request.method!=="POST") return new Response("Method not allowed",{status:405,headers:{Allow:"POST"}});
  const ip=request.headers.get("x-nf-client-connection-ip")||"unknown";
  const character=new URL(request.url).searchParams.get("character")?.toLowerCase();
  if(!character||!scripts[character]) return Response.json({error:"Unknown character"},{status:400});
  const apiKey=Netlify.env.get("ELEVENLABS_API_KEY"), voiceId=Netlify.env.get(`ELEVENLABS_VOICE_${character.toUpperCase()}`);
  if(!apiKey||!voiceId) return Response.json({error:"ElevenLabs voice is not configured; use browser fallback.",fallback:true},{status:503,headers:{"Cache-Control":"no-store","X-Request-Source":ip==="unknown"?"unknown":"netlify"}});
  const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,{method:"POST",headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text:scripts[character],model_id:Netlify.env.get("ELEVENLABS_MODEL_ID")||"eleven_multilingual_v2",voice_settings:{...settings[character],use_speaker_boost:true}})});
  if(!response.ok){const detail=await response.text();console.error("ElevenLabs preview failed",response.status,detail.slice(0,300));return Response.json({error:"Voice service unavailable",fallback:true},{status:502,headers:{"Cache-Control":"no-store"}})}
  return new Response(response.body,{status:200,headers:{"Content-Type":"audio/mpeg","Cache-Control":"public, max-age=86400","X-Voice-Provider":"ElevenLabs"}});
};

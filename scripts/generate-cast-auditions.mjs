import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('audiobook');
const cast=JSON.parse(await readFile(path.join(root,'voice-cast.json'),'utf8'));
const scripts=JSON.parse(await readFile(path.join(root,'audition-scripts.json'),'utf8'));
const dryRun=process.argv.includes('--dry-run');
let key=process.env.ELEVENLABS_API_KEY||'';
if(!dryRun){
  if(!key){const local=await readFile('labs.py','utf8');key=local.match(/sk_[A-Za-z0-9_-]+/)?.[0]||'';}
  if(!key.startsWith('sk_'))throw new Error('A valid ElevenLabs API key beginning with sk_ is required.');
}
const output=path.join(root,'auditions');
if(!dryRun)await mkdir(output,{recursive:true});
const normalize=value=>value.toLowerCase().replace(/[‘’]/g,"'").replace(/[“”".,!?;:]/g,'').replace(/\s+/g,' ').trim();

const validated=[];
for(const audition of scripts.auditions){
  const actor=cast.roles[audition.role];
  if(!actor?.voice_id)throw new Error(`No audition voice assigned for ${audition.role}`);
  const source=normalize(await readFile(path.join(root,audition.source_file),'utf8'));
  for(const sentence of audition.text.split(/(?<=[.!?])\s+/)){
    if(sentence&&!source.includes(normalize(sentence)))throw new Error(`${audition.role}: audition sentence is not present in locked source`);
  }
  validated.push({role:audition.role,characters:audition.text.length,voice_id:actor.voice_id});
  if(dryRun)continue;
  const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(actor.voice_id)}?output_format=mp3_44100_128`,{
    method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'},
    body:JSON.stringify({text:audition.text,model_id:cast.model_id,voice_settings:actor.settings}),signal:AbortSignal.timeout(60000)
  });
  if(!response.ok)throw new Error(`ElevenLabs ${response.status} for ${audition.role}: ${(await response.text()).slice(0,240)}`);
  const file=path.join(output,`${audition.role}.mp3`);
  await writeFile(file,Buffer.from(await response.arrayBuffer()));
  console.log(`WRITE ${file}`);
}
if(dryRun)console.log(JSON.stringify({dry_run:true,auditions:validated.length,total_characters:validated.reduce((sum,item)=>sum+item.characters,0),roles:validated.map(item=>item.role)},null,2));

import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('audiobook');
let manifest;
try{manifest=JSON.parse(await readFile(path.join(root,'render-plan','fullcast-render-manifest.json'),'utf8'));}
catch{throw new Error('Full-cast render plan missing. Complete and validate dialogue routing, then run npm run audio:build-fullcast-plan.');}
const cast=JSON.parse(await readFile(path.join(root,'voice-cast.json'),'utf8'));
const chapterArg=process.argv.find(x=>x.startsWith('--chapter='));
const selected=chapterArg?Number(chapterArg.split('=')[1]):null;
const dryRun=process.argv.includes('--dry-run');
let key=process.env.ELEVENLABS_API_KEY||'';
if(!key){try{const local=await readFile('labs.py','utf8');key=local.match(/sk_[A-Za-z0-9_-]+/)?.[0]||''}catch{}}
if(!dryRun&&!key.startsWith('sk_'))throw new Error('A valid ElevenLabs API key beginning with sk_ is required. The legacy key ID in labs.py cannot authenticate.');

const jobs=[];
for(const chapter of manifest.chapters){
  if(selected&&chapter.chapter!==selected)continue;
  for(const unit of chapter.units){
    const actor=cast.roles[unit.voice_role];
    if(!actor)throw new Error(`Unknown or uncast voice role ${unit.voice_role}`);
    if(!dryRun&&!actor.voice_id)throw new Error(`Missing ElevenLabs voice_id for ${unit.voice_role}`);
    jobs.push({chapter:chapter.chapter,segment:unit.index,input:path.join(root,unit.file),output:path.join(root,'audio',`chapter-${String(chapter.chapter).padStart(2,'0')}`,`unit-${String(unit.index).padStart(4,'0')}.mp3`),actor});
  }
}
if(dryRun){console.log(JSON.stringify({dry_run:true,jobs:jobs.length,chapters:[...new Set(jobs.map(j=>j.chapter))],roles:[...new Set(jobs.map(j=>j.actor.role))]},null,2));process.exit(0)}

for(const [index,job] of jobs.entries()){
  try{await access(job.output);console.log(`SKIP ${job.output}`);continue}catch{}
  const text=(await readFile(job.input,'utf8')).trim();
  const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(job.actor.voice_id)}?output_format=mp3_44100_128`,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'},body:JSON.stringify({text,model_id:cast.model_id,voice_settings:job.actor.settings})});
  if(!response.ok)throw new Error(`ElevenLabs ${response.status}: ${(await response.text()).slice(0,300)}`);
  await mkdir(path.dirname(job.output),{recursive:true});
  await writeFile(job.output,Buffer.from(await response.arrayBuffer()));
  console.log(`WRITE ${index+1}/${jobs.length} ${job.output}`);
  await new Promise(resolve=>setTimeout(resolve,1250));
}

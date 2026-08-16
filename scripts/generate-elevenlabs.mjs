import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('audiobook');
const manifest=JSON.parse(await readFile(path.join(root,'production-manifest.json'),'utf8'));
const cast=JSON.parse(await readFile(path.join(root,'voice-cast.json'),'utf8'));
const chapterArg=process.argv.find(x=>x.startsWith('--chapter='));
const selected=chapterArg?Number(chapterArg.split('=')[1]):null;
const dryRun=process.argv.includes('--dry-run');
let key=process.env.ELEVENLABS_API_KEY||'';
if(!key){try{const local=await readFile('labs.py','utf8');key=local.match(/sk_[A-Za-z0-9_-]+/)?.[0]||''}catch{}}
if(!dryRun&&!key.startsWith('sk_'))throw new Error('A valid ElevenLabs sk_ secret is required in ELEVENLABS_API_KEY or labs.py.');

const jobs=[];
for(const chapter of manifest.chapters){
  if(selected&&chapter.number!==selected)continue;
  for(const segment of chapter.segments){
    const actor=cast.roles[segment.voice_role];
    if(!actor)throw new Error(`Unknown voice role ${segment.voice_role}`);
    if(!dryRun&&!actor.voice_id)throw new Error(`Missing ElevenLabs voice_id for ${segment.voice_role}`);
    jobs.push({chapter:chapter.number,segment:segment.index,input:path.join(root,segment.file),output:path.join(root,'audio',`chapter-${String(chapter.number).padStart(2,'0')}`,`segment-${String(segment.index).padStart(3,'0')}.mp3`),actor});
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

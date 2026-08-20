import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('audiobook');
const manifest=JSON.parse(await readFile(path.join(root,'production-manifest.json'),'utf8'));
const selectedArg=process.argv.find(value=>value.startsWith('--chapter='));
const selected=selectedArg?Number(selectedArg.split('=')[1]):null;
const maxCharacters=Number(process.argv.find(value=>value.startsWith('--max-characters='))?.split('=')[1]||3800);
if(!Number.isInteger(maxCharacters)||maxCharacters<500||maxCharacters>4000)throw new Error('max-characters must be between 500 and 4000');
const sha=value=>createHash('sha256').update(value).digest('hex');

function appendChunk(chunks,voiceRole,text,kind,dialogueId=null){
  if(!text)return;
  const last=chunks.at(-1);
  if(last&&last.voice_role===voiceRole&&last.kind===kind&&last.text.length+text.length<=maxCharacters){
    last.text+=text;
    if(dialogueId)last.dialogue_ids.push(dialogueId);
    return;
  }
  chunks.push({voice_role:voiceRole,kind,text,dialogue_ids:dialogueId?[dialogueId]:[]});
}

async function buildChapter(chapter){
  const chapterId=String(chapter.number).padStart(2,'0');
  const source=await readFile(path.join(root,chapter.file),'utf8');
  const review=JSON.parse(await readFile(path.join(root,'routing',`chapter-${chapterId}-dialogue-review.json`),'utf8'));
  let validated;
  try{validated=JSON.parse(await readFile(path.join(root,'routing','validated',`chapter-${chapterId}-validated.json`),'utf8'));}
  catch{throw new Error(`Chapter ${chapter.number}: validated routing file is missing`);}
  if(validated.chapter_sha256!==review.chapter_sha256||validated.render_allowed!==true||validated.complete!==true)throw new Error(`Chapter ${chapter.number}: routing is not complete and renderable`);
  const decisions=new Map(validated.decisions.map(decision=>[decision.dialogue_id,decision]));
  const chunks=[];
  let cursor=0;
  for(const span of review.spans){
    const decision=decisions.get(span.dialogue_id);
    if(!decision||decision.review_status!=='approved'||decision.speaker==='unresolved')throw new Error(`Chapter ${chapter.number}: unresolved routing at ${span.dialogue_id}`);
    appendChunk(chunks,'narrator',source.slice(cursor,span.start_offset),'narration');
    appendChunk(chunks,decision.speaker,source.slice(span.start_offset,span.end_offset),'dialogue',span.dialogue_id);
    cursor=span.end_offset;
  }
  appendChunk(chunks,'narrator',source.slice(cursor),'narration');
  const reconstructed=chunks.map(chunk=>chunk.text).join('');
  if(reconstructed!==source)throw new Error(`Chapter ${chapter.number}: render plan does not reconstruct locked text`);
  const directory=path.join(root,'render-plan',`chapter-${chapterId}`);
  await mkdir(directory,{recursive:true});
  const planned=[];
  for(const [index,chunk] of chunks.entries()){
    const filename=`unit-${String(index+1).padStart(4,'0')}.txt`;
    await writeFile(path.join(directory,filename),chunk.text,'utf8');
    planned.push({index:index+1,file:path.relative(root,path.join(directory,filename)).replaceAll('\\','/'),voice_role:chunk.voice_role,kind:chunk.kind,characters:chunk.text.length,sha256:sha(chunk.text),dialogue_ids:chunk.dialogue_ids});
  }
  return {chapter:chapter.number,title:chapter.title,source_sha256:sha(source),render_units:planned.length,reconstructed_sha256:sha(reconstructed),text_integrity_verified:sha(source)===sha(reconstructed),units:planned};
}

const chapters=selected?manifest.chapters.filter(chapter=>chapter.number===selected):manifest.chapters;
if(!chapters.length)throw new Error(`Unknown chapter ${selected}`);
const results=[];
for(const chapter of chapters)results.push(await buildChapter(chapter));
const output={schema_version:1,source_sha256:manifest.source_sha256,chapter_count:results.length,max_characters:maxCharacters,chapters:results,total_render_units:results.reduce((sum,chapter)=>sum+chapter.render_units,0),text_integrity_verified:results.every(chapter=>chapter.text_integrity_verified),generated_at:new Date().toISOString()};
await mkdir(path.join(root,'render-plan'),{recursive:true});
await writeFile(path.join(root,'render-plan','fullcast-render-manifest.json'),JSON.stringify(output,null,2)+'\n','utf8');
console.log(JSON.stringify({chapters:output.chapter_count,render_units:output.total_render_units,text_integrity_verified:output.text_integrity_verified},null,2));

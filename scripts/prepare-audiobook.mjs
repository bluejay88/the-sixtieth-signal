import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const source=process.argv[2]||'C:/Users/jayla/Downloads/Stage58_Publication_Lock_Final_Proof_Manuscript.txt';
const root=path.resolve('audiobook');
const chapterDir=path.join(root,'manuscript');
const segmentDir=path.join(root,'segments');
const maxChars=3800;
const partFor=n=>Math.ceil(n/10);
const normalize=s=>s.replace(/\r\n/g,'\n').replace(/[ \t]+$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
const words=s=>(s.match(/\S+/g)||[]).length;
const sha=s=>createHash('sha256').update(s).digest('hex');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

function splitLong(text){
  const pieces=[];
  for(const paragraph of text.split(/\n\s*\n/)){
    if(paragraph.length<=maxChars){pieces.push(paragraph);continue}
    const sentences=paragraph.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/g)||[paragraph];
    let current='';
    for(const sentenceRaw of sentences){
      let sentence=sentenceRaw.trim();
      while(sentence.length>maxChars){
        let cut=sentence.lastIndexOf(' ',maxChars);
        if(cut<1)cut=maxChars;
        if(current){pieces.push(current.trim());current=''}
        pieces.push(sentence.slice(0,cut).trim());
        sentence=sentence.slice(cut).trim();
      }
      if((current+' '+sentence).trim().length>maxChars){pieces.push(current.trim());current=sentence}
      else current=(current+' '+sentence).trim();
    }
    if(current)pieces.push(current.trim());
  }
  const chunks=[];let current='';
  for(const piece of pieces.filter(Boolean)){
    if((current+'\n\n'+piece).trim().length>maxChars){if(current)chunks.push(current);current=piece}
    else current=(current+'\n\n'+piece).trim();
  }
  if(current)chunks.push(current);
  return chunks;
}

const raw=(await readFile(source,'utf8')).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const matches=[...raw.matchAll(/^CHAPTER ([A-Z-]+)\s*$/gm)];
if(matches.length!==50)throw new Error(`Expected 50 chapters; found ${matches.length}`);
const partMatches=[...raw.matchAll(/^PART ([IVX]+)\s*\n([^\n]+)\s*$/gm)];
if(partMatches.length!==5)throw new Error(`Expected 5 parts; found ${partMatches.length}`);
const starts=matches.map((match,index)=>index%10===0?partMatches[index/10].index:match.index);
await mkdir(chapterDir,{recursive:true});
await rm(segmentDir,{recursive:true,force:true});
await mkdir(segmentDir,{recursive:true});

const manifest={schema_version:1,source:path.basename(source),source_sha256:sha(raw),generated_at:new Date().toISOString(),chapter_count:50,max_segment_characters:maxChars,chapters:[]};
for(let i=0;i<matches.length;i++){
  const number=i+1,start=starts[i],end=starts[i+1]??raw.length;
  let block=normalize(raw.slice(start,end));
  const lines=block.split('\n');
  const headingIndex=lines.findIndex(line=>/^CHAPTER [A-Z-]+$/.test(line.trim()));
  const title=(lines.find((line,index)=>index>headingIndex&&line.trim())||`Chapter ${number}`).trim();
  const chapterText=normalize(block);
  const chunks=splitLong(chapterText);
  const reconstructed=normalize(chunks.join('\n\n'));
  if(sha(reconstructed)!==sha(chapterText))throw new Error(`Text integrity failure in chapter ${number}`);
  const base=`chapter-${String(number).padStart(2,'0')}-${slug(title)}`;
  await writeFile(path.join(chapterDir,`${base}.txt`),chapterText+'\n','utf8');
  const outDir=path.join(segmentDir,`chapter-${String(number).padStart(2,'0')}`);
  await mkdir(outDir,{recursive:true});
  const segmentEntries=[];
  for(let j=0;j<chunks.length;j++){
    const filename=`segment-${String(j+1).padStart(3,'0')}.txt`;
    await writeFile(path.join(outDir,filename),chunks[j]+'\n','utf8');
    segmentEntries.push({index:j+1,file:`segments/chapter-${String(number).padStart(2,'0')}/${filename}`,characters:chunks[j].length,words:words(chunks[j]),sha256:sha(chunks[j]),voice_role:'narrator',routing_status:'unreviewed'});
  }
  manifest.chapters.push({number,part:partFor(number),title,file:`manuscript/${base}.txt`,words:words(chapterText),characters:chapterText.length,estimated_minutes:Number((words(chapterText)/150).toFixed(1)),sha256:sha(chapterText),segments:segmentEntries});
}
manifest.total_words=manifest.chapters.reduce((n,c)=>n+c.words,0);
manifest.total_characters=manifest.chapters.reduce((n,c)=>n+c.characters,0);
manifest.total_segments=manifest.chapters.reduce((n,c)=>n+c.segments.length,0);
manifest.estimated_hours=Number((manifest.total_words/150/60).toFixed(1));
const reconstructedBook=normalize((await Promise.all(manifest.chapters.map(c=>readFile(path.join(root,c.file),'utf8')))).join('\n\n'));
const normalizedSource=normalize(raw);
if(sha(reconstructedBook)!==sha(normalizedSource))throw new Error('Whole-book text integrity failure');
manifest.normalized_source_sha256=sha(normalizedSource);
manifest.reconstructed_sha256=sha(reconstructedBook);
manifest.text_integrity_verified=true;
await writeFile(path.join(root,'production-manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
await mkdir(path.resolve('site/data'),{recursive:true});
await writeFile(path.resolve('site/data/audiobook-production.json'),JSON.stringify({schema_version:1,status:'in_production',source_locked:true,text_integrity_verified:manifest.text_integrity_verified,chapter_count:manifest.chapter_count,total_words:manifest.total_words,total_segments:manifest.total_segments,estimated_hours:manifest.estimated_hours,voices_approved:false,audio_generated:false,mastered_chapters:0,published_chapters:0,chapters:manifest.chapters.map(c=>({number:c.number,part:c.part,title:c.title,words:c.words,estimated_minutes:c.estimated_minutes,segments:c.segments.length,status:'script_locked'}))},null,2)+'\n','utf8');
console.log(JSON.stringify({chapters:manifest.chapter_count,segments:manifest.total_segments,words:manifest.total_words,estimated_hours:manifest.estimated_hours,source_sha256:manifest.source_sha256},null,2));

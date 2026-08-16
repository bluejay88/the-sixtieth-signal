import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('audiobook');
const manifest=JSON.parse(await readFile(path.join(root,'production-manifest.json'),'utf8'));
const arg=process.argv.find(value=>value.startsWith('--chapter='));
const all=process.argv.includes('--all');
const requested=Number(arg?.split('=')[1]||1);
const sha=value=>createHash('sha256').update(value).digest('hex');
const speakers={
  Cassian:'cassian',Nico:'nico',Abena:'abena',LOAM:'loam',Mira:'mira',Pike:'pike',Imani:'imani',Seren:'seren',Nara:'nara','Shaal-Amur':'shaal',Park:'park',Arendt:'arendt',Selene:'selene',Avel:'avel',Vaziri:'vaziri',Sol:'sol',Quispe:'quispe'
};
const speechVerb='(?:said|asked|replied|answered|added|called|whispered|murmured|shouted|said again|told him|told her)';

function explicitSpeaker(before,after){
  const candidates=[];
  for(const [name,role] of Object.entries(speakers)){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const afterPattern=new RegExp(`^\\s*[,—-]?\\s*${escaped}\\s+${speechVerb}\\b`,'i');
    const afterReverse=new RegExp(`^\\s*[,—-]?\\s*${speechVerb}\\s+${escaped}\\b`,'i');
    const beforePattern=new RegExp(`${escaped}\\s+${speechVerb}\\s*[:,—-]?\\s*$`,'i');
    const beforeReverse=new RegExp(`${speechVerb}\\s+${escaped}\\s*[:,—-]?\\s*$`,'i');
    if(afterPattern.test(after)||afterReverse.test(after)||beforePattern.test(before)||beforeReverse.test(before))candidates.push({name,role});
  }
  return candidates.length===1?candidates[0]:null;
}

async function routeChapter(chapter){
const number=chapter.number;
const text=(await readFile(path.join(root,chapter.file),'utf8')).trimEnd();
const spans=[];
for(const match of text.matchAll(/“[\s\S]*?”/g)){
  const start=match.index,end=start+match[0].length;
  const before=text.slice(Math.max(0,start-180),start);
  const after=text.slice(end,end+180);
  const explicit=explicitSpeaker(before,after);
  spans.push({
    dialogue_id:`ch${String(number).padStart(2,'0')}-d${String(spans.length+1).padStart(4,'0')}`,
    chapter:number,
    start_offset:start,
    end_offset:end,
    text_exact:match[0],
    text_sha256:sha(match[0]),
    speaker:explicit?.role||null,
    speaker_display:explicit?.name||null,
    attribution_method:explicit?'explicit_named_tag':'unresolved',
    confidence:explicit?1:0,
    review_status:explicit?'batch_review_required':'manual_review_required',
    render_allowed:false
  });
}
const output={schema_version:1,chapter:number,chapter_title:chapter.title,chapter_sha256:chapter.sha256,policy:'No unresolved dialogue may fall back to narrator. render_allowed remains false until human approval.',counts:{dialogue_spans:spans.length,explicit_named:spans.filter(x=>x.attribution_method==='explicit_named_tag').length,unresolved:spans.filter(x=>x.attribution_method==='unresolved').length,approved:0},spans};
await mkdir(path.join(root,'routing'),{recursive:true});
await writeFile(path.join(root,'routing',`chapter-${String(number).padStart(2,'0')}-dialogue-review.json`),JSON.stringify(output,null,2)+'\n','utf8');
return output;
}

const chapters=all?manifest.chapters:[manifest.chapters.find(item=>item.number===requested)].filter(Boolean);
if(!chapters.length)throw new Error(`Unknown chapter ${requested}`);
const results=[];
for(const chapter of chapters)results.push(await routeChapter(chapter));
const summary={chapters:results.length,dialogue_spans:results.reduce((n,r)=>n+r.counts.dialogue_spans,0),explicit_named:results.reduce((n,r)=>n+r.counts.explicit_named,0),unresolved:results.reduce((n,r)=>n+r.counts.unresolved,0),approved:0};
if(all)await writeFile(path.join(root,'routing','routing-summary.json'),JSON.stringify({...summary,policy:'Only explicit named tags were proposed automatically. All attributions remain non-renderable until reviewed.',chapters_detail:results.map(r=>({chapter:r.chapter,title:r.chapter_title,...r.counts}))},null,2)+'\n','utf8');
console.log(JSON.stringify(summary,null,2));

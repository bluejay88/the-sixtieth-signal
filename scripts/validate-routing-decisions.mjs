import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';

const decisionPath=process.argv.find(value=>!value.startsWith('--')&&value.endsWith('.json'));
const allowPartial=process.argv.includes('--allow-partial');
const validateOnly=process.argv.includes('--validate-only');
if(!decisionPath)throw new Error('Usage: node scripts/validate-routing-decisions.mjs <decisions.json> [--allow-partial] [--validate-only]');
const decisions=JSON.parse(await readFile(decisionPath,'utf8'));
const root=path.resolve('audiobook');
const chapter=Number(decisions.chapter);
const source=JSON.parse(await readFile(path.join(root,'routing',`chapter-${String(chapter).padStart(2,'0')}-dialogue-review.json`),'utf8'));
if(decisions.schema_version!==1)throw new Error('Unsupported decision schema');
if(decisions.chapter_sha256!==source.chapter_sha256)throw new Error('Chapter hash mismatch: decisions are stale or target the wrong source');
if(!Array.isArray(decisions.decisions))throw new Error('Decisions array missing');
const allowedRoles=new Set(['narrator','cassian','imani','nico','pike','loam','seren','shaal','nara','abena','mira','park','arendt','selene','avel','vaziri','sol','quispe','support_female_science','support_female_official','support_female_civic','support_male_science','support_male_civic','iru_shai_ensemble','unresolved']);
const sourceById=new Map(source.spans.map(span=>[span.dialogue_id,span]));
const seen=new Set();
for(const decision of decisions.decisions){
  if(seen.has(decision.dialogue_id))throw new Error(`Duplicate decision ${decision.dialogue_id}`);
  seen.add(decision.dialogue_id);
  const span=sourceById.get(decision.dialogue_id);
  if(!span)throw new Error(`Unknown dialogue ID ${decision.dialogue_id}`);
  if(decision.text_sha256!==span.text_sha256)throw new Error(`Text hash mismatch for ${decision.dialogue_id}`);
  if(!allowedRoles.has(decision.speaker))throw new Error(`Unknown speaker ${decision.speaker}`);
  if(!['approved','manual_review_required'].includes(decision.review_status))throw new Error(`Invalid review status for ${decision.dialogue_id}`);
  if(!Number.isFinite(Number(decision.confidence))||Number(decision.confidence)<0||Number(decision.confidence)>1)throw new Error(`Invalid confidence for ${decision.dialogue_id}`);
  if(decision.review_status==='approved'&&decision.speaker==='unresolved')throw new Error(`Approved decision cannot be unresolved: ${decision.dialogue_id}`);
}
const missing=source.spans.filter(span=>!seen.has(span.dialogue_id)).map(span=>span.dialogue_id);
if(missing.length&&!allowPartial)throw new Error(`Incomplete chapter review: ${missing.length} decisions missing`);
const approved=decisions.decisions.filter(decision=>decision.review_status==='approved');
const unresolved=decisions.decisions.filter(decision=>decision.review_status!=='approved'||decision.speaker==='unresolved');
const result={schema_version:1,chapter,chapter_sha256:source.chapter_sha256,source_spans:source.spans.length,submitted_decisions:decisions.decisions.length,approved:approved.length,unresolved:unresolved.length,missing:missing.length,complete:missing.length===0&&unresolved.length===0,render_allowed:missing.length===0&&unresolved.length===0,validated_at:new Date().toISOString(),decisions:decisions.decisions};
if(!validateOnly){
  await mkdir(path.join(root,'routing','validated'),{recursive:true});
  await writeFile(path.join(root,'routing','validated',`chapter-${String(chapter).padStart(2,'0')}-validated.json`),JSON.stringify(result,null,2)+'\n','utf8');
}
console.log(JSON.stringify({...result,decisions:undefined},null,2));

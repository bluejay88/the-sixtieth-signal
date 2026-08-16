import {access,readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('audiobook');
const json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const [manifest,cast,support,lexicon,signals,routing]=await Promise.all([
  json('production-manifest.json'),json('voice-cast.json'),json('supporting-cast-plan.json'),
  json('pronunciation-lexicon.json'),json('signal-layer-manifest.json'),json('routing/routing-summary.json')
]);

const expected=[];
for(const chapter of manifest.chapters){
  for(const segment of chapter.segments){
    expected.push({chapter:chapter.number,segment:segment.index,file:path.join(root,'audio',`chapter-${String(chapter.number).padStart(2,'0')}`,`segment-${String(segment.index).padStart(3,'0')}.mp3`)});
  }
}

const present=[];
const missing=[];
for(const item of expected){
  try{
    await access(item.file);
    const info=await stat(item.file);
    if(info.size<1024)missing.push({...item,reason:'empty_or_truncated'});
    else present.push({...item,bytes:info.size,sha256:createHash('sha256').update(await readFile(item.file)).digest('hex')});
  }catch{missing.push({...item,reason:'missing'});}
}

const masters=[];
for(const chapter of manifest.chapters){
  const file=path.join(root,'masters',`chapter-${String(chapter.number).padStart(2,'0')}.mp3`);
  try{const info=await stat(file);if(info.size>=1024)masters.push({chapter:chapter.number,file,bytes:info.size});}catch{}
}

const voiceIdsMissing=Object.values(cast.roles).filter(role=>!role.voice_id).map(role=>role.role);
const pronunciationsPending=lexicon.entries.filter(entry=>entry.status!=='approved').map(entry=>entry.term);
const checks={
  locked_text_verified:manifest.text_integrity_verified===true&&manifest.total_words===100008&&manifest.chapter_count===50,
  all_source_segments_present:expected.length===209,
  all_segment_audio_present:present.length===expected.length,
  all_chapter_masters_present:masters.length===50,
  principal_voices_assigned:voiceIdsMissing.length===0,
  supporting_cast_approved:support.status==='approved',
  pronunciations_approved:pronunciationsPending.length===0,
  signal_layer_complete:signals.counts?.signals===360&&signals.counts?.seren_payloads===120&&signals.counts?.loam_payloads===60&&signals.counts?.gates===6&&signals.signals?.every(signal=>signal.paragraph_anchor_verified===true),
  signal_audio_treatment_approved:['approved','excluded_from_retail_master'].includes(signals.audio_treatment_status??signals.status),
  dialogue_routing_complete:routing.dialogue_spans===5291&&routing.unresolved===0&&routing.approved===routing.dialogue_spans
};
const failed=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
const report={
  schema_version:1,
  complete:failed.length===0,
  completion_percent:Number(((Object.keys(checks).length-failed.length)/Object.keys(checks).length*100).toFixed(1)),
  checks,
  inventory:{chapters:manifest.chapter_count,source_words:manifest.total_words,expected_segments:expected.length,audio_segments_present:present.length,chapter_masters_present:masters.length},
  blockers:{failed_checks:failed,missing_principal_voice_ids:voiceIdsMissing,pending_pronunciations:pronunciationsPending,unresolved_dialogue_spans:routing.unresolved,missing_audio_segments:missing.length},
  evidence:{source_sha256:manifest.source_sha256,audio_checksums:present.map(({chapter,segment,bytes,sha256})=>({chapter,segment,bytes,sha256}))},
  audited_at:new Date().toISOString()
};
console.log(JSON.stringify(report,null,2));
if(!report.complete)process.exitCode=1;

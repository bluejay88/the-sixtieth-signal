import {readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('audiobook');
const [cast,support,lexicon,manifest,signals]=await Promise.all([
  readFile(path.join(root,'voice-cast.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'supporting-cast-plan.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'pronunciation-lexicon.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'production-manifest.json'),'utf8').then(JSON.parse),
  readFile(path.join(root,'signal-layer-manifest.json'),'utf8').then(JSON.parse)
]);
const missingPrincipalVoices=Object.values(cast.roles).filter(role=>!role.voice_id).map(role=>role.role);
const pendingPronunciations=lexicon.entries.filter(entry=>entry.status!=='approved').map(entry=>entry.term);
const supportingCastingPending=support.status!=='approved';
const signalTreatmentPending=!['approved','excluded_from_retail_master'].includes(signals.audio_treatment_status);
const blockers=[];
if(missingPrincipalVoices.length)blockers.push(`${missingPrincipalVoices.length} principal voice IDs missing`);
if(supportingCastingPending)blockers.push('supporting cast is not approved');
if(pendingPronunciations.length)blockers.push(`${pendingPronunciations.length} pronunciations pending`);
if(signalTreatmentPending)blockers.push('signal-layer audio treatment is not approved');
const report={schema_version:1,manuscript_verified:manifest.text_integrity_verified===true,chapters:manifest.chapters.length,segments:manifest.chapters.reduce((sum,chapter)=>sum+chapter.segments.length,0),principal_roles:Object.keys(cast.roles).length,missing_principal_voice_ids:missingPrincipalVoices,supporting_cast_status:support.status,pending_pronunciations:pendingPronunciations,signal_layer_audio_treatment_status:signals.audio_treatment_status??'not_defined',audition_ready:blockers.length===0,blockers};
console.log(JSON.stringify(report,null,2));
if(!process.argv.includes('--report-only')&&blockers.length)process.exitCode=1;

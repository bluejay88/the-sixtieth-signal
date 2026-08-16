import {access,readFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('podcast');
const manifest=JSON.parse(await readFile(path.join(root,'season-01-manifest.json'),'utf8'));
const expected=[
  [0,'signal-before-story','PRE-READ','premise-only'],
  [1,'count','S060 COUNT','through Chapter 8'],
  [2,'compare','S120 COMPARE','through Chapter 17'],
  [3,'turn','S180 TURN','through Chapter 25'],
  [4,'overlay','S240 OVERLAY','through Chapter 33'],
  [5,'witness','S300 WITNESS','through Chapter 42'],
  [6,'return','S360 RETURN','full book']
];
if(manifest.schema_version!==1)throw new Error('Unsupported podcast manifest schema');
if(manifest.canonical_status!=='non-canonical companion commentary')throw new Error('Canonical separation label is missing');
if(manifest.episodes.length!==expected.length)throw new Error(`Expected ${expected.length} episodes`);
const files=[];
for(const [index,[number,slug,milestone,scope]] of expected.entries()){
  const episode=manifest.episodes[index];
  if(episode.number!==number||episode.slug!==slug)throw new Error(`Episode sequence mismatch at index ${index}`);
  if(episode.milestone!==milestone)throw new Error(`Milestone mismatch for episode ${number}`);
  if(episode.spoiler_scope!==scope)throw new Error(`Spoiler scope mismatch for episode ${number}`);
  if(!['outline_required','outline_draft','script_draft','approved','published'].includes(episode.status))throw new Error(`Invalid status for episode ${number}`);
  if(episode.status==='script_draft')files.push(`episode-${String(number).padStart(2,'0')}-${slug}.md`);
  if(episode.status==='outline_draft')files.push(`episode-${String(number).padStart(2,'0')}-${slug}-outline.md`);
}
for(const file of files)await access(path.join(root,file));
console.log(JSON.stringify({valid:true,episodes:manifest.episodes.length,draft_files_verified:files,canonical_status:manifest.canonical_status,publication_status:manifest.publication_status},null,2));

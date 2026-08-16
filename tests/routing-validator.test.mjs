import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const project=process.cwd();
const validator=path.join(project,'scripts','validate-routing-decisions.mjs');
const source=JSON.parse(await readFile(path.join(project,'audiobook','routing','chapter-01-dialogue-review.json'),'utf8'));

function run(file,...args){
  return spawnSync(process.execPath,[validator,file,...args],{cwd:project,encoding:'utf8'});
}

async function fixture(mutator){
  const directory=await mkdtemp(path.join(tmpdir(),'signal-routing-'));
  const span=source.spans[0];
  const payload={
    schema_version:1,
    chapter:1,
    chapter_sha256:source.chapter_sha256,
    decisions:[{
      dialogue_id:span.dialogue_id,
      text_sha256:span.text_sha256,
      speaker:'cassian',
      confidence:1,
      review_status:'approved',
      notes:''
    }]
  };
  mutator?.(payload);
  const file=path.join(directory,'decisions.json');
  await writeFile(file,JSON.stringify(payload),'utf8');
  return {directory,file};
}

test('partial decisions validate but never become renderable',async()=>{
  const {directory,file}=await fixture();
  try{
    const result=run(file,'--allow-partial','--validate-only');
    assert.equal(result.status,0,result.stderr);
    const output=JSON.parse(result.stdout);
    assert.equal(output.missing,source.spans.length-1);
    assert.equal(output.complete,false);
    assert.equal(output.render_allowed,false);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('incomplete decisions fail the complete-review gate',async()=>{
  const {directory,file}=await fixture();
  try{
    const result=run(file,'--validate-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Incomplete chapter review/);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('altered dialogue hashes are rejected',async()=>{
  const {directory,file}=await fixture(payload=>{payload.decisions[0].text_sha256='0'.repeat(64);});
  try{
    const result=run(file,'--allow-partial','--validate-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Text hash mismatch/);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('unresolved dialogue cannot be approved',async()=>{
  const {directory,file}=await fixture(payload=>{payload.decisions[0].speaker='unresolved';});
  try{
    const result=run(file,'--allow-partial','--validate-only');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Approved decision cannot be unresolved/);
  }finally{await rm(directory,{recursive:true,force:true});}
});

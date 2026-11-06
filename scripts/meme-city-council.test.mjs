import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isEligibleRepository,scoreRepository,selectRepositories,fingerprint,relatedPRs,formatRoleComment}
 from './meme-city-council-lib.mjs';

const catalog=JSON.parse(readFileSync(new URL('../docs/DEVELOPMENT_COUNCIL.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-06T10:00:00Z');
const mock=(name,{license='MIT',stars=100,pushed='2026-10-31T00:00:00Z',archived=false}={})=>({
 full_name:name,html_url:'https://github.com/'+name,license:{spdx_id:license},
 stargazers_count:stars,pushed_at:pushed,archived,disabled:false,fork:false,
 description:'3D voxel game module',open_issues_count:12
});

test('council contains exactly fifteen unique issue-owned roles, GitHub queries and dependency scopes',()=>{
 assert.equal(catalog.repository,'kaibuzz0/Offensive-meme-launch-pad');
 assert.equal(catalog.roles.length,15);
 assert.deepEqual(catalog.roles.map(x=>x.issue),Array.from({length:15},(_,i)=>i+43));
 assert.equal(new Set(catalog.roles.map(x=>x.slug)).size,15);
 const numbers=new Set(catalog.roles.map(x=>x.issue));
 for(const r of catalog.roles){
  assert.ok(r.search.length>8&&r.owner.length>5);
  assert.ok(['P0','P1','P2'].includes(r.priority));
  assert.ok(r.dependsOn.every(x=>numbers.has(x)&&x!==r.issue));
 }
 assert.ok(catalog.roles.find(x=>x.slug==='melee'));
 assert.ok(catalog.roles.find(x=>x.slug==='drones'));
 assert.ok(catalog.roles.find(x=>x.slug==='wildlife'));
});

test('security: disallow unknown license, archiving, forks and unsafe links before suggesting imports',()=>{
 assert.equal(isEligibleRepository(mock('good/lib')),true);
 assert.equal(isEligibleRepository(mock('copyleft/lib',{license:'GPL-3.0'})),false);
 assert.equal(isEligibleRepository(mock('unlicensed/lib',{license:'NOASSERTION'})),false);
 assert.equal(isEligibleRepository(mock('archived/lib',{archived:true})),false);
 assert.equal(isEligibleRepository({...mock('good/lib'),html_url:'http://example.com/hijack'}),false);
 assert.equal(isEligibleRepository({...mock('good/lib'),fork:true}),false);
});

test('repository ranking prefers active, well-maintained candidates and deduplicated top suggestions',()=>{
 const repos=[mock('recent/a',{stars:1200}),mock('stale/b',{stars:1000,pushed:'2017-01-01T00:00:00Z'}),
  mock('fresh/c',{stars:900}),mock('bad/license',{license:'GPL-3.0',stars:99999})];
 const selected=selectRepositories(repos,now,2);
 assert.equal(selected.length,2);
 assert.ok(selected.every(x=>x.license.spdx_id==='MIT'));
 assert.ok(scoreRepository(repos[0],now)>scoreRepository(repos[1],now));
 assert.equal(scoreRepository(repos[3],now),-Infinity);
});

test('research comments are traceable, sanitized and do not claim automatic coding',()=>{
 const role=catalog.roles.find(x=>x.slug==='graphics'),repo=mock('source/test');
 const fp=fingerprint(['graphics','source/test']);
 const result=formatRoleComment(role,[repo],[],fp);
 assert.match(result,/meme-city-council:role=graphics/);
 assert.match(result,/source\/test/);
 assert.match(result,/NOT imported a dependency/);
 assert.match(result,/never auto-merge/);
 assert.ok(result.length<5000);
 assert.equal(fingerprint(['graphics','source/test']),fp);
 assert.notEqual(fingerprint(['graphics','source/test','changed']),fp);
});

test('pull request grouping is scoped by task issue or branch, never globally broadcast',()=>{
 const graphics=catalog.roles.find(x=>x.slug==='graphics');
 const prs=[{number:10,title:'Fix terrain graphics',head:{ref:'agent/graphics-shadows',sha:'123'},html_url:'https://github.com/a/b/pull/10'},
  {number:11,title:'Update melee',head:{ref:'agent/melee',sha:'234'},html_url:'https://github.com/a/b/pull/11'},
  {number:12,title:'Unrelated change',body:'Closes #46',head:{ref:'fix',sha:'345'},html_url:'https://github.com/a/b/pull/12'}];
 const out=relatedPRs(graphics,prs);
 assert.deepEqual(out.map(x=>x.number),[10,12]);
});

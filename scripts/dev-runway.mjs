/**
 * Meme City development runway: quick, dependency-free test scopes.
 *
 * Run a focused scope while editing; run "full" before release.
 * This script does not change the game, its save data or GitHub CI.
 */
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const testFiles=readdirSync(resolve(root,'scripts'))
 .filter(name=>name.endsWith('.test.mjs')).sort()
 .map(name=>'scripts/'+name);
const scopes=Object.freeze({
 graphics:/graphics|avatar|visual|camera|render/i,
 world:/world|biome|frontier|mining|mine|terrain|map|nav|district/i,
 systems:/core|server|room|multiplayer|combat|civilians|zombies|npc|survival|save|wallet|holdings|economy|quarantine|territory|clans/i
});
const usage=`Meme City development runway
Usage: node scripts/dev-runway.mjs <graphics|world|systems|all|full|--list|--help>

  graphics   Fast graphics/character unit tests
  world      Fast biomes, mining, navigation and world tests
  systems    Fast gameplay, server, saves and economy tests
  all        Complete Node tests and static integrity check
  full       'all' plus simulation benchmark and actual Chromium browser QA

Work in coherent batches; use a focused scope while coding, and full CI only
on the pushed review candidate. Passing a focused scope is not release approval.
`;
const choice=process.argv[2]||'--help';
if(process.argv.length>3||(!Object.hasOwn(scopes,choice)&&!['all','full','--list','--help'].includes(choice))){
 console.error(usage);
 process.exitCode=2;
}else if(choice==='--help'){
 console.log(usage);
}else if(choice==='--list'){
 console.log('Meme City test scopes (determined from existing test filenames):');
 for(const [name,pattern] of Object.entries(scopes)){
  const files=testFiles.filter(file=>pattern.test(file));
  console.log(name+': '+files.length+' test files'+(files.length?' — '+files.join(', '):''));
 }
 console.log('all/full: '+testFiles.length+' test files');
}else{
 const run=(name,args)=>{
  console.log('\n>>> '+name+'\n');
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
  if(result.error){console.error(result.error.message);process.exit(1);}
  if(result.status!==0)process.exit(result.status||1);
 };
 if(choice==='all'||choice==='full'){
  run('All Node regression tests',['--test',...testFiles]);
  run('Static integrity and asset version checks',['scripts/check.mjs']);
  if(choice==='full'){
   run('Deterministic multiplayer benchmark',['scripts/city-benchmark.mjs']);
   run('Real Chromium mobile-size browser acceptance',['scripts/city-avatar-browser-smoke.mjs']);
  }
 }else{
  const files=testFiles.filter(file=>scopes[choice].test(file));
  if(!files.length){console.error('No tests matched scope '+choice);process.exitCode=2;}
  else run('Fast '+choice+' tests ('+files.length+' files)',['--test',...files]);
 }
}

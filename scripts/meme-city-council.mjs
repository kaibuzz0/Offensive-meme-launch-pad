/* Scheduled 15-workstream research/triage council.
 * One lightweight GitHub Actions run handles 15 separate, issue-owned tasks.
 * No model endpoint is configured: this does NOT implement or merge game code.
 * No private tokens, PR content or untrusted code is executed.
 */
import {readFile,appendFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {selectRepositories,fingerprint,relatedPRs,formatRoleComment,short} from './meme-city-council-lib.mjs';

const manifest=JSON.parse(await readFile(new URL('../docs/DEVELOPMENT_COUNCIL.json',import.meta.url),'utf8'));
const token=process.env.GITHUB_TOKEN;
const repository=process.env.GITHUB_REPOSITORY||manifest.repository;
if(!token)throw Error('GITHUB_TOKEN required by GitHub Actions');
if(repository!==manifest.repository)throw Error('Repository identity mismatch');
if(manifest.roles?.length!==15||new Set(manifest.roles.map(r=>r.issue)).size!==15)
 throw Error('Expected 15 unique issue-owned development workstreams');
const base='https://api.github.com/repos/'+repository;
const headers={Accept:'application/vnd.github+json',
 Authorization:'Bearer '+token,
 'X-GitHub-Api-Version':'2022-11-28',
 'User-Agent':'meme-city-development-council'};
async function github(endpoint,{method='GET',body}={}){
 const response=await fetch(
  endpoint.startsWith('https://api.github.com/')?endpoint:base+endpoint,
  {method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})});
 const text=await response.text();
 if(!response.ok)throw Error('GitHub '+method+' '+response.status+': '+short(text,170));
 return text?JSON.parse(text):null;
}
const roles=manifest.roles;
const allIssues=await github('/issues?state=all&per_page=100');
const openPrs=await github('/pulls?state=open&per_page=100');
const issues=new Map(allIssues.filter(i=>!i.pull_request).map(i=>[i.number,i]));
const statuses=roles.map(role=>{
 const issue=issues.get(role.issue);
 const blockers=role.dependsOn.filter(n=>issues.get(n)?.state!=='closed');
 const prs=relatedPRs(role,openPrs);
 return {issue:role.issue,slug:role.slug,priority:role.priority,
  state:issue?.state||'unresolved',blockedBy:blockers,prCount:prs.length};
});
const currentSHA=(process.env.GITHUB_SHA||'').slice(0,12);
const outcomes=[];
for(const role of roles){
 const issue=issues.get(role.issue);
 if(!issue){outcomes.push({slug:role.slug,result:'issue-missing'});continue;}
 if(issue.state==='closed'){outcomes.push({slug:role.slug,result:'complete-closed'});continue;}
 try{
  // GitHub search is for candidate research only; the search text is a
  // constant from the reviewed default-branch manifest, never issue content.
  const q=role.search+' in:name,description archived:false fork:false stars:>20';
  const search=await github('https://api.github.com/search/repositories?q='+
   encodeURIComponent(q)+'&sort=stars&order=desc&per_page=15');
  const recommendations=selectRepositories(search.items).map(r=>({
   full_name:r.full_name,html_url:r.html_url,
   description:r.description,pushed_at:r.pushed_at,
   license:{spdx_id:r.license?.spdx_id},
   stargazers_count:r.stargazers_count
  }));
  const prs=relatedPRs(role,openPrs);
  const plan=role.slug==='roadmap'?statuses.filter(x=>x.state==='open')
   .sort((a,b)=>a.priority.localeCompare(b.priority)||a.blockedBy.length-b.blockedBy.length)
   .map(x=>[x.slug,x.priority,x.blockedBy,x.prCount]):null;
  const signature=fingerprint({r:role.slug,
   top:recommendations.map(r=>r.full_name),prs:prs.map(p=>[p.number,p.head]),
   ...(plan?{plan}:{}),
  });
  const comments=await github('/issues/'+role.issue+'/comments?per_page=100');
  const tag='<!-- meme-city-council:role='+role.slug+';fingerprint='+signature+' -->';
  const latest=comments.filter(c=>typeof c.body==='string'&&
   c.body.includes('<!-- meme-city-council:role='+role.slug+';')).at(-1);
  if(latest?.body?.includes(tag)){
   outcomes.push({slug:role.slug,result:'unchanged',candidates:recommendations.length});continue;
  }
  let body=formatRoleComment(role,recommendations,prs,signature);
  if(plan){
   const ready=plan.filter(x=>!x[2].length&&!x[3]).slice(0,5);
   body+='\n\n### Roadmap retasking recommendations\n';
   if(ready.length)for(const [slug,priority] of ready)
    body+='- **'+priority+'** '+slug+' — first isolated, testable PR candidate; check issue acceptance criteria.\n';
   else body+='- All outstanding workstreams have blockers or active PRs; review integration dependencies.\n';
  }
  await github('/issues/'+role.issue+'/comments',{method:'POST',body:{body}});
  outcomes.push({slug:role.slug,result:'research-updated',candidates:recommendations.length});
 }catch(err){
  outcomes.push({slug:role.slug,result:'blocked',error:short(err.message,140)});
 }
}
const summary=[
 '# Meme City — 15-workstream development council',
 '',
 'Checked head: `'+currentSHA+'` · All findings require human/agent validation before dependency adoption.',
 '',
 '| Workstream | Tracking issue | Scan result |',
 '|---|---|---|',
 ...outcomes.map(x=>'| '+x.slug+' | [#'+roles.find(r=>r.slug===x.slug).issue+
  '](https://github.com/'+repository+'/issues/'+roles.find(r=>r.slug===x.slug).issue+
  ') | '+x.result+(x.error?' ('+x.error+')':'')+' |'),
 '',
 'Council does not merge PRs, install dependencies or autonomously write game features. Assign issues to a coding agent separately when available.',
 ''
].join('\n');
console.log(summary);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
const failures=outcomes.filter(x=>x.result==='blocked'||x.result==='issue-missing');
if(failures.length)process.exitCode=1;

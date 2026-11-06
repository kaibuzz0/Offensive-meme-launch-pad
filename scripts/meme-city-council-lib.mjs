/* Pure policy helpers for the 20-minute Meme City research council.
 * Never execute third-party source or trust repository descriptions as code.
 */
import {createHash} from 'node:crypto';

export const ALLOWED_LICENSES=Object.freeze(new Set([
 'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','Zlib','Unlicense','CC0-1.0'
]));
export function isEligibleRepository(repo){
 return !!repo&&typeof repo.full_name==='string'&&
  /^[\w.-]+\/[\w.-]+$/.test(repo.full_name)&&
  repo.archived!==true&&repo.disabled!==true&&repo.fork!==true&&
  /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repo.html_url||'')&&
  ALLOWED_LICENSES.has(repo.license?.spdx_id||'');
}
export function scoreRepository(repo,nowMs=Date.now()){
 if(!isEligibleRepository(repo))return -Infinity;
 const age=Math.max(0,nowMs-Date.parse(repo.pushed_at||'1970-01-01'));
 const year=365.25*86400000;
 const recency=age<.5*year?4:age<year?2:age<2*year?0:-8;
 return Math.log1p(repo.stargazers_count||0)*2+recency+
  Math.min(2,Math.log1p(repo.open_issues_count||0)/7);
}
export function selectRepositories(items,nowMs=Date.now(),limit=3){
 return (Array.isArray(items)?items:[])
  .filter(isEligibleRepository)
  .sort((a,b)=>scoreRepository(b,nowMs)-scoreRepository(a,nowMs)||
   a.full_name.localeCompare(b.full_name))
  .slice(0,limit);
}
export function fingerprint(value){
 return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16);
}
export function relatedPRs(role,prs){
 const key=role.slug.replace(/-/g,'[ -]?');
 const regex=new RegExp(key,'i');
 return (Array.isArray(prs)?prs:[]).filter(pr=>
  regex.test((pr.title||'')+' '+(pr.head?.ref||''))||
  (pr.body||'').includes('#'+role.issue)
 ).slice(0,8).map(pr=>({number:pr.number,title:(pr.title||'').slice(0,140),
 url:pr.html_url,head:pr.head?.sha}));
}
export function short(text,max=150){
 return String(text||'').replace(/[\r\n\t]+/g,' ').replace(/[|<>\[\]`]/g,'').slice(0,max).trim();
}
export function formatRoleComment(role,repos,prs,marker){
 const lines=[
 `<!-- meme-city-council:role=${role.slug};fingerprint=${marker} -->`,
 `### Automated research update — ${role.name}`,
 '**Scope:** research and triage only. This report has NOT imported a dependency, changed the game, assigned Copilot, or implemented code.',
 '',
 'GitHub repository candidates (automatically ranked; licenses are repository-reported and **must be verified** against their actual LICENSE and dependencies before use):'
 ];
 if(!repos.length)lines.push('- No compatible, unarchived candidate found in this scan.');
 for(const repo of repos){
  lines.push(`- [${repo.full_name}](${repo.html_url}) — ${short(repo.description,120)||'No description'}; ${repo.license.spdx_id}; ${Number(repo.stargazers_count||0)} stars; last push ${short(repo.pushed_at,10)}.`);
 }
 lines.push('',`**Suggested next assignment:** Assess the top relevant candidate in an isolated spike; preserve \`${role.owner}\` ownership and the existing seeded world. Add repeatable tests and a reviewable PR; never auto-merge.`);
 if(prs.length){
  lines.push('', '**Related open pull requests:**');
  for(const p of prs)lines.push(`- [#${p.number}](${p.url}) — ${short(p.title)}`);
 }
 lines.push('','_Machine-curated library leads, not a human or AI code-review approval._');
 return lines.join('\n');
}

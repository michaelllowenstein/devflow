import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { assertRelative, inside, isSecret, MAX_OUTPUT_BYTES, MAX_RESULTS, readSafe } from './security.js';
const exec = promisify(execFile);
export type Workspace = { root:string };
export async function workspaceFromEnv(env = process.env): Promise<Workspace> {
  if (!env.WORKSPACE_ROOT) throw new Error('WORKSPACE_ROOT is required');
  return {root:await realpath(env.WORKSPACE_ROOT)};
}
export async function git(ws:Workspace, argv:string[]):Promise<string> {
  const {stdout}=await exec('git',['-C',ws.root,'--no-pager',...argv],{
    timeout:8000,maxBuffer:MAX_OUTPUT_BYTES,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1'}
  });
  return stdout.trim();
}
export async function gitStatus(ws:Workspace){
  const [root,branch,status] = await Promise.all([
    git(ws,['rev-parse','--show-toplevel']),git(ws,['branch','--show-current']),git(ws,['status','--short','--untracked-files=normal'])
  ]);
  if (await realpath(root) !== ws.root) throw new Error('Configured workspace must be Git repository root');
  return {branch,status};
}
export async function gitDiff(ws:Workspace, staged:boolean){
  await gitStatus(ws);
  return {staged,diff:await git(ws,['diff',...(staged?['--cached']:[]),'--no-ext-diff','--no-textconv','--unified=3','--','.',':(exclude)**/.env*',':(exclude)**/*.pem',':(exclude)**/*.key'])};
}
export async function listFiles(ws:Workspace, max=100){
  const results:string[]=[]; const queue=[{dir:ws.root,depth:0}];
  while(queue.length && results.length<max){
    const {dir,depth}=queue.shift()!;
    const entries=await readdir(dir,{withFileTypes:true});
    entries.sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const full=path.join(dir,entry.name), rel=path.relative(ws.root,full);
      if(isSecret(rel)||['node_modules','dist','build','coverage','.next','.cache'].includes(entry.name)) continue;
      if(entry.isDirectory() && depth<5) queue.push({dir:full,depth:depth+1});
      else if(entry.isFile()){results.push(rel);if(results.length>=max)break;}
    }
  }
  return {files:results,truncated:queue.length>0||results.length===max};
}
export async function search(ws:Workspace, query:string, limit=30){
  if(!query||query.length>200||query.includes('\0')) throw new Error('Invalid query');
  const listing=await listFiles(ws, 2000);
  const results:{file:string;line:number;text:string}[]=[];
  for(const file of listing.files){
    if(results.length>=limit)break;
    try {
      const {content}=await readSafe(ws.root,file);
      for(const [i,line] of content.split(/\r?\n/).entries()){
        if(line.toLowerCase().includes(query.toLowerCase())){
          results.push({file,line:i+1,text:line.slice(0,300)});
          if(results.length>=limit)break;
        }
      }
    } catch { /* Binary, oversize, or non-regular files are skipped. */ }
  }
  return {query,matches:results,truncated:results.length>=limit||listing.truncated};
}
export async function manifest(ws:Workspace){
  let pkg:unknown=null;
  try {const {content}=await readSafe(ws.root,'package.json');pkg=JSON.parse(content);} catch {}
  const listing=await listFiles(ws,100);
  return {root:ws.root,package:pkg,files:listing.files,truncated:listing.truncated};
}
export async function testCommands(ws:Workspace){
  try{
    const {content}=await readSafe(ws.root,'package.json');
    const pkg=JSON.parse(content) as {scripts?:Record<string,string>};
    const allowed=['test','lint','typecheck','build'];
    return {available:allowed.filter(k=>typeof pkg.scripts?.[k]==='string').map(name=>({name,script:pkg.scripts![name]}))};
  }catch{return {available:[]};}
}
export async function runCheck(ws:Workspace, name:'test'|'lint'|'typecheck'|'build'){
  const checks=await testCommands(ws);
  if(!checks.available.some(c=>c.name===name)) throw new Error('Unconfigured quality check');
  // This tool is intentionally opt-in for the server process, because package scripts run code.
  if(process.env.DEVFLOW_ALLOW_CHECKS!=='1') throw new Error('Checks disabled: set DEVFLOW_ALLOW_CHECKS=1 after reviewing package scripts');
  try{
    const {stdout,stderr}=await exec('npm',['run',name],{cwd:ws.root,timeout:60000,maxBuffer:MAX_OUTPUT_BYTES,encoding:'utf8',env:{...process.env,CI:'1'}});
    return {check:name,ok:true,stdout,stderr};
  }catch(e){
    const error=e as Error & {stdout?:string;stderr?:string;code?:number};
    return {check:name,ok:false,stdout:error.stdout??'',stderr:error.stderr??'',exitCode:error.code??null};
  }
}

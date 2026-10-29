import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const cli=path.resolve('dist/client.js');
test('stdio handshake, discovery and git status',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'devflow-int-'));
 try{
  execFileSync('git',['init','-q',root]);
  await writeFile(path.join(root,'README.md'),'hello\n');
  const env={...process.env,WORKSPACE_ROOT:root};
  const tools=spawnSync(process.execPath,[cli,'tools'],{env,encoding:'utf8',timeout:15000});
  assert.equal(tools.status,0,tools.stderr);
  assert.ok(JSON.parse(tools.stdout).some(t=>t.name==='repo_read'));
  const result=spawnSync(process.execPath,[cli,'call','git_status','{}'],{env,encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/README.md/);
 }finally{await rm(root,{recursive:true,force:true});}
});

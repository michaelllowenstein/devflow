import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assertRelative,readSafe} from '../dist/security.js';
import {listFiles,search,testCommands} from '../dist/operations.js';
test('reject traversal, secrets and absolute paths',()=>{
  for(const f of ['../x','/etc/passwd','.env','src/.env.local','.git/config','.ssh/id_rsa','secrets.zsh'])assert.throws(()=>assertRelative(f));
  assert.equal(assertRelative('src/index.ts'),path.join('src','index.ts'));
});
test('workspace read, symlink escape, secret filtering and search',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'devflow-'));
 try{
  await mkdir(path.join(root,'src'));
  await writeFile(path.join(root,'src','index.ts'),'hello world\nsecond line\n');
  await writeFile(path.join(root,'.env'),'SUPER_SECRET=x');
  await symlink('/etc/passwd',path.join(root,'outside'));
  assert.match((await readSafe(root,'src/index.ts')).content,/hello world/);
  await assert.rejects(()=>readSafe(root,'outside'));
  await assert.rejects(()=>readSafe(root,'.env'));
  assert.deepEqual((await search({root},'hello')).matches.map(m=>m.line),[1]);
  assert.ok(!(await listFiles({root})).files.includes('.env'));
  assert.deepEqual((await testCommands({root})).available,[]);
 }finally{await rm(root,{recursive:true,force:true});}
});

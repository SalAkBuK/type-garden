import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const v2=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),film=path.dirname(v2),root=path.dirname(film);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function snapshot(){
  const files={};
  const visit=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(f===v2)continue;if(e.isDirectory())visit(f);else{const rel=path.relative(film,f).replaceAll('\\','/'),st=fs.statSync(f);files[rel]={bytes:st.size,mtimeMs:st.mtimeMs,...(!rel.startsWith('cache/')&&!rel.startsWith('node_modules/')?{sha256:hash(f)}:{})};}}};
  visit(film);return {application:hash(path.join(root,'index.html')),files};
}
const baseline=path.join(v2,'v1-preservation.json');
if(process.argv[2]==='snapshot'){
  if(fs.existsSync(baseline))throw Error('Baseline exists; do not replace it.');
  const s=snapshot();fs.writeFileSync(baseline,JSON.stringify(s,null,2));console.log('Preservation baseline:',Object.keys(s.files).length,'Version 1 files');
}else{
  const before=JSON.parse(fs.readFileSync(baseline)),now=snapshot(),changed=[];
  for(const [name,st]of Object.entries(before.files))if(JSON.stringify(now.files[name])!==JSON.stringify(st))changed.push(name);
  for(const name of Object.keys(now.files))if(!before.files[name])changed.push(`added outside v2: ${name}`);
  if(before.application!==now.application)changed.push('application index.html');
  fs.writeFileSync(path.join(v2,'preservation-check.json'),JSON.stringify({pass:changed.length===0,checkedFiles:Object.keys(before.files).length,changed},null,2));
  console.log({pass:!changed.length,changed});if(changed.length)process.exitCode=1;
}

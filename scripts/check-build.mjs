import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist');let bytes=0;const files=[];
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())await scan(p);else{bytes+=(await stat(p)).size;files.push(p.slice(root.length+1));}}}await scan(root);
assert(bytes<20*1024*1024);assert(!files.some(p=>/\.zip$|\.unitypackage$|Generation_Records|Source\/|generated\//.test(p)));
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.css':'text/css'};const results=[];
for(const prefix of ['/','/pyquest/']){
 const server=createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!path.startsWith(prefix)){res.writeHead(404).end();return;}const p=resolve(root,path.slice(prefix.length)||'index.html');if(!p.startsWith(root+sep)&&p!==root){res.writeHead(403).end();return;}try{res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'}).end(await readFile(p));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch();try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const failures=[];page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
 await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.fulfill({status:200,body:''}));
 await page.goto(base+prefix);await page.locator('#btn-start').click();await page.waitForFunction(()=>!!window.__PYQUEST__?.active()?.player);
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>window.__PYQUEST__.active().npc.sprite.texture.key),'npc_elder');
 results.push({prefix,errors,failures});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
await mkdir('test-results',{recursive:true});await writeFile('test-results/build.json',JSON.stringify({bytes,files:files.length,deployments:results},null,2));console.log(JSON.stringify({bytes,files:files.length,deployments:results}));

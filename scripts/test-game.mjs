import {createServer} from 'vite';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {regression} from './regression.mjs';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}/`;
async function run(file){await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{env:{...process.env,BASE_URL:base},stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);p.on('error',reject);p.on('close',async code=>{await writeFile(`test-results/${file.split('/').at(-1)}.log`,log);if(code)reject(Error(file+' failed\n'+log.slice(-4000)));else{console.log(file+' passed');resolve();}});});}
try{await mkdir('test-results',{recursive:true});await regression(base);if(!process.argv.includes('--regression-only'))for(let n=1;n<=8;n++)await run(n===1?'scripts/e2e.mjs':`scripts/e2e-ch${n}.mjs`);}finally{await server.close();}

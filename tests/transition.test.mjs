import test from 'node:test';import assert from 'node:assert/strict';
import {wipeTransition,transitionRunning} from '../src/ui/wipe.js';
test('busy requests do not execute and lock is restored after completion',async()=>{
 globalThis.document={getElementById:()=>({style:{},offsetWidth:1})};let calls=0;
 assert.equal(wipeTransition(()=>calls++,{closeMs:0,openMs:0}),true);
 assert.equal(wipeTransition(()=>calls++),false);
 await new Promise(r=>setTimeout(r,70));assert.equal(calls,1);assert.equal(transitionRunning(),false);
});
test('synchronous callbacks always release lock even on error',()=>{
 document.getElementById=()=>null;
 assert.throws(()=>wipeTransition(()=>{throw Error('fixture');}),/fixture/);assert.equal(transitionRunning(),false);
});

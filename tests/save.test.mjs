import test from 'node:test';
import assert from 'node:assert/strict';
import {G,resetState} from '../src/core/state.js';
import {saveGame,loadGame,clearSave,beginNewGame,initAutosave} from '../src/core/save.js';
globalThis.document=new EventTarget();globalThis.window=new EventTarget();
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const key='pyquest:save:v2';
initAutosave();
test('title writes are gated and restart cannot restore previous progress',()=>{
 clearSave();data.set(key,'existing');window.dispatchEvent(new Event('beforeunload'));assert.equal(data.get(key),'existing');
 beginNewGame();G.current=4;G.progress[3].done=true;saveGame();assert.equal(JSON.parse(data.get(key)).current,4);
 clearSave();window.dispatchEvent(new Event('beforeunload'));assert.equal(data.has(key),false);
});
test('bad saves do not reset the active state or overwrite original data',()=>{
 clearSave();G.current=4;data.set(key,'{broken');assert.equal(loadGame(),false);assert.equal(G.current,4);assert.equal(data.get(key),'{broken');
 data.set(key,JSON.stringify({v:2,answered:7}));assert.equal(loadGame(),false);assert.equal(G.current,4);
});
test('v1 is retained if migration cannot persist v2',()=>{
 clearSave();localStorage.setItem('pyquest:save:v1',JSON.stringify({v:1,ch1Done:true}));
 const write=localStorage.setItem;localStorage.setItem=()=>{throw Error('full');};
 assert.equal(loadGame(),true);assert(data.has('pyquest:save:v1'));localStorage.setItem=write;clearSave();resetState();
});

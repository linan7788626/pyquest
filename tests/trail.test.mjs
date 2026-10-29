import test from 'node:test';import assert from 'node:assert/strict';
import {pointAlongTrail,recordTrail} from '../src/core/trail.js';
test('body spacing follows distance across frame rates and storage stays bounded',()=>{
 for(const fps of [30,60,120]) {
 const points=[{x:0,y:0},{x:-1500,y:0}];
 for(let i=1;i<=fps*5;i++) recordTrail(points,{x:350*i/fps,y:0},1500);
 for(let i=1;i<=6;i++) assert(Math.abs(pointAlongTrail(points,i*184).x-(1750-i*184))<.01);
 const count=points.length;for(let i=0;i<100;i++)recordTrail(points,points[0],1500);assert.equal(points.length,count);
 }
});

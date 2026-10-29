import test from 'node:test';
import assert from 'node:assert/strict';
import {highlight} from '../src/core/quiz.js';
test('quoted Python remains intact in generated markup',()=>{
 const html=highlight('print("7" + 3)');
 assert(!html.includes('class="<span'));
 assert.equal(html.replace(/<[^>]*>/g,''),'print("7" + 3)');
});

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TS_SHEETS, TS_IMAGES, TS_TILESETS } from '../../src/assets/ts.js';
export const runtimeDir = resolve('.cache/pyquest-public');
export async function prepareRuntimeAssets() {
  const paths = [...Object.values(TS_SHEETS).map(v=>v[0]), ...Object.values(TS_IMAGES), ...Object.values(TS_TILESETS)];
  const entries = paths.map(path=>({path, source:path==='NLI/NPC_Elder.png'
    ? resolve('assets/NLI_SoftFantasy_ARPG_v0.2/Assets/NLI_SoftFantasy_ARPG/Sprites/Characters/NPCs/NPC_Elder.png')
    : resolve('assets',path)}));
  const missing=[];
  for(const e of entries) { try { await stat(e.source); } catch { missing.push(e.source); } }
  if(missing.length) throw new Error('完整游戏测试/构建前置素材缺失：\n'+missing.join('\n'));
  await rm(runtimeDir,{recursive:true,force:true});
  for(const e of entries) { const dest=resolve(runtimeDir,e.path); await mkdir(resolve(dest,'..'),{recursive:true}); await cp(e.source,dest); }
}

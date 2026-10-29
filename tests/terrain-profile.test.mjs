import test from 'node:test';
import assert from 'node:assert/strict';
import { NLI_GROUND_RECIPE, NLI_TERRAIN_ASSETS, NLI_GROUND_PROFILES } from '../src/textures/nliGroundProfiles.js';
import { groundCacheKey } from '../src/textures/ground.js';

test('recipe constant is nli02-ground-v3', () => {
  assert.equal(NLI_GROUND_RECIPE, 'nli02-ground-v3');
});

test('NLI_TERRAIN_ASSETS maps exactly 7 run/ground assets', () => {
  assert.equal(Object.keys(NLI_TERRAIN_ASSETS).length, 7);
  assert.equal(NLI_TERRAIN_ASSETS.grass, 'run/ground/terrain_grass.png');
  assert.equal(NLI_TERRAIN_ASSETS.path, 'run/ground/terrain_path.png');
  assert.equal(NLI_TERRAIN_ASSETS.water, 'run/ground/terrain_water.png');
  assert.equal(NLI_TERRAIN_ASSETS.flower, 'run/ground/terrain_flower.png');
  assert.equal(NLI_TERRAIN_ASSETS.cliffS, 'run/ground/cliff_s_band.png');
  assert.equal(NLI_TERRAIN_ASSETS.cliffEW, 'run/ground/cliff_ew_strip.png');
  assert.equal(NLI_TERRAIN_ASSETS.cliffN, 'run/ground/cliff_n_lip.png');
});

test('Village profile is native; Forest/SciField/C4F/C7F stay non-native', () => {
  assert.equal(NLI_GROUND_PROFILES.Village.native, true);
  for (const key of ['Forest', 'SciField', 'C4F', 'C7F']) {
    assert.equal(NLI_GROUND_PROFILES[key].native, undefined, `${key} must not define native`);
  }
});

test('groundCacheKey embeds scene key and recipe v3 (revision defaults to stub)', () => {
  assert.equal(groundCacheKey({ key: 'Village' }), 'ground_Village_nli02-ground-v3_stub');
  assert.equal(groundCacheKey({ key: 'Forest' }, 'abcdef12'), 'ground_Forest_nli02-ground-v3_abcdef12');
});

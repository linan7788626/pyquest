// ============================================================
// 函数之森：第二章野外地图
// - 函数石碑（新手引导 NPC）
// - 3 块函数符文石（def / 参数 / return）→ 函数碎片
// - 深红史莱姆 + 猩红史莱姆
// - 北方「洞窟封印」：集齐 3 枚函数碎片后开启，通往列表洞窟
// ============================================================
import { G, updateHud } from '../core/state.js';
import { WorldScene } from './WorldScene.js';
import { buildForest } from '../data/maps.js';
import { sfx } from '../audio/sfx.js';

export default class ForestScene extends WorldScene {
  constructor() { super('Forest'); }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : 'fromVillage';
  }

  create() {
    this.mapDef = buildForest();
    super.create();
  }

  talkToElder() {
    if (!this.npc || this.npc.id !== 'tablet') return;
    let lines;
    if (G.ch2Done) {
      lines = [
        '巨蟒毕森被封印了……它的身体本来就是一条「列表」，你用列表的知识看穿了一切。',
        '森林恢复了平静。勇者，你已经成为真正的 Python 使用者了。',
      ];
    } else if (!G.ch2GateOpen && G.ch2Shards >= G.ch2ShardsNeeded) {
      lines = [
        `你已收集了 ${G.ch2Shards} 枚函数碎片！`,
        '北方的封印已经松动，去洞窟之门那里吧。',
        '洞窟深处盘踞着巨蟒毕森——先解开列表的谜题，再挑战它！',
      ];
    } else if (G.ch2Shards > 0) {
      lines = [
        `已经拿到 ${G.ch2Shards} / ${G.ch2ShardsNeeded} 枚函数碎片了，加油。`,
        '森林里的符文石在湖畔、东部林地和南边林间，仔细找找。',
      ];
    } else {
      lines = [
        '旅行者……我是函数之森的引导石碑。',
        '「函数」是可以反复念的咒语卷轴：用 def 定义它，用参数传递材料，用 return 回传宝物。',
        '森林里发光的符文石在等你。答对它们的问题，就能收集函数碎片。',
        `集齐 ${G.ch2ShardsNeeded} 枚碎片，北方的洞窟封印就会打开。那里……有什么东西在蠕动。`,
      ];
    }
    this.dialogue.say({ name: '函数石碑', lines });
  }

  /** 集齐函数碎片后，按 E 当场解开洞窟封印 */
  onDoorLocked(it) {
    if (G.ch2Shards >= G.ch2ShardsNeeded) {
      G.ch2GateOpen = true;
      sfx.openGate();
      it.locked = false;
      it.sprite.clearTint();
      if (it.body) it.body.body.enable = false;
      const aura = this.add.image(it.x, it.y - 20, 'particle')
        .setTint(0x3ddad7).setAlpha(0.16).setScale(6).setDepth(it.y - 2);
      this.tweens.add({ targets: aura, alpha: 0.3, scale: 7, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inout' });
      this.cameras.main.shake(240, 0.004);
      this.floatText(it.x, it.y + 26, '封印瓦解了！', '#3ddad7');
      updateHud();
    } else {
      this.dialogue.say({
        name: it.prop.label || '洞窟封印',
        lines: it.prop.lockLines,
      });
    }
  }
}

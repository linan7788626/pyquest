// ============================================================
// 诺瓦村庄：新手村，长老教学 + 三块符文石（变量 / 字符串）
// ============================================================
import { G } from '../core/state.js';
import { WorldScene } from './WorldScene.js';
import { buildVillage } from '../data/maps.js';

export default class VillageScene extends WorldScene {
  constructor() { super('Village'); }

  init(data) {
    this.spawnKey = data && data.spawn ? data.spawn : 'start';
  }

  create() {
    this.mapDef = buildVillage();
    super.create();
  }

  talkToElder() {
    let lines;
    if (G.ch2Done) {
      lines = [
        '函数、列表……连巨蟒毕森都被你封印了！',
        '变量、输出、条件、循环、函数、列表——你已经集齐了 Python 的六枚基础咒语。',
        '这片大陆会永远记得你，勇者。去村口晒晒太阳吧，你受之无愧！',
      ];
    } else if (G.ch1Done) {
      lines = [
        '恭喜你击败了循环史莱姆王！但冒险还没有结束。',
        '第二章的大门已经在村庄东边打开了——穿过森林传送门，进入「函数之森」。',
        '森林里的函数石碑会告诉你 def、参数和 return 的奥秘。',
        '小心那里的深红史莱姆，它们比猩红的同类更凶更快。',
      ];
    } else if (!G.gateOpen && G.shards >= G.shardsNeeded) {
      lines = [
        `你已经收集了 ${G.shards} 枚代码碎片！`,
        '去北边的石门那里吧，门会为你打开。',
        '地牢深处记得先读懂循环咒语，再挑战史莱姆王！',
      ];
    } else if (G.gateOpen && !G.bossDefeated) {
      lines = [
        '地牢就在北边。里面的符文石会教你 for 循环和条件判断。',
        '史莱姆王的紫色护盾，只有答对「循环」的谜题才能打破。',
        '记住：生命值见底时回村喘口气，被我打败的史莱姆还会再出现。',
      ];
    } else if (G.shards > 0) {
      lines = [
        `干得漂亮！已经拿到 ${G.shards} / ${G.shardsNeeded} 枚碎片了。`,
        '村庄里共有 5 块符文石，东边、池塘边和东北角还有没解读的。',
      ];
    } else {
      lines = [
        '欢迎来到诺瓦村庄，勇者！这片大陆的魔法，全靠「Python 咒语」驱动。',
        '用 方向键 / WASD 移动，按 J 或 空格 挥剑，靠近发光的东西按 E 互动。',
        '村庄里散落着 5 块符文石，答对它们提出的 Python 问题，就能获得代码碎片。',
        `集齐 ${G.shardsNeeded} 枚碎片，北边的石门就会打开。地牢深处住着循环史莱姆王……去吧！`,
      ];
    }
    this.dialogue.say({ name: '长老 賽璐', lines });
  }
}

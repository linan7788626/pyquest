// ============================================================
// Python 基础题库
// 每题包含：章节 chapter、难度 tier、说明、代码块（支持高亮）、
// 选项、正确项、讲解；fill: true 表示代码填空题
//
// 随机抽题机制（难度一致）：
// - POOLS：同难度题池，池内所有题目 tier 相同，对应同一批符文石
// - SLOT_POOL：符文槽 → 题池 的映射（地图里 rune 的 qid 即槽位 id）
// - pickQuestion(槽位)：从对应题池随机抽一题。同一块符文石在答对
//   之前始终显示同一道题；已答过的题不会再被抽到；同池的多块
//   符文石不会撞题。题池抽完时允许复用（兜底，正常流程不会触发）
// ============================================================

import { G } from '../core/state.js';

export const QUESTIONS = {
  // ============ 题池 village：村庄碎片符文（难度 1）============
  v1: {
    chapter: '第一章 · 变量',
    tier: 1,
    prompt: '旅人啊，"变量"就像魔法口袋：给名字，装东西。想用口袋「sword」装下攻击力 5，该念哪句咒语？',
    code: '___  = 5\nprint(sword)',
    fill: true,
    options: ['sword', '5', '"sword"', 'print'],
    answer: 0,
    explain: '变量用「名字 = 值」来创建。sword = 5 表示把 5 装进 sword 这个口袋，之后 print(sword) 就会显示 5。',
  },
  v2: {
    chapter: '第一章 · 变量',
    tier: 1,
    prompt: '变量可以互相传递！金币 gold 是 10，把它交给背包 bag，再花掉 4。最后 bag 里剩多少？',
    code: 'gold = 10\nbag = gold\ngold = gold - 4\nprint(bag)',
    options: ['6', '10', '4', '14'],
    answer: 1,
    explain: 'bag = gold 是把 10 复制了一份装进去。之后修改 gold 并不会影响 bag，所以 bag 仍然是 10。',
  },
  v3: {
    chapter: '第一章 · 变量',
    tier: 1,
    prompt: '字符串要用「成对的引号」包裹。想正确打印出 PyQuest，空格里该填什么？',
    code: 'name = PyQuest   ← 报错！名字没加引号\n\nname = ___\nprint(name)',
    fill: true,
    options: ['"PyQuest"', 'PyQuest', "'PyQuest", 'PyQuest"'],
    answer: 0,
    explain: '文字内容（字符串）必须用成对的引号包住："PyQuest" 或 \'PyQuest\' 都可以，但左引号和右引号要匹配。',
  },
  v4: {
    chapter: '第一章 · 数据类型',
    tier: 1,
    prompt: '数字和文字是两种不同的「材料」！字符串 "7" 和数字 3 直接相加，会发生什么？',
    code: 'print("7" + 3)',
    options: ['10', '"73"', '73', '报错'],
    answer: 3,
    explain: '字符串和数字不能直接相加，Python 会抛出 TypeError。想先转成数字再相加，要写 int("7") + 3，结果才是 10。',
  },
  v5: {
    chapter: '第一章 · 运算符',
    tier: 1,
    prompt: '除了 + - * /，Python 还有两个「分割宝物」的运算符。这条咒语会打印什么？',
    code: 'print(17 // 5, 17 % 5)',
    options: ['3 2', '3.4 2', '2 3', '3 3'],
    answer: 0,
    explain: '// 是整除（向下取整），17 // 5 = 3；% 是取余数，17 % 5 = 2。print 用逗号连打两项时中间以空格分隔。',
  },
  v6: {
    chapter: '第一章 · 变量',
    tier: 1,
    prompt: '口袋里的东西可以随时更换！口袋 x 先装 1，再装「原来的 x 加 1」。最后打印出什么？',
    code: 'x = 1\nx = x + 1\nprint(x)',
    options: ['1', '2', '11', '报错'],
    answer: 1,
    explain: 'x = x + 1 的意思是：取出 x 现在的值（1），加 1 得到 2，再装回 x。变量可以被反复重新赋值，新值会覆盖旧值。',
  },
  v7: {
    chapter: '第一章 · 数据类型',
    tier: 1,
    prompt: 'type 是「鉴定魔法」：看看口袋里装的是什么材料。x 装着整数 42，鉴定结果是什么？',
    code: 'x = 42\nprint(type(x))',
    options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"],
    answer: 0,
    explain: '42 是整数 int；带小数点的数字是 float；引号包住的文字是 str；True / False 是 bool。type() 会告诉我们数据的类型。',
  },
  v8: {
    chapter: '第一章 · 字符串',
    tier: 1,
    prompt: '两个字符串可以用 + 拼在一起，像接起两段绳子。这条咒语会打印什么？',
    code: 'a = "Py"\nb = "Quest"\nprint(a + b)',
    options: ['Py Quest', 'PyQuest', 'Py_Quest', '报错'],
    answer: 1,
    explain: '字符串 + 字符串 会把两段文字首尾相接，中间不会自动加空格，所以是 PyQuest。想加分隔可以写 a + " " + b。',
  },
  v9: {
    chapter: '第一章 · 字符串',
    tier: 1,
    prompt: '字符串还能用 * 重复！像回声一样把咒语念好几遍。这条咒语会打印什么？',
    code: 'print("哈" * 3)',
    options: ['哈', '哈哈', '哈哈哈', '报错'],
    answer: 2,
    explain: '字符串 * 整数 n 表示把字符串重复 n 次："哈" * 3 就是 哈哈哈。注意字符串不能和数字相加，但可以和数字相乘！',
  },
  v10: {
    chapter: '第一章 · 运算符',
    tier: 1,
    prompt: '魔法运算也有先后顺序！和数学一样，先乘除后加减。这条咒语会打印什么？',
    code: 'print(2 + 3 * 4)',
    options: ['20', '14', '24', '10'],
    answer: 1,
    explain: '* 的优先级比 + 高：先算 3 * 4 = 12，再算 2 + 12 = 14。想先算加法要加括号：print((2 + 3) * 4) 才是 20。',
  },
  v11: {
    chapter: '第一章 · 运算符',
    tier: 1,
    prompt: '除了 + - * /，还有威力成倍翻升的 ** 运算符！print(2 ** 3) 会打印什么？',
    code: 'print(2 ** 3)',
    options: ['6', '8', '9', '23'],
    answer: 1,
    explain: '** 是幂运算：2 ** 3 表示 2 的 3 次方，即 2×2×2 = 8。注意和乘法区分：2 * 3 才是 6。',
  },
  v12: {
    chapter: '第一章 · 数据类型',
    tier: 1,
    prompt: '比较运算的结果只有两种：True（真）或 False（假）。这两条咒语会打印什么？',
    code: 'print(3 > 2)\nprint(3 == 3)',
    options: ['True True', 'True False', 'False True', '报错'],
    answer: 0,
    explain: '3 > 2 成立 → True；== 判断两边是否相等（一个 = 是赋值，两个 == 才是比较），3 == 3 成立 → True。',
  },
  v13: {
    chapter: '第一章 · 变量',
    tier: 1,
    prompt: '给口袋起名字有规矩：只能用字母、数字和下划线，而且不能用数字开头。下面哪个名字是合法的？',
    code: '___ = 100   ← 哪个名字能通过？',
    fill: true,
    options: ['gold_2', '2gold', 'my-gold', 'my gold'],
    answer: 0,
    explain: '变量名只能包含字母、数字、下划线，且不能以数字开头：2gold 以数字开头✗，my-gold 里的 - 会被当成减号✗，my gold 有空格✗。gold_2 完全合法！',
  },

  // ============ 题池 dungeon：地牢祝福符文（难度 2）============
  d1: {
    chapter: '第二章 · 输出',
    tier: 2,
    prompt: 'print 是「公告魔法」，f 字符串能把变量嵌进文字里。这条咒语会说出什么？',
    code: 'hp = 3\nprint(f"生命值: {hp}")',
    options: ['生命值: {hp}', '生命值: 3', 'hp', '报错'],
    answer: 1,
    explain: 'f 字符串（f"..."）里的大括号 {hp} 会被替换成变量的值 3，其余文字原样显示。',
  },
  d2: {
    chapter: '第三章 · 条件',
    tier: 2,
    prompt: 'if 是「分岔路口」：条件为 True 走左边，否则走右边。护甲 8 小于 10，屏幕会打印什么？',
    code: 'armor = 8\nif armor >= 10:\n    print("坚固")\nelse:\n    print("脆弱")',
    options: ['坚固', '脆弱', '坚固 脆弱', '什么都不打印'],
    answer: 1,
    explain: 'armor >= 10 是 8 >= 10，结果为 False，所以走 else 分支，打印「脆弱」。',
  },
  d3: {
    chapter: '第三章 · 条件',
    tier: 2,
    prompt: 'elif 能把多个路口串起来。分数 85，会打印哪个评价？',
    code: 'score = 85\nif score >= 90:\n    print("S")\nelif score >= 80:\n    print("A")\nelse:\n    print("B")',
    options: ['S', 'A', 'B', 'S 和 A'],
    answer: 1,
    explain: '条件从上到下检查：85 >= 90 不成立，接着 85 >= 80 成立，打印 A 后就结束，不再检查后面的分支。',
  },
  d4: {
    chapter: '第四章 · 循环',
    tier: 2,
    prompt: 'while True 是「永远重复的魔法」，但 break 可以随时打破它。最后打印的 n 是多少？',
    code: 'n = 0\nwhile True:\n    n += 1\n    if n == 3:\n        break\nprint(n)',
    options: ['2', '3', '4', '死循环'],
    answer: 1,
    explain: 'n 依次变成 1、2、3，当 n == 3 成立时执行 break，立刻跳出循环，所以打印 3。没有 break 的话 while True 会永远转下去。',
  },
  d5: {
    chapter: '第三章 · 条件',
    tier: 2,
    prompt: 'and / or 是「组合条件」的魔法。生命充足又有钥匙，这扇门能过吗？',
    code: 'hp = 30\nhave_key = True\nprint(hp > 0 and have_key)',
    options: ['True', 'False', 'None', '报错'],
    answer: 0,
    explain: 'and 要求两边都为 True：hp > 0 是 True，have_key 也是 True，结果就是 True。or 是有一边为 True 即可，not 则把 True / False 反过来。',
  },
  d6: {
    chapter: '第二章 · 输出',
    tier: 2,
    prompt: 'print 可以一次显示多组内容，用逗号隔开。这条咒语会打印什么？',
    code: 'name = "皮皮"\nhp = 3\nprint(name, hp)',
    options: ['皮皮3', '皮皮 3', '皮皮, 3', '报错'],
    answer: 1,
    explain: 'print 用逗号连接多项时，输出中间会自动加一个空格：皮皮 3。注意这和字符串拼接不同：+ 拼接不会自动加空格。',
  },
  d7: {
    chapter: '第三章 · 条件',
    tier: 2,
    prompt: '!= 是「不等于」判断。生命值刚好是 0，这段咒语会打印什么？',
    code: 'hp = 0\nif hp != 0:\n    print("还能战斗")\nelse:\n    print("倒下了")',
    options: ['还能战斗', '倒下了', '什么都不打印', '报错'],
    answer: 1,
    explain: 'hp != 0 即 0 != 0，不成立（False），所以走 else 分支，打印「倒下了」。!= 用来判断两边是否不相等。',
  },
  d8: {
    chapter: '第四章 · 循环',
    tier: 2,
    prompt: 'while 会在条件成立时一直重复。倒数魔法发动！最后会依次打印出什么？',
    code: 'n = 3\nwhile n > 0:\n    print(n)\n    n -= 1',
    options: ['3 2 1', '3 2 1 0', '1 2 3', '0 1 2 3'],
    answer: 0,
    explain: 'n 从 3 开始：打印 3 后减到 2，打印 2 后减到 1，打印 1 后减到 0。此时 n > 0 不成立，循环结束。所以依次是 3 2 1，不会打印 0。',
  },
  d9: {
    chapter: '第四章 · 循环',
    tier: 2,
    prompt: 'for 不只能配 range，还能直接遍历列表，把每个成员轮流取出来。这段咒语打印什么？',
    code: 'for x in [1, 2, 3]:\n    print(x * 2)',
    options: ['2 4 6', '1 2 3', '123', '2 2 2'],
    answer: 0,
    explain: 'for 会依次把 1、2、3 取出来装进 x，每次都执行 print(x * 2)：1*2=2、2*2=4、3*2=6，所以打印 2 4 6。',
  },
  d10: {
    chapter: '第三章 · 条件',
    tier: 2,
    prompt: 'not 是「反转魔法」：把 True 变 False、False 变 True。这条咒语打印什么？',
    code: 'print(not (3 > 5))',
    options: ['True', 'False', 'None', '报错'],
    answer: 0,
    explain: '3 > 5 不成立，结果是 False；not False 反转成 True。not 常用来表达「不满足某条件」的情况。',
  },
  d11: {
    chapter: '第四章 · 循环',
    tier: 2,
    prompt: 'range 还可以指定起点！range(1, 4) 会让下面的咒语依次打印出什么？',
    code: 'for i in range(1, 4):\n    print(i)',
    options: ['1 2 3 4', '1 2 3', '2 3 4', '1 4'],
    answer: 1,
    explain: 'range(起, 止) 和切片一样「含头不含尾」：从 1 开始，到 4 之前结束，生成 1、2、3。range(3) 其实就是 range(0, 3) 的缩写。',
  },

  // ============ 题池 boss：第一章 BOSS 破盾符文（难度 3）============
  boss: {
    chapter: '第四章 · 循环',
    chapterBoss: true,
    tier: 3,
    prompt: '循环史莱姆王的护盾由「重复魔法」构成！range(3) 会让下面的咒语念几次？',
    code: 'for i in range(3):\n    print("攻击!")',
    options: ['1 次', '2 次', '3 次', '无限次'],
    answer: 2,
    explain: 'range(3) 会生成 0、1、2 三个数，for 循环每个数执行一次，所以 print("攻击!") 一共执行 3 次。',
  },
  boss_b: {
    chapter: '第四章 · 循环',
    chapterBoss: true,
    tier: 3,
    prompt: '循环史莱姆王的护盾在积蓄能量！这段咒语最后打印的 total 是多少？',
    code: 'total = 0\nfor i in range(4):\n    total += i\nprint(total)',
    options: ['4', '6', '10', '0'],
    answer: 1,
    explain: 'range(4) 生成 0、1、2、3。total += i 依次累加：0、1、3、6。所以最后打印 6。',
  },
  boss_c: {
    chapter: '第四章 · 循环',
    chapterBoss: true,
    tier: 3,
    prompt: '护盾咒语还能指定起点！range(2, 5) 会让下面的咒语念几次？',
    code: 'for i in range(2, 5):\n    print("盾!")',
    options: ['2 次', '3 次', '5 次', '4 次'],
    answer: 1,
    explain: 'range(2, 5) 含头不含尾：生成 2、3、4 三个数，循环体执行 3 次。次数 = 5 - 2 = 3。',
  },
  boss_d: {
    chapter: '第四章 · 循环',
    chapterBoss: true,
    tier: 3,
    prompt: '史莱姆王把护盾碎片一点点缝起来！这段咒语最后打印什么？',
    code: 'msg = ""\nfor i in range(3):\n    msg += "盾"\nprint(msg)',
    options: ['盾', '盾盾', '盾盾盾', '空字符串'],
    answer: 2,
    explain: '循环 3 次，每次把一个 "盾" 拼接到 msg 后面：盾 → 盾盾 → 盾盾盾。字符串的 += 拼接是循环里累积结果的常用手法。',
  },

  // ============ 题池 forest：函数之森碎片符文（难度 4）============
  f1: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '函数是「可以反复念的魔法卷轴」：定义一次，随时调用。想定义这个卷轴，空格里该填哪个关键字？',
    code: '___ greet():\n    print("你好!")\n\ngreet()',
    fill: true,
    options: ['def', 'function', 'define', 'print'],
    answer: 0,
    explain: 'Python 用 def 定义函数：def 函数名():。注意不是 function（那是别的语言的写法），定义后用 greet() 就能随时调用。',
  },
  f2: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '函数可以像魔法阵一样「传递材料」——材料叫参数。调用 greet("皮皮") 会打印出什么？',
    code: 'def greet(name):\n    print("你好, " + name)\n\ngreet("皮皮")',
    options: ['你好, name', '你好, 皮皮', 'name', '报错'],
    answer: 1,
    explain: '调用 greet("皮皮") 时，"皮皮" 被装进参数 name 里，函数体内 print("你好, " + name) 就会打印「你好, 皮皮」。',
  },
  f3: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: 'return 是「回传宝物」：函数把算好的结果交还给外面。最后 print 出的是什么？',
    code: 'def double(x):\n    return x * 2\n\nhp = double(4)\nprint(hp)',
    options: ['4', '8', 'x * 2', '什么都没有'],
    answer: 1,
    explain: 'double(4) 在函数里算出 4 * 2 = 8，用 return 把 8 交出去，hp 就装着 8。没有 return 的函数交回来的是 None。',
  },
  f4: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '参数可以有「备用材料」——默认值！不传材料直接调用 greet()，会打印什么？',
    code: 'def greet(name="旅人"):\n    print("你好, " + name)\n\ngreet()',
    options: ['你好, name', '你好, 旅人', '报错', '你好, '],
    answer: 1,
    explain: '定义函数时写 参数=默认值，调用时不传参数就自动用默认值 "旅人"。传了参数（如 greet("皮皮")）则用传入的。',
  },
  f5: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '函数内部的变量是「卷轴里的私人笔记」。调用 change() 之后，外面的 x 变了吗？',
    code: 'x = 5\ndef change():\n    x = 99\nchange()\nprint(x)',
    options: ['99', '5', 'None', '报错'],
    answer: 1,
    explain: '函数内给名字赋值会创建「局部变量」，只存在于函数内部，不影响外面的同名变量。想让外面拿到新值，要用 return 把结果交回去再赋值。',
  },
  f7: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '魔法卷轴定义一次，可以反复使用！连续调用两次 heal()，「回血」会被打印几次？',
    code: 'def heal():\n    print("回血")\n\nheal()\nheal()',
    options: ['1 次', '2 次', '0 次', '报错'],
    answer: 1,
    explain: '调用几次就执行几次：heal() 写了两行，函数体就执行两遍。这就是函数的意义——不用重复写同样的代码。',
  },
  f8: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '函数可以有多个参数，按顺序一一对应。attack(5, 3) 会打印什么？',
    code: 'def attack(atk, bonus):\n    print(atk + bonus)\n\nattack(5, 3)',
    options: ['8', '53', '2', '报错'],
    answer: 0,
    explain: '调用时按位置对应：5 装进第一个参数 atk，3 装进第二个参数 bonus。atk + bonus = 5 + 3 = 8。',
  },
  f9: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: 'return 一执行，函数就立刻结束回家！这段咒语会打印出什么？',
    code: 'def cast():\n    print("起手")\n    return "火球"\n    print("收尾")\n\nprint(cast())',
    options: ['起手 和 火球', '起手、火球、收尾', '只打印 火球', '起手 和 收尾'],
    answer: 0,
    explain: '先打印「起手」，接着 return "火球" 让函数立刻结束并把 "火球" 交出去——后面的 print("收尾") 永远不会执行。最后外层 print(cast()) 打印「火球」。',
  },
  f10: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '默认参数是「备用材料」，但传了新材料就会用新的！greet("皮皮") 会打印什么？',
    code: 'def greet(name="旅人"):\n    print("你好, " + name)\n\ngreet("皮皮")',
    options: ['你好, 皮皮', '你好, 旅人', '你好, 旅人皮皮', '报错'],
    answer: 0,
    explain: '调用时传了 "皮皮"，就会覆盖默认值 "旅人"。只有在括号里什么都不传时（greet()），才会使用默认值。',
  },
  f11: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '参数是「按约定交材料」：卷轴要两个，只交一个会怎样？',
    code: 'def add(a, b):\n    return a + b\n\nprint(add(1))',
    options: ['1', '报错', 'None', '2'],
    answer: 1,
    explain: 'add 需要两个参数（a 和 b），只传一个会抛出 TypeError，提示缺少参数。除非参数有默认值，否则数量必须对上。',
  },
  f12: {
    chapter: '第二章 · 函数',
    tier: 4,
    prompt: '函数改不了外面的变量，但可以「把结果交回来」！这段咒语最后打印什么？',
    code: 'hp = 10\ndef damage(hp):\n    return hp - 3\n\nhp = damage(hp)\nprint(hp)',
    options: ['7', '10', '13', '报错'],
    answer: 0,
    explain: 'damage(hp) 把 10 传进去，函数里算出 10 - 3 = 7 并 return 交回。hp = damage(hp) 用返回值 7 覆盖了外面的 hp。想让外部拿到新值，就用 return 再赋值！',
  },

  // ============ 题池 forestHeal：森林祝福符文（难度 5）============
  f6: {
    chapter: '第二章 · 元组',
    tier: 5,
    prompt: '元组 tuple 是「封蜡的卷轴」——写好就不能改！尝试修改会怎样？',
    code: 'point = (3, 5)\npoint[0] = 10',
    options: ['point 变成 (10, 5)', '报错', 'point 不变', '打印 10'],
    answer: 1,
    explain: '元组是不可变序列：创建之后不能修改元素，赋值会抛出 TypeError。需要随时修改的数据就用列表 [ ]。',
  },
  f13: {
    chapter: '第二章 · 元组',
    tier: 5,
    prompt: '元组也像一排有编号的宝箱，同样从 0 开始数！point[1] 取出的是哪个？',
    code: 'point = (3, 5)\nprint(point[1])',
    options: ['3', '5', '1', '报错'],
    answer: 1,
    explain: '元组的索引规则和列表一样：point[0] 是 3，point[1] 是 5。区别只在于元组创建后不能修改。',
  },
  f14: {
    chapter: '第二章 · 元组',
    tier: 5,
    prompt: '元组可以「一口气拆开」装进多个变量！这段咒语打印什么？',
    code: 'x, y = (10, 20)\nprint(y)',
    options: ['10', '20', '(10, 20)', '报错'],
    answer: 1,
    explain: 'x, y = (10, 20) 会按位置拆开：10 装进 x，20 装进 y。所以 print(y) 打印 20。这个手法叫「解包」，交换两个变量也常用它。',
  },
  f15: {
    chapter: '第二章 · 元组',
    tier: 5,
    prompt: '只装一件宝物的元组，要多加一个逗号才算元组！len(t) 的结果是？',
    code: 't = (5,)\nprint(len(t))',
    options: ['1', '2', '0', '报错'],
    answer: 0,
    explain: '(5,) 带着逗号，是货真价实的「单元素元组」，长度为 1。写成 (5) 只是一个普通数字 5 多套了层括号，根本不是元组！',
  },

  // ============ 题池 cave：列表洞窟祝福符文（难度 6）============
  l1: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '列表是「一排有编号的宝箱」，编号（索引）从 0 开始数！想拿出「剑」，方框里该填几？',
    code: 'bag = ["药水", "剑", "盾"]\nprint(bag[___])',
    fill: true,
    options: ['1', '2', '0', '3'],
    answer: 0,
    explain: '列表索引从 0 开始：bag[0] 是 "药水"，bag[1] 是 "剑"，bag[2] 是 "盾"。数编号时要从 0 数起！',
  },
  l2: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: 'append 是「往队伍末尾加入新成员」。执行这段咒语后，len 数出来的队伍有几人？',
    code: 'team = ["勇者", "史莱姆"]\nteam.append("长老")\nprint(len(team))',
    options: ['2', '3', '4', '报错'],
    answer: 1,
    explain: 'append 把 "长老" 加到列表末尾，列表变成 3 个元素，len(team) 返回长度 3。',
  },
  l3: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '列表里的宝物可以直接替换！执行后 bag[1] 变成了什么？',
    code: 'bag = ["药水", "剑", "盾"]\nbag[1] = "圣剑"\nprint(bag[1])',
    options: ['剑', '圣剑', '药水', '报错'],
    answer: 1,
    explain: '用 索引 = 新值 可以直接替换元素：bag[1] = "圣剑" 把原来的 "剑" 覆盖成了 "圣剑"。',
  },
  l4: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '切片 [:] 是「从宝箱排里截取一段」！nums[1:4] 取出的是哪些？',
    code: 'nums = [0, 1, 2, 3, 4]\nprint(nums[1:4])',
    options: ['[1, 2, 3, 4]', '[1, 2, 3]', '[0, 1, 2]', '[2, 3]'],
    answer: 1,
    explain: '切片 nums[起:止] 取索引从「起」到「止-1」的元素（含头不含尾）：[1:4] 取索引 1、2、3，即 [1, 2, 3]。',
  },
  l5: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: 'in 是「搜查魔法」：物品在不在背包里，一查便知。这条咒语打印什么？',
    code: 'bag = ["药水", "剑", "盾"]\nprint("剑" in bag, "弓" in bag)',
    options: ['True False', 'False True', 'True True', '报错'],
    answer: 0,
    explain: 'in 判断元素是否存在于列表中，返回布尔值："剑" 在 bag 里 → True；"弓" 不在 → False。',
  },
  l6: {
    chapter: '第二章 · 字典',
    tier: 6,
    prompt: '字典是「贴着标签的宝箱格」：用键查值！hero["hp"] 会取出什么？',
    code: 'hero = {"name": "皮皮", "hp": 6}\nprint(hero["hp"])',
    options: ['name', 'hp', '6', '报错'],
    answer: 2,
    explain: '字典用大括号 {} 存储「键: 值」对，hero["hp"] 按键 "hp" 取出值 6。每个键都是唯一的，像宝箱格上的名字标签。',
  },
  l7: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '索引还能倒着数！-1 永远指向最后一个成员。这条咒语打印什么？',
    code: 'bag = ["药水", "剑", "盾"]\nprint(bag[-1])',
    options: ['药水', '剑', '盾', '报错'],
    answer: 2,
    explain: '负索引从末尾往前数：bag[-1] 是最后一个 "盾"，bag[-2] 是 "剑"，bag[-3] 是 "药水"。想拿队伍末尾的东西用 -1 最方便。',
  },
  l8: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '切片的起点和终点都可以偷懒省略！nums[:2] 取出的是哪些？',
    code: 'nums = [0, 1, 2, 3, 4]\nprint(nums[:2])',
    options: ['[0, 1]', '[0, 1, 2]', '[1, 2]', '[2, 3, 4]'],
    answer: 0,
    explain: '省略起点表示「从头开始」：nums[:2] 等价于 nums[0:2]，取索引 0、1（含头不含尾），即 [0, 1]。省略终点 nums[2:] 则是取到末尾。',
  },
  l9: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: 'append 的反义词是 pop：把队尾的成员「请出去」，还会告诉你请的是谁。打印什么？',
    code: 'team = ["勇者", "法师", "盗贼"]\nlast = team.pop()\nprint(last)',
    options: ['勇者', '法师', '盗贼', '报错'],
    answer: 2,
    explain: 'pop() 移除并返回列表最后一个元素："盗贼" 被请出队伍，last 装着他。之后 team 只剩 ["勇者", "法师"]。',
  },
  l10: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '宝箱只有 1 个，却伸手拿 2 号箱？编号从 0 数起，bag[1] 拿得到吗？',
    code: 'bag = ["药水"]\nprint(bag[1])',
    options: ['药水', 'None', '报错', '空字符串'],
    answer: 2,
    explain: 'bag 只有 1 个元素，合法索引只有 bag[0]。bag[1] 超出范围，会抛出 IndexError。列表长度可用 len(bag) 先查清楚。',
  },
  l11: {
    chapter: '第二章 · 字典',
    tier: 6,
    prompt: '字典的格子可以随时放东西、换东西！这段咒语打印什么？',
    code: 'hero = {}\nhero["hp"] = 3\nhero["hp"] = hero["hp"] + 1\nprint(hero["hp"])',
    options: ['3', '4', '1', '报错'],
    answer: 1,
    explain: 'hero["hp"] = 3 新建格子装入 3；接着取出 3 加 1 再存回，hero["hp"] 变成 4。字典用「键 = 值」就能新建或覆盖，非常灵活。',
  },
  l12: {
    chapter: '第二章 · 字典',
    tier: 6,
    prompt: 'in 也能搜查字典，但它只翻「标签」（键），不翻「内容」（值）！打印什么？',
    code: 'hero = {"name": "皮皮", "hp": 6}\nprint("hp" in hero, "皮皮" in hero)',
    options: ['True True', 'True False', 'False True', 'False False'],
    answer: 1,
    explain: '"hp" 是键 → True；"皮皮" 只是值，不是键 → False。想按值查找，得用 hero.values() 或直接遍历。',
  },
  l13: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: '两个列表也能用 + 拼成长队！这条咒语打印什么？',
    code: 'a = [1, 2]\nb = [3]\nprint(a + b)',
    options: ['[1, 2, 3]', '[1, 2], [3]', '6', '报错'],
    answer: 0,
    explain: '列表 + 列表 会把两个队伍首尾接起来，得到 [1, 2, 3]。注意这不会修改原来的 a 和 b，而是产生一个新列表。',
  },
  l14: {
    chapter: '第二章 · 列表',
    tier: 6,
    prompt: 'Python 自带许多「成品魔法」！sum 可以把一队数字全部加起来。打印什么？',
    code: 'nums = [1, 2, 3]\nprint(sum(nums))',
    options: ['123', '6', '3', '报错'],
    answer: 1,
    explain: 'sum(列表) 把所有数字元素相加：1 + 2 + 3 = 6。类似的还有 max（最大）、min（最小）、len（个数）。',
  },

  // ============ 题池 boss2：第二章 BOSS 破盾符文（难度 7）============
  boss2: {
    chapter: '第二章 · 列表',
    chapterBoss: true,
    tier: 7,
    prompt: '巨蟒毕森的身体就是一条会动的列表！这段咒语会打印出什么？',
    code: 'snake = ["头", "身", "尾"]\nsnake.append("尾2")\nprint(snake[3], snake[0])',
    options: ['尾2 头', '头 尾2', '身 头', '报错'],
    answer: 0,
    explain: 'append 把 "尾2" 接到末尾（索引 3），snake[0] 是 "头"。print 用逗号连打两项时中间以空格分隔，所以是「尾2 头」。',
  },
  boss2_b: {
    chapter: '第二章 · 列表',
    chapterBoss: true,
    tier: 7,
    prompt: '巨蟒的鳞片又厚了一层！这段咒语会打印出什么？',
    code: 'stack = [1, 2]\nstack.append(3)\nprint(len(stack), stack[-1])',
    options: ['3 3', '2 3', '3 2', '报错'],
    answer: 0,
    explain: 'append 后列表变成 [1, 2, 3]：len 数出 3 个成员，stack[-1] 是最后刚加进来的 3。print 用逗号连打两项中间加空格 → 「3 3」。',
  },
  boss2_c: {
    chapter: '第二章 · 列表',
    chapterBoss: true,
    tier: 7,
    prompt: '巨蟒正在用循环生长新体节！这段咒语最后打印什么？',
    code: 'snake = ["头"]\nfor i in range(2):\n    snake.append("身")\nprint(len(snake))',
    options: ['2', '3', '4', '1'],
    answer: 1,
    explain: 'range(2) 循环 2 次，每次 append 一节 "身"：列表从 ["头"] 长成 ["头", "身", "身"]。len 数出 3 个成员。',
  },
  boss2_d: {
    chapter: '第二章 · 列表',
    chapterBoss: true,
    tier: 7,
    prompt: '巨蟒把体节的力量汇聚到头部！这段咒语会打印出什么？',
    code: 'nums = [5, 6, 7]\nnums[0] = nums[1] + nums[2]\nprint(nums[0])',
    options: ['5', '11', '13', '18'],
    answer: 2,
    explain: '右边先算：nums[1] + nums[2] = 6 + 7 = 13，再把 13 存进索引 0 的格子，覆盖原来的 5。所以打印 13。',
  },
};

// ------------------------------------------------------------
// 同难度题池：池内所有题目 tier 一致（scripts/smoke.mjs 会校验）
// 每块符文石从所属题池随机抽题 → 玩家每次遇到的题目都可能不同，
// 但难度保持一致
// ------------------------------------------------------------
export const POOLS = {
  village: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13'],
  dungeon: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11'],
  boss: ['boss', 'boss_b', 'boss_c', 'boss_d'],
  forest: ['f1', 'f2', 'f3', 'f4', 'f5', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12'],
  forestHeal: ['f6', 'f13', 'f14', 'f15'],
  cave: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12', 'l13', 'l14'],
  boss2: ['boss2', 'boss2_b', 'boss2_c', 'boss2_d'],
};

// 符文槽 → 题池 的映射（地图 rune 的 qid 字段即这里的槽位 id）
export const SLOT_POOL = {
  v1: 'village', v2: 'village', v3: 'village', v4: 'village', v5: 'village',
  d1: 'dungeon', d2: 'dungeon', d3: 'dungeon', d4: 'dungeon', d5: 'dungeon',
  boss: 'boss',
  f1: 'forest', f2: 'forest', f3: 'forest', f4: 'forest', f5: 'forest', f6: 'forestHeal',
  l1: 'cave', l2: 'cave', l3: 'cave', l4: 'cave', l5: 'cave', l6: 'cave',
  boss2: 'boss2',
};

/**
 * 为符文槽随机抽一道题（同池同难度）：
 * - 同一块符文石在答对之前始终显示同一道题（抽题记录存 G.runeRolls）
 * - 已答对的题（G.qAnswered）不会再被抽到
 * - 其他符文石已抽走但未答对的题也会避开（同池不撞题）
 */
export function pickQuestion(slotId) {
  const pool = POOLS[SLOT_POOL[slotId]];
  if (!pool) throw new Error(`未知符文槽: ${slotId}`);

  // 已抽过且尚未答对 → 沿用同一道题
  const rolled = G.runeRolls[slotId];
  if (rolled && pool.includes(rolled) && !G.qAnswered.has(rolled)) {
    return { id: rolled, ...QUESTIONS[rolled] };
  }

  const taken = new Set(Object.values(G.runeRolls)); // 其他符文已抽走的题
  let candidates = pool.filter((qid) => !G.qAnswered.has(qid) && !taken.has(qid));
  if (!candidates.length) candidates = pool.filter((qid) => !G.qAnswered.has(qid));
  if (!candidates.length) candidates = pool.slice(); // 题池全部答完时允许复用（兜底）

  const qid = candidates[Math.floor(Math.random() * candidates.length)];
  G.runeRolls[slotId] = qid;
  return { id: qid, ...QUESTIONS[qid] };
}

// ---------- 极简 Python 语法高亮 ----------
const KEYWORDS = /\b(for|while|in|if|elif|else|def|return|import|from|and|or|not|True|False)\b/g;

export function highlight(code) {
  let html = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("[^"]*"|'[^']*')/g, '<span class="str">$1</span>')
    .replace(/(&quot;[^&]*&quot;)/g, '<span class="str">$1</span>')
    .replace(KEYWORDS, '<span class="kw">$1</span>')
    .replace(/\b(print|range|len|append|int|str|input)\b/g, '<span class="fn">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
  // 替换填空占位符 ___（避免被上面规则干扰）
  html = html.replace(/_{3,}/g, '<span class="blank" id="quiz-blank">____</span>');
  return html;
}

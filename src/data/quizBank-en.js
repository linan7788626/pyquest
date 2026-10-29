// ============================================================
// Python 题库英文 sidecar（Lane B）
// qid → { prompt, explain, options? }
// 约定（与 scripts/check-i18n-parity.mjs 对齐）：
//   - 绝不覆写 answer / code / fill / tier / chapter 等抽题与判定
//     字段（answer 索引不变、代码不翻译由「不覆写」保证）；
//   - 填空题（fill）选项是代码片段：不提供 options，原样使用 zh；
//   - 非 fill 题 options 与 zh 同长度同序：纯代码/数字/程序输出
//     原样保留（与 zh 完全一致），自然语言选项译为英文；
//     题面代码里打印的中文字符串属于「程序输出」，同样原样保留。
// ============================================================

/** 章节标签 zh → en（QuizOverlay 面板左上角徽章） */
export const CHAPTER_LABELS_EN = {
  '第一章 · 变量': 'Chapter 1 · Variables',
  '第一章 · 数据类型': 'Chapter 1 · Data Types',
  '第一章 · 运算符': 'Chapter 1 · Operators',
  '第一章 · 字符串': 'Chapter 1 · Strings',
  '第一章 · 输出': 'Chapter 1 · Output',
  '第一章 · 元组': 'Chapter 1 · Tuples',
  '第一章 · 列表': 'Chapter 1 · Lists',
  '第二章 · 函数': 'Chapter 2 · Functions',
  '第二章 · 字典': 'Chapter 2 · Dictionaries',
  '第二章 · 条件': 'Chapter 2 · Conditionals',
  '第二章 · 循环': 'Chapter 2 · Loops',
  '第三章 · NumPy': 'Chapter 3 · NumPy',
  '第三章 · 绘图': 'Chapter 3 · Plotting',
  '第三章 · 科学计算': 'Chapter 3 · Scientific Computing',
  '第四章 · 天文包': 'Chapter 4 · Astro Packages',
  '第五章 · 加速': 'Chapter 5 · Speed-Up',
  '第六章 · 数值方法': 'Chapter 6 · Numerical Methods',
  '第七章 · 线性代数与信号': 'Chapter 7 · Linear Algebra & Signals',
  '第八章 · 暗物质': 'Chapter 8 · Dark Matter',
};

/** 答题失误提示（QuizOverlay._hint 的英文表，键沿用 zh 标签） */
export const HINTS_EN = {
  '第一章 · 变量': 'Variables are like pockets: name = value; text needs quotes',
  '第一章 · 数据类型': 'int for integers, float for decimals, str for text, bool for True/False',
  '第一章 · 字符串': 'Strings need paired quotes; f-strings replace {variable} with its value',
  '第一章 · 输出': 'print separates multiple items with a space automatically',
  '第一章 · 列表': 'Indices start at 0; append adds to the end; slices include the start, exclude the end',
  '第一章 · 元组': 'A tuple is a wax-sealed scroll — it cannot be modified after creation',
  '第二章 · 条件': 'if runs only when the condition is True; elif checks from top to bottom',
  '第二章 · 循环': 'range(n) yields 0 to n-1; for runs once per number',
  '第二章 · 函数': 'def defines a function; return hands the result back to the caller',
  '第二章 · 字典': 'Dictionaries read by key d["key"]; in checks keys only, not values',
  '第三章 · NumPy': 'ndarray operations act element-wise; indices start at 0',
  '第三章 · 绘图': 'plot lines / scatter dots / hist histograms / savefig saves',
  '第三章 · 科学计算': 'quad computes integrals; Monte Carlo estimates areas with random numbers',
  '第四章 · 天文包': 'FITS headers store metadata; Astropy handles units and coordinates',
  '第五章 · 加速': 'Vectorize instead of for loops when you can; @jit compiles on the fly',
  '第六章 · 数值方法': 'quad integrates, solve_ivp solves ODEs, curve_fit fits',
  '第七章 · 线性代数与信号': 'eig for eigenvalues, fft to the frequency domain, convolution slides and multiplies',
  '第八章 · 暗物质': 'NFW profile: ρ(r) ∝ 1/[r(1+r/rs)²]',
};

export const QUESTIONS_EN = {
  // ============ W1 · Variables / Strings / Operators ============
  v1: {
    prompt: 'Traveler, a "variable" is a magic pocket: give it a name, put something inside. To store the attack power 5 in a pocket named "sword", which spell should you chant?',
    explain: 'A variable is created with "name = value". sword = 5 puts 5 into the pocket named sword; afterwards print(sword) shows 5.',
  },
  v2: {
    prompt: 'Variables can pass values to each other! Gold coins gold is 10, handed to the bag; then 4 are spent. How many are left in bag?',
    explain: 'bag = gold copies the value 10 into bag. Later changes to gold do not affect bag, so bag is still 10.',
    options: ['6', '10', '4', '14'],
  },
  v3: {
    prompt: 'Strings must be wrapped in "paired quotes". To print PyQuest correctly, what belongs in the blank?',
    explain: 'Text (strings) must be enclosed in matching quotes: "PyQuest" or \'PyQuest\' both work — the opening and closing quotes must pair up.',
  },
  v4: {
    prompt: 'Numbers and text are two different "materials"! What happens when you add the string "7" and the number 3 directly?',
    explain: 'A string and a number cannot be added directly — Python raises a TypeError. Convert first with int("7") + 3 to get 10.',
    options: ['10', '"73"', '73', 'Error'],
  },
  v5: {
    prompt: 'Besides + - * /, Python has two "treasure-splitting" operators. What does this spell print?',
    explain: '// is floor division, 17 // 5 = 3; % is the remainder, 17 % 5 = 2. When print takes several items, they are separated by spaces.',
    options: ['3 2', '3.4 2', '2 3', '3 3'],
  },
  v6: {
    prompt: 'The contents of a pocket can be replaced anytime! Pocket x holds 1, then "the old x plus 1". What does it print in the end?',
    explain: 'x = x + 1 means: take the current value of x (1), add 1 to get 2, and store it back into x. Variables can be reassigned; new values overwrite old ones.',
    options: ['1', '2', '11', 'Error'],
  },
  v7: {
    prompt: 'type is the "appraisal spell": it reveals what material a pocket holds. x contains the integer 42 — what is the verdict?',
    explain: "Integers are int, strings str, decimals float, booleans bool. type(42) shows <class 'int'>.",
    options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'bool'>"],
  },
  v8: {
    prompt: 'Strings also support "addition"! Two spell-lines are concatenated — what does it print? (The code joins two single Chinese characters.)',
    explain: 'string + string is concatenation: the two characters join head to tail. Note that concatenation adds no space automatically (print\'s comma does).',
    options: ['星图', '星 图', '星\n图', 'Error'],
  },
  v9: {
    prompt: 'Strings can even "copy themselves"! What does print show?',
    explain: 'string * integer repeats the string: "=" * 3 gives "===". A handy trick for printing separators.',
    options: ['===', '3', '=3', 'Error'],
  },
  v10: {
    prompt: 'Exponentiation has its own operator! What does this spell print?',
    explain: '** is the power operator: 2 ** 3 = 2×2×2 = 8. Do not confuse it with * (multiplication) or ^ (bitwise XOR in Python, the power operator in some other languages).',
    options: ['8', '6', '9', '23'],
  },
  v11: {
    prompt: 'Multiplication and division before addition and subtraction! What does this spell print?',
    explain: 'As in math, * binds tighter than +: first 3 * 4 = 12, then plus 2 gives 14. Use parentheses to add first: (2 + 3) * 4 = 20.',
    options: ['14', '20', '24', '9'],
  },
  v12: {
    prompt: 'Division always returns a decimal (float)! What does this spell print?',
    explain: 'In Python 3, / is true division and always yields a float: 6 / 2 = 3.0 (with a decimal point). Use // for an integer result: 6 // 2 = 3.',
    options: ['3.0', '3', '3.5', 'Error'],
  },
  v13: {
    prompt: 'Naming a pocket has rules: only letters, digits and underscores — and it cannot start with a digit. Which name below is legal?',
    explain: 'Variable names may contain only letters, digits and underscores and cannot start with a digit: 2gold starts with a digit ✗, the - in my-gold is read as minus ✗, my gold has a space ✗. gold_2 is perfectly legal!',
  },

  // ============ W1 · Lists / Tuples / Output ============
  d1: {
    prompt: 'print is the "announcement spell", and f-strings embed variables into text. What does this spell say? (The label means "HP".)',
    explain: 'In an f-string (f"..."), the braces {hp} are replaced by the variable\'s value 3; the rest of the text is shown as-is.',
    options: ['生命值: {hp}', '生命值: 3', 'hp', 'Error'],
  },
  d6: {
    prompt: 'print can show several items at once, separated by commas. What does this spell print? (The name means "Pipi".)',
    explain: 'When print joins items with commas, a space is inserted between them automatically. Note the difference from concatenation: + adds no space.',
    options: ['皮皮3', '皮皮 3', '皮皮, 3', 'Error'],
  },
  f6: {
    prompt: 'A tuple is a "wax-sealed scroll" — once written, it cannot be changed! What happens if you try to modify one?',
    explain: 'Tuples are immutable sequences: elements cannot be modified after creation; assignment raises a TypeError. Use a list [ ] for data that must change.',
    options: ['point becomes (10, 5)', 'Error', 'point unchanged', 'prints 10'],
  },
  f13: {
    prompt: 'Tuples are also a row of numbered treasure chests, counting from 0! Which item does point[1] fetch?',
    explain: 'Tuple indexing follows the same rules as lists: point[0] is 3, point[1] is 5. The only difference is that tuples cannot be modified after creation.',
    options: ['3', '5', '1', 'Error'],
  },
  f14: {
    prompt: 'A tuple can be "unpacked in one breath" into several variables! What does this spell print?',
    explain: 'x, y = (10, 20) unpacks by position: 10 goes into x, 20 into y. So print(y) shows 20. This trick is also the classic way to swap two variables.',
    options: ['10', '20', '(10, 20)', 'Error'],
  },
  f15: {
    prompt: 'A tuple holding a single treasure needs an extra comma to count as a tuple! What is len(t)?',
    explain: '(5,) with its comma is a genuine "single-element tuple" of length 1. Writing (5) is just the plain number 5 wrapped in parentheses — not a tuple at all!',
    options: ['1', '2', '0', 'Error'],
  },
  l1: {
    prompt: 'A list is "a row of numbered treasure chests" — the numbering (index) starts at 0! To take out the "sword", what goes in the box? (The list holds potion, sword, shield.)',
    explain: 'List indices start at 0: bag[0] is the potion, bag[1] is the sword, bag[2] is the shield. Always count from 0!',
  },
  l2: {
    prompt: 'append is "adding a new member to the end of the queue". After this spell, how many members does len count?',
    explain: 'append adds the new name to the end of the list, making 3 elements; len(team) returns the length 3.',
    options: ['2', '3', '4', 'Error'],
  },
  l3: {
    prompt: 'Treasures in a list can be replaced directly! What does bag[1] become after this spell? (The list holds potion, sword and shield; the sword is replaced with a new, mightier blade — see the code.)',
    explain: 'index = new value replaces the element directly: the old sword is overwritten by the new item.',
    options: ['剑', '圣剑', '药水', 'Error'],
  },
  l4: {
    prompt: 'A slice [:] "cuts a segment from the row of chests"! Which items does nums[1:4] fetch?',
    explain: 'The slice nums[start:stop] takes indices from start to stop-1 (inclusive head, exclusive tail): [1:4] takes indices 1, 2, 3, i.e. [1, 2, 3].',
    options: ['[1, 2, 3, 4]', '[1, 2, 3]', '[0, 1, 2]', '[2, 3]'],
  },
  l5: {
    prompt: 'in is the "search spell": it instantly tells whether an item is in your bag. What does this spell print? (The bag holds potion, sword, shield; it checks sword and bow.)',
    explain: 'in tests membership and returns a boolean: the sword is in the bag → True; the bow is not → False.',
    options: ['True False', 'False True', 'True True', 'Error'],
  },
  l7: {
    prompt: 'Indices can count backwards! -1 always points to the last member. What does this spell print? (The bag holds potion, sword, shield.)',
    explain: 'Negative indices count from the end: bag[-1] is the last item (shield), bag[-2] the sword, bag[-3] the potion. Use -1 to grab the tail of a queue.',
    options: ['药水', '剑', '盾', 'Error'],
  },
  l8: {
    prompt: 'Both endpoints of a slice can be omitted! Which items does nums[:2] fetch?',
    explain: 'Omitting the start means "from the beginning": nums[:2] equals nums[0:2], taking indices 0 and 1 (inclusive head, exclusive tail) → [0, 1]. Omitting the end (nums[2:]) slices to the end.',
    options: ['[0, 1]', '[0, 1, 2]', '[1, 2]', '[2, 3, 4]'],
  },
  l9: {
    prompt: 'The opposite of append is pop: it "ushers out" the member at the end — and tells you who left. What does it print? (The team holds hero, mage, rogue.)',
    explain: 'pop() removes and returns the last element: the rogue leaves the queue and lands in last. The team is then left with the hero and the mage.',
    options: ['勇者', '法师', '盗贼', 'Error'],
  },
  l10: {
    prompt: 'Only 1 treasure chest, yet you reach for box number 1? Numbering starts at 0 — can bag[1] be fetched? (The bag holds one item.)',
    explain: 'The bag has 1 element, so the only legal index is bag[0]. bag[1] is out of range and raises an IndexError. Check the length first with len(bag).',
    options: ['药水', 'None', 'Error', 'Empty string'],
  },
  l13: {
    prompt: 'Two lists can also be joined with + into one long queue! What does this spell print?',
    explain: 'list + list joins the two queues head to tail, producing [1, 2, 3]. Note it does not modify the original a and b — it creates a new list.',
    options: ['[1, 2, 3]', '[1, 2], [3]', '6', 'Error'],
  },
  l14: {
    prompt: 'Python ships with many "ready-made spells"! sum adds a whole queue of numbers together. What does it print?',
    explain: 'sum(list) adds all numeric elements: 1 + 2 + 3 = 6. Similar built-ins: max, min, len.',
    options: ['123', '6', '3', 'Error'],
  },

  // ============ W1 · Data Slime King (w1boss) ============
  boss2: {
    prompt: 'The Data Slime King\'s body is a wriggling list! What does this spell print? (The body parts — core, gel, membrane — are the Chinese strings in the code; a second membrane is appended.)',
    explain: 'append attaches membrane2 at the end (index 3); slime[0] is the core. print separates the two items with a space.',
    options: ['膜2 核', '核 膜2', '胶 核', 'Error'],
  },
  boss2_b: {
    prompt: 'The Slime King\'s gel thickens by another layer! What does this spell print?',
    explain: 'After append the list becomes [1, 2, 3]: len counts 3 members, and stack[-1] is the newly added 3. print joins the two items with a space → "3 3".',
    options: ['3 3', '2 3', '3 2', 'Error'],
  },
  boss2_c: {
    prompt: 'The Slime King is growing new gel segments in a loop! What does this spell print in the end?',
    explain: 'range(2) loops twice, appending one gel each time: the list grows from one core to three members. len counts 3.',
    options: ['2', '3', '4', '1'],
  },
  boss2_d: {
    prompt: 'The Slime King gathers the gel\'s power into its core! What does this spell print?',
    explain: 'The right side is evaluated first: nums[1] + nums[2] = 6 + 7 = 13, then 13 is stored at index 0, overwriting the 5. So it prints 13.',
    options: ['5', '11', '13', '18'],
  },

  // ============ W2 · Functions (w2field) ============
  f1: {
    prompt: 'A function is "a scroll of spells you can chant again and again": define once, call anytime. To define this scroll, which keyword goes in the blank?',
    explain: 'Python defines functions with def: def name():. Not function (that is other languages). After defining, greet() can be called anytime.',
  },
  f2: {
    prompt: 'Functions can "pass in materials" like a magic circle — the materials are called parameters. What does this spell print when greet is called with a name? (The greeting means "Hello".)',
    explain: 'When greet is called with the name, the argument is loaded into the parameter name, so the body prints the greeting followed by the name.',
    options: ['你好, name', '你好, 皮皮', 'name', 'Error'],
  },
  f3: {
    prompt: 'return is "handing back the treasure": the function gives its finished result to the outside. What does the final print show?',
    explain: 'double(4) computes 4 * 2 = 8 inside the function and hands back 8 with return, so hp holds 8. A function without return hands back None.',
    options: ['4', '8', 'x * 2', 'Nothing'],
  },
  f4: {
    prompt: 'Parameters can have "spare materials" — default values! Calling greet() with no materials, what does it print? (The greeting means "Hello"; the default name means "traveler".)',
    explain: 'Writing parameter=default in the definition means the default is used when the call omits the argument. Pass a name explicitly and it overrides the default.',
    options: ['你好, name', '你好, 旅人', 'Error', '你好, '],
  },
  f5: {
    prompt: 'Variables inside a function are "private notes on the scroll". After calling change(), did the outer x change?',
    explain: 'Assigning to a name inside a function creates a local variable that exists only within the function; it does not affect an outer variable of the same name. To deliver a new value outside, return it and assign.',
    options: ['99', '5', 'None', 'Error'],
  },
  f7: {
    prompt: 'A magic scroll, once defined, can be reused! Calling heal() twice in a row — how many times is "healing" printed?',
    explain: 'It executes once per call: heal() appears on two lines, so the body runs twice. That is the point of functions — no duplicated code.',
    options: ['1 time', '2 times', '0 times', 'Error'],
  },
  f8: {
    prompt: 'Functions can take several parameters, matched one-to-one in order. What does attack(5, 3) print?',
    explain: 'Arguments match by position: 5 goes into the first parameter atk, 3 into bonus. atk + bonus = 5 + 3 = 8.',
    options: ['8', '53', '2', 'Error'],
  },
  f9: {
    prompt: 'The moment return executes, the function ends and goes home immediately! What does this spell print in total? (The function prints "start", returns "fireball", then has a trailing print.)',
    explain: 'First "start" is printed; then return ends the function instantly and hands "fireball" back — the final print inside never runs. The outer print(cast()) then shows "fireball".',
    options: ['"start" and "fireball"', '"start", "fireball", "finish"', 'only "fireball"', '"start" and "finish"'],
  },
  f10: {
    prompt: 'A default parameter is a "spare material" — but a newly passed material wins! What does greet print when called with an explicit name? (The greeting means "Hello"; the default name means "traveler".)',
    explain: 'Passing an argument overrides the default. Only when the parentheses are empty (greet()) is the default used.',
    options: ['你好, 皮皮', '你好, 旅人', '你好, 旅人皮皮', 'Error'],
  },
  f11: {
    prompt: 'Parameters are "materials handed over by agreement": the scroll wants two but you deliver one — what happens?',
    explain: 'add needs two parameters (a and b); passing only one raises a TypeError about missing arguments. Unless a parameter has a default, the count must match.',
    options: ['1', 'Error', 'None', '2'],
  },
  f12: {
    prompt: 'A function cannot change an outer variable directly, but it can "hand the result back"! What does this spell print in the end?',
    explain: 'damage(hp) receives 10, computes 10 - 3 = 7 and returns it. hp = damage(hp) overwrites the outer hp with 7. To update outer state: return, then assign!',
    options: ['7', '10', '13', 'Error'],
  },

  // ============ W2 · Dictionaries (w2heal) ============
  l6: {
    prompt: 'A dictionary is "a grid of labeled treasure chests": look up values by key! What does hero["hp"] fetch?',
    explain: 'Dictionaries store "key: value" pairs in braces; hero["hp"] fetches the value 6 by the key "hp". Every key is unique, like a name tag on a chest.',
    options: ['name', 'hp', '6', 'Error'],
  },
  l11: {
    prompt: 'Dictionary slots can be filled and swapped anytime! What does this spell print?',
    explain: 'hero["hp"] = 3 creates a slot holding 3; then 3 is fetched, 1 is added and stored back, so hero["hp"] becomes 4. key = value creates or overwrites — very flexible.',
    options: ['3', '4', '1', 'Error'],
  },
  l12: {
    prompt: 'in can search a dictionary too — but it only checks the "labels" (keys), not the "contents" (values)! What does it print? (The name value means "Pipi".)',
    explain: '"hp" is a key → True; the name is only a value, not a key → False. To search by value, use hero.values() or iterate.',
    options: ['True True', 'True False', 'False True', 'False False'],
  },
  dd1: {
    prompt: 'A dictionary\'s keys() hands over all the "labels". What does this spell print?',
    explain: 'hero has two keys: "name" and "hp", so len(hero.keys()) is 2. Writing len(hero) directly gives the same result.',
    options: ['2', '1', '6', 'Error'],
  },
  dd2: {
    prompt: 'To put a new item into a dictionary, just "stick on a new label". What does this spell print? (The items are sword and shield.)',
    explain: 'bag["shield"] = 2 adds a new key-value pair; the dictionary now holds two entries, so its length is 2. No append needed — assignment adds.',
    options: ['1', '2', '3', 'Error'],
  },

  // ============ W2 · Conditionals / Loops (w2lair) ============
  d2: {
    prompt: 'if is a "fork in the road": with a True condition take the left, otherwise the right. Armor is 8, less than 10 — what does the screen print? (The words mean "sturdy" and "fragile".)',
    explain: 'armor >= 10 is 8 >= 10, which is False, so the else branch runs and prints "fragile".',
    options: ['坚固', '脆弱', '坚固 脆弱', 'Nothing is printed'],
  },
  d3: {
    prompt: 'elif chains several forks together. The score is 85 — which grade is printed?',
    explain: 'Conditions are checked top to bottom: 85 >= 90 fails, then 85 >= 80 succeeds; it prints A and stops — later branches are never checked.',
    options: ['S', 'A', 'B', 'S and A'],
  },
  d4: {
    prompt: 'while True is "magic that repeats forever", but break can shatter it anytime. What is the final n printed?',
    explain: 'n becomes 1, 2, 3 in turn; when n == 3 holds, break jumps out of the loop immediately, so 3 is printed. Without break, while True would spin forever.',
    options: ['2', '3', '4', 'Infinite loop'],
  },
  d5: {
    prompt: 'and / or are spells for "combining conditions". Plenty of HP and holding a key — can this door be passed?',
    explain: 'and requires both sides to be True: hp > 0 is True and have_key is True, so the result is True. or needs only one True; not flips True/False.',
    options: ['True', 'False', 'None', 'Error'],
  },
  d7: {
    prompt: '!= tests "not equal". HP is exactly 0 — what does this spell print? (The messages mean "still fighting" and "fallen".)',
    explain: 'hp != 0 is 0 != 0, which is False, so the else branch prints "fallen". != checks whether two sides differ.',
    options: ['还能战斗', '倒下了', 'Nothing is printed', 'Error'],
  },
  d8: {
    prompt: 'while repeats as long as the condition holds. The countdown spell is cast! What is printed, in order?',
    explain: 'n starts at 3: print 3, decrement to 2; print 2, decrement to 1; print 1, decrement to 0. Now n > 0 fails and the loop ends — so 3 2 1, never 0.',
    options: ['3 2 1', '3 2 1 0', '1 2 3', '0 1 2 3'],
  },
  d9: {
    prompt: 'for pairs not only with range — it can walk a list directly, taking out each member in turn. What does this spell print?',
    explain: 'for takes 1, 2, 3 in turn into x, each time running print(x * 2): 2, 4, 6 — so it prints 2 4 6.',
    options: ['2 4 6', '1 2 3', '123', '2 2 2'],
  },
  d10: {
    prompt: 'not is the "reversal spell": True becomes False, False becomes True. What does this spell print?',
    explain: '3 > 5 is false, giving False; not False flips to True. not is the standard way to express "the condition is not met".',
    options: ['True', 'False', 'None', 'Error'],
  },
  d11: {
    prompt: 'range can also take a starting point! What does range(1, 4) make this spell print, in order?',
    explain: 'range(start, stop) is "inclusive head, exclusive tail" like a slice: starting at 1 and ending before 4, it yields 1, 2, 3. range(3) is shorthand for range(0, 3).',
    options: ['1 2 3 4', '1 2 3', '2 3 4', '1 4'],
  },

  // ============ W2 · Python the Great Serpent (w2boss) ============
  boss: {
    prompt: 'The shield of Python the Great Serpent is woven from "repetition magic"! How many times does range(3) make this spell chant?',
    explain: 'range(3) generates 0, 1, 2 — three numbers — and the for body runs once per number, so the attack print executes 3 times.',
    options: ['1 time', '2 times', '3 times', 'Forever'],
  },
  boss_b: {
    prompt: 'The Serpent\'s shield is charging up! What is the final total printed?',
    explain: 'range(4) generates 0, 1, 2, 3. total += i accumulates 0, 1, 3, 6 — so the final print is 6.',
    options: ['4', '6', '10', '0'],
  },
  boss_c: {
    prompt: 'The shield spell can take a starting point too! How many times does range(2, 5) make this spell chant?',
    explain: 'range(2, 5) includes the head but not the tail: it generates 2, 3, 4 — three numbers — so the body runs 3 times. Count = 5 - 2 = 3.',
    options: ['2 times', '3 times', '5 times', '4 times'],
  },
  boss_d: {
    prompt: 'The Serpent stitches its shield fragments together bit by bit! What does this spell print in the end? (The character means "shield".)',
    explain: 'The loop runs 3 times, each appending one shield character: one, two, then three. String += inside a loop is the classic way to accumulate results.',
    options: ['盾', '盾盾', '盾盾盾', 'Empty string'],
  },

  // ============ W3 · NumPy (w3shard) ============
  np1: {
    prompt: 'NumPy\'s ndarray (array) is the basic spell material of scientific computing. What does this spell print?',
    explain: 'np.array turns a list into an array; indexing follows the list rules (starting at 0): a[0] is 1, a[2] is 3, and their sum is 4.',
    options: ['4', '1', '3', 'Error'],
  },
  np2: {
    prompt: 'Array operations cast "on every element at once" (vectorization)! What does this spell print?',
    explain: 'array * scalar multiplies each element separately, giving [2 4 6]. Note NumPy arrays print without commas, separated by spaces — that is how they differ from lists in appearance.',
    options: ['[2 4 6]', '[1 2 3 1 2 3]', '6', 'Error'],
  },
  np3: {
    prompt: 'A 2-D array\'s (matrix\'s) shape tells its "rows × columns". What does this spell print?',
    explain: 'The array has 2 rows of 3 columns each, so its shape is (2, 3). shape is a tuple: rows first, columns second.',
    options: ['(2, 3)', '(3, 2)', '(6,)', '2'],
  },
  np4: {
    prompt: 'A 2-D array is addressed with a "comma index": a[row, column]. What does this spell print?',
    explain: 'a[1, 2] is row 1 (the second row) and column 2 (the third column): row 1 is [4, 5, 6], whose index 2 is 6.',
    options: ['6', '5', '3', '2'],
  },
  np5: {
    prompt: 'The colon : means "whole row / whole column". To take column 0 (the first number of every row), what does this spell print?',
    explain: 'In a[:, 0], the : stands for all rows and 0 for column 0: it takes the first number of each row, 1 and 4, giving [1 4]. Very common when extracting one column of a star catalog.',
    options: ['[1 4]', '[1 2 3]', '[1]', '[2 5]'],
  },
  np6: {
    prompt: '"Broadcasting" lets arrays operate directly with a single number. What does this spell print?',
    explain: 'Broadcasting "broadcasts" the 5 onto every element: 10+5, 20+5, 30+5, giving [15 25 35]. For example, converting a whole column of wavelengths from nm to Å is just a * 10.',
    options: ['[15 25 35]', '[10 20 30 5]', 'Error', '[15 20 35]'],
  },
  np7: {
    prompt: 'np.arange is the array version of range. What does this spell print?',
    explain: 'np.arange(5) generates the integers 0 to 4 (inclusive head, exclusive tail, just like range). It also supports a float step, e.g. np.arange(0, 1, 0.1).',
    options: ['[0 1 2 3 4]', '[1 2 3 4 5]', '[5]', '[0 1 2 3 4 5]'],
  },
  np8: {
    prompt: 'np.zeros summons a whole row of "empty chests" at once. What is the shape of z?',
    explain: 'np.zeros((2, 3)) creates a 2-row, 3-column array of 0.0s; its shape is (2, 3). Note the argument is the tuple (2, 3) — double parentheses!',
    options: ['(2, 3)', '(3, 2)', '2', '(6,)'],
  },
  np9: {
    prompt: 'Arrays come with built-in statistics spells. What does this spell print?',
    explain: 'mean() averages: (1+2+3+4)/4 = 2.5. Relatives include a.sum(), a.max(), a.min(), a.std() — one cast summarizes a whole column.',
    options: ['2.5', '10', '4', '2'],
  },
  np10: {
    prompt: 'A boolean mask is a "sieve": elements where the condition holds are kept. What does this spell print?',
    explain: 'a > 4 gives the mask [False, True, True, False]; filtering the array with it keeps only 5 and 10, so the length is 2. Selecting stars brighter than a threshold works exactly like this.',
    options: ['2', '4', '3', '0'],
  },
  np11: {
    prompt: 'np.linspace generates "evenly spaced" values — a regular on the x-axis of plots. What is len(x)?',
    explain: 'linspace(start, stop, count) generates the given number of evenly spaced values (both endpoints included!): 0, 2.5, 5, 7.5, 10 — five values. This differs from arange, which excludes the tail.',
    options: ['5', '4', '10', '11'],
  },
  np12: {
    prompt: 'Multiplying two same-shape arrays is "element-wise multiplication". What does this spell print?',
    explain: 'The array * is element-wise: 1×2, 2×2, 3×2 → [2 4 6]. For mathematical matrix multiplication use a @ b or np.dot(a, b).',
    options: ['[2 4 6]', '6', '[3 4 5]', 'Error'],
  },
  np13: {
    prompt: 'argmax reports "where the strongest one stands", not its value. What does this spell print?',
    explain: 'The maximum 9 sits at index 1, so argmax() returns 1 (max() would return 9). Finding the position of the strongest spectral line uses argmax.',
    options: ['1', '9', '0', '2'],
  },
  np14: {
    prompt: 'ndim tells the "number of dimensions" of an array. What does this spell print?',
    explain: 'A 2-D array (matrix) has ndim 2; a 1-D array has 1; an image (rows × columns × channels) has 3. shape tells how long each dimension is; ndim tells how many there are.',
    options: ['2', '4', '1', '(2, 2)'],
  },

  // ============ W3 · Plotting / Scientific Computing (w3heal) ============
  mp1: {
    prompt: 'matplotlib is the "plotting magic". What does plt.plot(x, y) draw?',
    explain: 'plot connects the data points in order with a line (a line chart). Use scatter for dots without lines, hist for distributions.',
    options: ['A polyline through (1,2)(2,4)(3,6)', 'Only three dots, not connected', 'A bar chart', 'A pie chart'],
  },
  mp2: {
    prompt: 'To draw every star as a single point (no connecting lines), which spell belongs in the blank?',
    explain: 'scatter draws scatter plots — the standard for plotting stars by (RA, Dec) or (color, magnitude) in astronomy. plot would connect the points with lines.',
  },
  mp3: {
    prompt: 'A good chart needs axis labels. Which spell adds a text label to the x-axis?',
    explain: 'plt.xlabel(...) labels the x-axis, plt.ylabel(...) the y-axis. Always include the units — good practice for scientific plots!',
  },
  mp4: {
    prompt: 'To see the brightness distribution of 1000 stars (e.g. where the magnitudes concentrate), which spell should you use?',
    explain: 'hist draws a histogram: it buckets the data into bins intervals and shows the count per bucket — the first step in exploring any distribution (brightness, redshift, mass).',
  },
  mp5: {
    prompt: 'Monte Carlo estimation of π: scatter N random points in a unit square; M land inside the quarter circle. Which formula estimates π?',
    explain: 'quarter-circle area / square area = π/4 ≈ M/N, so π ≈ 4M/N = 4×7850/10000 ≈ 3.14. The more points, the better the estimate — that is the Monte Carlo method.',
  },
  mp6: {
    prompt: 'To generate 10 uniform random numbers between 0 and 1 (the Monte Carlo dice), which spell should you use?',
    explain: 'rand(n) generates n uniform random decimals in [0,1); randint gives random integers; linspace is evenly spaced (not random).',
  },
  mp7: {
    prompt: 'SciPy\'s quad is the "integration spell". What does this incantation compute?',
    explain: 'quad(f, a, b) computes the definite integral of f over [a, b]: ∫sin from 0 to π = 2. It returns (integral value, error estimate). Turning a dark matter density into a mass relies on it.',
    options: ['2.0', '0.0', '3.14', '1.0'],
  },
  mp8: {
    prompt: 'A finished chart should travel with you! Which spell saves the figure to a file?',
    explain: 'plt.savefig("filename") saves the current figure as an image. Figures in papers and reports are exported this way (vector formats like pdf/svg are recommended).',
  },
  mp9: {
    prompt: 'Time-series data (e.g. a stellar light curve) is best viewed with which kind of chart?',
    explain: 'A line chart shows how a quantity evolves over time — transit dips and pulsation periods leap out of a light curve. Use hist for distributions and scatter for correlations.',
    options: ['A line chart', 'A pie chart', 'A histogram', 'A scatter matrix'],
  },

  // ============ W3 · Chaos Curve Overlord (w3boss) ============
  nb1: {
    prompt: 'The Chaos Curve Overlord\'s shield is built from arrays! What does this spell print?',
    explain: 'arange(1, 5) generates [1 2 3 4], and sum() adds them all: 1+2+3+4 = 10.',
    options: ['10', '5', '4', '15'],
  },
  nb2: {
    prompt: 'The Overlord\'s curve is warping! What does this spell print?',
    explain: 'a * a squares element-wise to [1 4 9 16]; summing gives 30. This is exactly the "sum of squares" — the loss function of least-squares fitting.',
    options: ['30', '10', '16', '24'],
  },
  nb3: {
    prompt: 'The Overlord summons a noise matrix! What is the shape after reshape?',
    explain: 'reshape(2, 3) rearranges the 6 elements into 2 rows and 3 columns, giving shape (2, 3). The total element count must stay 6, otherwise it errors.',
    options: ['(2, 3)', '(3, 2)', '(6,)', 'Error'],
  },
  nb4: {
    prompt: 'The final strike! Pick out the Overlord\'s weakness with a boolean mask — what does this spell print?',
    explain: 'a > 4 filters out [5 8 9], and sum() adds them to 22. Mask + aggregation is the golden combo of astronomy data processing: filter and summarize in one step.',
    options: ['22', '24', '9', '5'],
  },

  // ============ W4 · Astro packages · shards (w4shard) ============
  ap1: {
    prompt: 'What is the part of a FITS file that records observing information (telescope, coordinates, time) called?',
    explain: 'FITS = header (key-value metadata) + data (N-dimensional array). When reading an image, inspect the header first: exposure, filter, and world-coordinate parameters all live there.',
  },
  ap4: {
    prompt: 'emcee is a famous tool in astronomy. What does it do?',
    explain: 'emcee samples posterior distributions with an affine-invariant MCMC algorithm: 32 walkers wander a 3-dimensional parameter space and ultimately map out confidence intervals.',
    options: ['An MCMC sampler (exploring the posterior of parameters)', 'A plotting library', 'A FITS reader', 'A parallel computing framework'],
  },
  ap5: {
    prompt: 'healpy divides the full sky into equal-area pixels. What is its map?',
    explain: 'HEALPix splits the sphere into 12×NSIDE² equal-area pixels — the all-sky CMB maps of WMAP/Planck are stored this way (the example data of course Week 4 is the WMAP map!).',
    options: ['An equal-area pixel array on the sphere (NSIDE sets the resolution)', 'An ordinary PNG image', 'A 1-D spectrum', 'A galaxy catalog'],
  },
  ap6: {
    prompt: 'The Star-Chart Guardian inspects the WMAP all-sky map with healpy: after hp.ma() veils the map, which spell extracts all "unmasked" valid pixel values?',
    explain: 'hp.ma() turns the map into a masked array: pixels where mask is True are hidden; np.logical_not flips "want to keep" into "want to hide"; .filled() would replace masked pixels with a fixed value, while .compressed() directly hands back all unmasked valid pixels — a required step before tabulating the CMB temperature distribution.',
  },
  ap7: {
    prompt: 'An HDF5 library is like an upside-down tree, with data stored by hierarchy. When reading a catalog under the lensCats group from an HDF5 file, which Table.read argument points to the internal hierarchy?',
    explain: 'Inside HDF5 things are layered like a filesystem: path="/lensCats" points to the "directory" within the file — unrelated to the file\'s location on disk, which is already given by the first argument.',
  },
  ap13: {
    prompt: 'The Star Tower\'s scrolls (FITS files) are made of three kinds of HDU. The Guardian quizzes you: what does each carry?',
    explain: 'A FITS file = an HDUList queue: the 0th is always the PrimaryHDU (primary image data); BinTableHDU is forged with from_columns and carries catalog columns (name + format + array); ImageHDU carries extension images (e.g. multi-band survey frames).',
    options: [
      'Primary carries the main image array, BinTable carries a binary table (catalog columns), Image carries extension images',
      'All three HDUs can only hold images, differing merely in size',
      'Primary carries the header, BinTable images, Image tables',
      'Primary carries a text log, BinTable thumbnails, Image spectra',
    ],
  },
  ap14: {
    prompt: 'The Unit Sorcerer chants format="D" while forging a catalog column. What does the letter "D" mean?',
    explain: 'FITS binary table columns declare types with a single letter: D = double-precision float (the standard for coordinates and redshifts), E = single-precision float, J = 32-bit integer, A = string. Precious quantities like redshift demand D.',
    options: ['Double-precision float (64-bit)', 'A datetime string', 'A decimal integer', 'A dictionary type'],
  },
  ap15: {
    prompt: 'You want to save the star-chart scroll as star.fits, but a file of that name already sits in the tower. What happens if writeto is called without overwrite=True?',
    explain: 'writeto refuses to overwrite by default, for data safety: an existing target raises OSError unless you explicitly pass overwrite=True. The Guardian never lets one slip of the hand erase a whole night of observations.',
    options: [
      'It raises OSError — astropy refuses to overwrite existing files by default',
      'It silently overwrites the old file',
      'It renames the new file to star(1).fits and saves anyway',
      'It appends the new data to the end of the old file',
    ],
  },
  ap16: {
    prompt: 'The Star Tower cellar must stock 500 GB of simulation data, to be read later in many small random chunks. Going by the lecture\'s format checklist, which format fits?',
    explain: 'HDF5 groups by hierarchy (path points the way) and stores in chunks: reading one chunk touches only that chunk on disk, not the whole file — the natural choice for 500 GB-scale numeric data. FITS is the common currency of observations; CSV/JSON suit small tables and configs; Pickle is not cross-language.',
    options: [
      'HDF5 — hierarchical groups + chunked storage, born for random access to large numeric data',
      'CSV — plain text, best portability',
      'JSON — human-readable, first choice for configs',
      'Pickle — can hold any Python object',
    ],
  },
  ap17: {
    prompt: 'Ordered by the lecture to install healpy, the Guardian first runs conda create -n, then activate — two extra steps. Why?',
    explain: 'Different projects often demand conflicting package versions — install everything into base and chaos eventually reigns. conda create -n builds an isolated environment, conda activate switches into it; healpy lives inside, use-and-discard, while base stays clean.',
    options: [
      'Dependency isolation: healpy and its dependencies live only in the astro environment, leaving base unpolluted and avoiding version clashes with other projects',
      'conda installs packages faster than pip',
      'conda activate speeds up your Python code',
      'No third-party package can be imported without creating an environment first',
    ],
  },

  // ============ W4 · Astro packages · temple runes (w4lair) ============
  ap8: {
    prompt: 'The FITS Temple\'s catalog is carved into a binary-table HDU. To see at a glance which columns the table has (the list of column names), which attribute of the data part hits the mark?',
    explain: '.names returns the list of column names (e.g. ["ZLENS", "IMSEP", "NIMG"]). .columns gives the full column objects (with format and other metadata); keys belongs to dictionaries — mind the door you knock on.',
  },
  ap9: {
    prompt: 'The temple archive holds all manner of lens systems; the guardian only admits rows where the NIMG column equals 2. What belongs in the blank?',
    explain: "FITS tables fetch a column with brackets + the column-name string: table_data['NIMG'] returns the whole column; == 2 gives a boolean mask; indexing with the mask keeps only the True rows — a direct descendant of Week 3's NumPy boolean filtering.",
  },
  ap18: {
    prompt: 'Summoning the MCMC sampler: emcee.EnsembleSampler(nwalkers, ndim, log_probability, args=(x, y, yerr)). What does the fourth argument args carry?',
    explain: 'The first three parameters are the essentials: walker count, parameter dimension, and the posterior function; args is the data luggage delivered to the posterior — log_probability(theta) only computes probability, while x, y, yerr are escorted in by args. Initial positions are passed separately as pos to run_mcmc.',
    options: [
      'Extra positional arguments for log_probability (the data x, y, yerr) — forwarded unchanged at every call',
      'The initial positions of the nwalkers walkers',
      'A random seed, making the sampling reproducible',
      'The number of parallel processes each walker uses',
    ],
  },
  ap19: {
    prompt: 'Back from sampling, the sorcerer tidies the chain: sampler.get_chain(discard=100, thin=15, flat=True). What do the three parameters each do?',
    explain: 'The front of the chain is a "warm-up" — the walkers have not yet gathered around the posterior peak, so discard burns that whole stretch; adjacent steps are highly correlated, so thin keeps 1 in 15 for near-independence; flat flattens (steps, walkers, ndim) into (steps×walkers, ndim), ready for percentile in one go.',
    options: [
      'Discard the first 100 steps (unconverged burn-in), keep 1 of every 15 steps (decorrelation), flatten all walkers into (N, ndim)',
      'Discard 100 walkers, keep 1 of every 15 walkers, reduce to a 1-D array',
      'Re-sample 100 times, enlarge the step by 15×, keep only walker 0\'s chain',
      'Discard the last 100 steps, randomly keep 15% of steps, transpose the array',
    ],
  },
  ap20: {
    prompt: 'The Unit Sorcerer lays down a uniform-prior ward: parameter m confined to (-5, 5), b to (-10, 10). What does this spell print?',
    explain: 'Uniform prior: within the bounds the density is constant, so its log is 0.0; outside, probability is zero and log(0) = -inf — the moment MCMC sees -inf, that position is ruled out. Here (2.0, 4.0) is inside both bounds → 0.0; for (-6.0, 4.0) m is out of bounds → -inf.',
    options: ['0.0 -inf', '-inf 0.0', '0.0 0.0', '-inf -inf'],
  },
  ap21: {
    prompt: 'The MCMC closing report! The lecture uses np.percentile(flat_samples[:, 0], [16, 50, 84]) to report the fitted parameter m. What do the three quantiles correspond to?',
    explain: '[16, 50, 84] spans exactly ±1σ: for a normal distribution about 16% falls below the lower 1σ and 84% below the upper 1σ. The median q50 is the best estimate; q84−q50 and q50−q16 are the upper/lower 1σ errors — the standard MCMC reporting format.',
    options: [
      'The 50th percentile = median (best estimate); differences with the 16/84 percentiles = lower/upper 1σ errors',
      'The 50th percentile = mean; the two differences = ±2σ errors',
      'The 50th percentile = the upper confidence limit; the differences = the prior range',
      'The 16/50/84 percentiles give three different models of the parameter',
    ],
  },
  ap22: {
    prompt: 'The oracle machine atop the Star Tower (sklearn): 10 samples go to train_test_split(test_size=0.2, random_state=0). What does this spell print?',
    explain: 'test_size=0.2 → 20% (10×0.2 = 2 samples) goes to the validation set, the remaining 80% (8) to training — split first, then fit/predict, then verify with accuracy_score: the first step of the lecture\'s MNIST pipeline. With random_state fixed, the split is reproducible.',
    options: ['8 2', '2 8', '9 1', '10 2'],
  },

  // ============ W4 · Unit Sorcerer (w4boss) ============
  ap10: {
    prompt: 'The Unit Sorcerer\'s scroll is an HDUList queue! First a PrimaryHDU goes in, then an ImageHDU is appended, and another inserted at index 1. What does this spell print?',
    explain: 'append puts ones at the end (index 1); insert(1, ...) pushes zeros into index 1, squeezing ones to index 2. The queue has 3 members; hdul[2] is ones with shape (2, 2). A FITS file is an HDUList: the 0th is always the PrimaryHDU.',
    options: ['3 (2, 2)', '2 (4,)', '3 (4,)', '4 (2, 2)'],
  },
  ap11: {
    prompt: 'The sorcerer waves the staff! In the lens catalog, IMSEP (angular separation of the two images) and ZLENS (lens redshift) first pass a boolean mask, then column arithmetic. What does this spell print?',
    explain: 'Both mask conditions hold; the image is magnified by the factor (ZLENS+1): IMSEP×(ZLENS+1) = 2.0×2.0 = 4.0 (the deltaTheta of the lecture\'s lensing geometry). Mask rows first, then do algebra on columns — the golden combo of catalog processing.',
    options: ['4.0', '3.0', '2.0', '5.0'],
  },
  ap12: {
    prompt: 'The sorcerer\'s final judgment! When the MCMC sampler steps into the forbidden zone of the prior (log_prior returns -inf), what does log_probability rule?',
    explain: 'A prior of -inf means "probability zero here": probability 0 × any likelihood is still 0, so the posterior log short-circuits to -inf — np.isfinite specifically detects ±inf and NaN, the standard MCMC firewall idiom.',
    options: ['-inf — the prior vetoes outright, the likelihood is never even computed', '0.0 — stays neutral', 'Only the value of log_likelihood is returned', 'NaN error'],
  },

  // ============ W5 · Speed-up · engine shards (w5shard) ============
  sp1: {
    prompt: 'Rewriting a Python for loop as a NumPy array operation (vectorization) typically speeds things up by how much?',
    explain: 'Vectorization replaces the interpreted Python loop with a batch operation in C, typically 1–2 orders of magnitude faster. The first step of any speed-up is always "vectorize whatever can be vectorized".',
    options: ['Several-fold up to a hundredfold (the loop runs in C)', 'Exactly the same speed', 'Slower, actually', 'Less than twofold'],
  },
  sp2: {
    prompt: 'What does numba\'s @jit decorator do?',
    explain: '@jit compiles the function to machine code on its first call; number-crunching loops can reach near-C speed — the Week 5 N-body experiment is the course\'s example.',
    options: ['Compiles the Python function to machine code just in time', 'Turns the function into a coroutine', 'Moves the function to the GPU', 'Caches the function\'s return values'],
  },
  sp5: {
    prompt: 'What does the KISS rule, repeated throughout the course, remind us of?',
    explain: 'KISS + Occam\'s razor: make the code correct and simple first, profile to find the bottleneck, then optimize that spot. Premature optimization is the root of all evil.',
    options: ['Make it right before making it fast — no premature optimization', 'Always pick the fastest algorithm', 'The fewer lines of code the better', 'Use only built-in functions'],
  },
  sp9: {
    prompt: 'The lecture\'s closing Easter egg: after demoing eight speed-up schemes, the author runs a single line, spi.quad(np.sin, 0, π/2), and it beats every optimization before it. What RULE NO.2 does this convey?',
    explain: 'RULE NO.2: the best way to do less work is to let someone else\'s excellent code do it for you. quad is adaptive Gaussian quadrature — one line yields the integral 1.0 with an error estimate at the 1e-16 level. Check the docs before writing your own: the first law of optimization.',
    options: [
      'Before optimizing anything, check whether NumPy/SciPy already has it — one library call often beats any hand-written speed-up',
      'Every computation should be rewritten with quad',
      'Hand-written code is always faster than library functions',
      'scipy is the only speed-up tool worth learning',
    ],
  },
  sp10: {
    prompt: 'On the forge wall is carved the original Occam\'s razor: "Entities should not be multiplied beyond necessity". What does this razor teach us about writing code?',
    explain: '"Do not multiply entities beyond necessity": every extra abstraction layer, dependency or branch adds cost in bugs and maintenance. It is the flip side of KISS — KISS says "stay simple", the razor says "cut the excess"; simple is not crude, it is exactly enough.',
    options: [
      'Do not add entities without need — if a simple solution works, do not introduce needless abstractions, dependencies or branches',
      'Fewer objects in the program means faster code, so merge all similar variables',
      'The more entity classes you use, the more maintainable the code',
      'Multiplying your line count by a safety factor reduces bugs',
    ],
  },
  sp11: {
    prompt: 'The Sluggish Troll asks: why can\'t Python\'s multithreading chew through CPU-bound tasks? And how does multiprocessing get around it?',
    explain: 'CPython\'s GIL (global interpreter lock) ensures only one thread executes bytecode at a time within a process — however many threads, CPU-bound work takes turns on a single core. Each multiprocessing child has its own interpreter and GIL, truly filling multiple cores. Threads waiting on I/O release the GIL, so threading still suits I/O-bound work.',
    options: [
      'The GIL lets only one thread run Python code at a time within a process; multiprocessing gives each process its own interpreter (and its own GIL)',
      'The GIL randomly deletes thread data; multiprocessing protects it with encryption',
      'Threads actually run in parallel all along, the results just are not shown; multiprocessing merely looks nicer',
      'The GIL only limits disk I/O; multiprocessing bypasses the network protocol',
    ],
  },
  sp12: {
    prompt: 'The Troll lays out two piles of ore and asks which belongs in the parallel forge. What is the criterion for "can this be parallelized"?',
    explain: 'Parallelism requires independent tasks: each Monte Carlo draw has nothing to do with the others, so 4 processes give roughly 4× throughput — such problems are called embarrassingly parallel. A recurrence where each term needs the previous one cannot be split; only vectorization or compilation can speed it up on one core.',
    options: [
      'A — the tasks are independent (embarrassingly parallel); nobody waits for anybody, naturally spread across cores',
      'B — each step needs the previous result, so splitting it apart is most valuable',
      'Neither can be parallelized; you must buy a faster CPU',
      'Both parallelize equally well; it depends on memory size',
    ],
  },
  sp13: {
    prompt: 'The spell to launch an MPI program is mpirun -np 4 python pi.py. What does this command actually do?',
    explain: 'mpirun (an alias of mpiexec) is the MPI launcher: -np 4 sets the process count; it spawns 4 independent Python interpreters running the same pi.py. Each process gets its rank (0–3) via comm.Get_rank() and the total via comm.Get_size() — only then can work be divided and messages exchanged.',
    options: [
      'Starts 4 independent Python processes running the same script; each can then claim its number via rank',
      'Creates 4 threads sharing memory inside 1 process',
      'Cuts the script into 4 pieces and distributes them to 4 different computers',
      'Runs a single process at 4× the CPU clock rate',
    ],
  },
  sp14: {
    prompt: 'The lecture\'s verdict on JAX is "currently the fastest and easiest". How does it carry both speed and ease at once?',
    explain: 'JAX\'s two treasures: jax.numpy has an API nearly identical to numpy (almost zero learning cost — change the import name and go); code is compiled by XLA into highly optimized machine code and can run on GPU/TPU. In the lecture\'s Simpson benchmark JAX comes closest to C while keeping numpy\'s readability — speed and ease in one.',
    options: [
      'jnp syntax is a near-copy of numpy (near-zero learning cost), with XLA compiling to optimized machine code underneath — and it runs on GPU',
      'It ships with the world\'s largest free supercomputing cluster',
      'It replaces vectorization with finely tuned Python for loops',
      'It encrypts and compresses numpy code, decompressing at runtime for extra speed',
    ],
  },
  sp15: {
    prompt: 'Speed-up rule #4 warns: function calls are expensive. Which of these is the typical anti-pattern inside a hot loop?',
    explain: 'One Python function call pays for a stack frame, argument binding, name lookup… trivial once, but paid every step of a hot loop it is amplified n times. The rule: move the loop inside the function body, or vectorize / compile with numba so the expensive call happens only once.',
    options: [
      'Style one — paying the call overhead every step of a hot loop, amplified n times over; move the loop inside the function instead',
      'Style two — the longer the function body, the slower it runs',
      'The two cost exactly the same; it is purely a style difference',
      'Style one is faster, because f was defined long ago',
    ],
  },

  // ============ W5 · Speed-up · abyss runes (w5lair) ============
  sp3: {
    prompt: 'What is multiprocessing\'s Pool.map good for?',
    explain: 'Each process has its own interpreter, bypassing the GIL — ideal for batches of independent tasks (e.g. fitting 1000 light curves separately).',
    options: ['Farming out many independent tasks to multiple processes (bypassing the GIL)', 'Making a single function faster', 'Reducing memory use', 'Auto-vectorizing loops'],
  },
  sp4: {
    prompt: 'What does mpi4py\'s comm.Bcast([data, MPI.DOUBLE], root=0) do?',
    explain: 'The capitalized Bcast broadcasts an array buffer directly: [data, MPI.DOUBLE] describes "buffer + element type" and root=0 names process 0 as the source; afterwards every process\'s data matches it. The lowercase bcast broadcasts arbitrary Python objects but is slower; gather/scatter collect/distribute; Barrier is the synchronization fence.',
    options: ['Broadcasts the rank-0 process\'s array buffer to every process', 'Collects every process\'s data to rank 0', 'Sets up a synchronization barrier', 'Reduces (sums) all processes\' data'],
  },
  sp16: {
    prompt: 'The forge core incantation: composite Simpson weights the sum as Δx/3·[y0 + 4y1 + y2 + …], weights alternating 1-4-1. With N=2 subintervals on [0,1] integrating f(x)=1, what does this spell print?',
    explain: 'With N=2 there are 3 nodes with weights exactly 1-4-1: Δx/3 × (1×1 + 4×1 + 1×1) = (0.5/3)×6 = 1.0 — exactly the value of ∫₀¹1dx. Composite Simpson groups in pairs: end weights are always 1, the midpoints inside each pair (odd nodes) weigh 4, and even nodes shared by adjacent pairs weigh 1+1=2.',
    options: ['1.0', '0.5', '2.0', '6.0'],
  },
  sp17: {
    prompt: 'Why does the numba Simpson loop use range(1, N, 2)? In the Troll\'s quenching chamber, what is the trick hidden in this loop?',
    explain: 'Composite Simpson goes two subintervals at a time: each pair [x_{i-1}, x_i, x_{i+1}] carries the weights 1-4-1. range(1, N, 2) starts at the first odd node and steps by 2 to the next odd node — each step swallows one whole pair, no overlap, no gap. @jit(nopython=True) compiles that loop to machine code at near-C speed.',
    options: [
      'Stepping by 2 skips across one pair of subintervals per step: i lands on odd nodes, accumulating the 1-4-1 contribution of all three at once',
      'Stepping by 2 merely halves the iteration count; the skipped nodes are auto-computed by numpy',
      'range(1, N, 2) is numba-only syntax that does not exist in pure Python',
      'Stepping by 2 makes the loop traverse the array backwards from the end',
    ],
  },
  sp18: {
    prompt: 'Forging a sword with ctypes in five steps: write C → compile with gcc -O2 --shared into .so → load with ct.CDLL → declare argtypes/restype → wrap in Python. argtypes declares the array parameter with np.ctypeslib.ndpointer — what does that accomplish?',
    explain: 'ndpointer translates a numpy array\'s identity into a "pointer to double" that C understands: at call time the array buffer is passed in place, zero-copy — one of the keys to the ctypes route\'s speed. Together with a restype declaration, the C function feels like a native Python function; the remaining steps are all indispensable.',
    options: [
      'It tells the C function that this parameter is a numpy array buffer (data pointer) — the array enters C directly, zero-copy',
      'It first translates the numpy array into a Python list and passes the items one by one',
      'It makes an encrypted copy of the array so C cannot corrupt the original',
      'It declares the array\'s print format so C can debug with printf',
    ],
  },
  sp19: {
    prompt: 'The OpenMP Simpson: each thread accumulates a private partial_S first, then merges into the total — we see #pragma omp critical. Why can that pragma not be omitted?',
    explain: 'S += partial_S is not atomic: if two threads read-modify-write the shared S concurrently, one update can be lost — the result comes out randomly low. critical marks a critical section admitting one thread at a time; the merge is serial but safe. Private partial accumulation with one final critical merge is the standard OpenMP reduction pattern (mirrored by mpi4py\'s Reduce).',
    options: [
      'S += partial_S is not atomic: concurrent read-modify-write of the shared S loses updates; critical lets only one thread merge at a time',
      'critical automatically moves the merge step onto the GPU',
      'Without it partial_S could not be initialized to 0',
      'It is only a comment for the compiler; deleting it just tidies the code',
    ],
  },
  sp20: {
    prompt: 'Before the mpi4py collective Scatterv, divmod splits N=100000001 elements among 4 processes. What does this chunking spell print?',
    explain: 'divmod(a, b) gives (quotient, remainder) in one step: 100000001 = 4×25000000 + 1. The standard variable-length split: the first remainder processes get quotient+1 each, the rest quotient each — summing to exactly N; Scatterv then distributes the segments per counts/displ. By the way — 100000001 is odd, and composite Simpson needs an even N.',
    options: [
      '25000000 1 — every process gets at least 25 million, and the first 1 process gets one extra',
      '25000000 0 — split evenly, not one more nor less',
      '25000001 1 — every process gets 25 million and 1',
      'Error: 100000001 is not divisible by 4',
    ],
  },

  // ============ W5 · Sluggish Troll (w5boss) ============
  sp6: {
    prompt: 'The Troll\'s forge scroll bears Simpson integration with N=100000001 — composite Simpson weights in "1-4-1" pairs, so the number of subintervals must be even. What does this spell print?',
    explain: 'Composite Simpson pairs subintervals with weights 1-4-1, so N must be even. 100000001 % 2 = 1 exposes it as odd — the lecture warns of this trap twice: just add or subtract 1.',
    options: ['1 (odd! Add or subtract 1 before using it)', '0 (even as required)', '100000001', 'Error'],
  },
  sp7: {
    prompt: 'mpi4py spreads tasks with range(rank, nruns, size): with nruns=15 tasks and size=4 processes, which rank\'s pocket does Task 7 land in?',
    explain: 'range(rank, 15, 4) gives each rank the tasks numbered ≡ rank (mod 4): rank 0 gets 0, 4, 8, 12; rank 3 gets 3, 7, 11. Task 7 = 4×1+3 → 7 % 4 = 3, belonging to rank 3.',
    options: ['3', '1', '7', '0'],
  },
  sp8: {
    prompt: 'The Troll\'s final trial: the lecture computes the same integral ∫₀^(π/2) sin(x) dx eight ways (naive for / NumPy slicing / scipy.simpson / numba / JAX / ctypes / OpenMP / mpi4py). What are their results?',
    explain: '∫₀^(π/2) sin(x) dx = 1.0. The eight implementations differ only in "how" — the mathematical answer is unique: ≈1.0 (floating-point error at the 1e-16 level). Lesson one of speed-up: confirm everyone computes the same thing, then race.',
    options: ['All roads lead home — all ≈ 1.0 (they differ only in speed)', 'All different, incomparable', 'Only scipy\'s result equals 1.0', 'The parallel versions are more precise'],
  },

  // ============ W6 · Numerical methods · shards (w6shard) ============
  nm1: {
    prompt: 'What does scipy.integrate.quad(f, a, b) compute?',
    explain: 'quad numerically evaluates the definite integral ∫f dx (returning value and error). Integrating a density ρ(r) into a mass M(r) is the classic astronomical use.',
    options: ['The definite integral of f over [a, b]', 'The antiderivative of f', 'The roots of f', 'The minimum of f'],
  },
  nm2: {
    prompt: 'To numerically solve the initial-value ODE problem dy/dt = f(t, y), which spell should you use?',
    explain: 'solve_ivp is SciPy\'s recommended ODE solver: hand it the derivative function, time span and initial value, and it integrates the trajectory step by step (orbit evolution depends on it).',
  },
  nm3: {
    prompt: 'What does curve_fit(model, x, y) do?',
    explain: 'curve_fit tunes model parameters by least squares so the model curve hugs the data. popt is the optimal parameter; the square root of pcov\'s diagonal gives parameter uncertainties.',
    options: ['Finds the parameters that bring the model closest to the data', 'Interpolates between data points', 'Fourier-transforms the data', 'Smooths away the noise'],
  },
  nm5: {
    prompt: 'What does interp1d(x, y)(x_new) return?',
    explain: 'Interpolation answers "what lies between the data points": given a new x, estimate the y with line segments (or cubic splines). Aligning two differently sampled spectra relies on it.',
    options: ['The interpolated value at x_new (linear by default)', 'The derivative at x_new', 'The integral of x to y', 'The slope of a fitted line'],
  },
  nm9: {
    prompt: 'On the temple\'s integration altar, the quad spell drops not one treasure but a "two-piece set": val, err = quad(np.sin, 0, π/2). What structure does quad return?',
    explain: 'quad returns (val, err): val is the integral result, err the absolute error estimate from QUADPACK — here about 1e-14, showing ∫₀^(π/2) sin dx = 1.0 was computed rock-solid. Write val, err = quad(...) to unpack directly. Checking err while integrating ρ(r) into M(r) is a temple priest\'s good habit.',
    options: ['A (value, error estimate) tuple — here ≈ (1.0, 1e-14)', 'A scalar — just the integral 1.0', 'A (value, step count) tuple', 'A (lower bound, upper bound) tuple'],
  },
  nm10: {
    prompt: 'The old spell odeint hides a counter-intuitive trap in the model function\'s signature (the lecture\'s original form). Which signature below is correct?',
    explain: 'odeint is the classic ODE solver, and the lecture\'s example signs it model(y, x): the state y is the first parameter and the independent variable x the second — the opposite of the mathematical habit f(x, y), a notorious pitfall. The newer solve_ivp uses the standard fun(t, y). When switching between the two spells, remember to swap the parameter order!',
    options: [
      'def model(y, x) — the dependent variable y first, the independent variable x second',
      'def model(x, y) — the independent variable x first, the dependent variable y second',
      'def model(y) — the ODE right-hand side needs no independent variable',
      'def model(x, y, dy) — the derivative must also be passed as a parameter',
    ],
  },
  nm11: {
    prompt: 'Root-finding spells come in two schools: solving a single scalar equation f(x) = 0, and solving a vector system with several unknowns. Which do you use for each?',
    explain: 'root_scalar specializes in 1-D: the root is read from the sol.root attribute. root targets systems: pass a vector-valued function plus an initial guess, and the solution sits in the sol.x array (default hybrid "hybr" algorithm). Using the wrong one risks errors — or worse, silently wrong answers. Do not mix up the two forks in the labyrinth.',
    options: [
      'Scalar with root_scalar (e.g. the secant method), systems with root (hybr by default)',
      'Scalar with root, systems with root_scalar',
      'root_scalar and root both solve only scalar equations',
      'root_scalar and root both solve only systems',
    ],
  },
  nm12: {
    prompt: 'scipy.misc.derivative(f, x0, dx) numerically differentiates "a scalar function you have an expression for" via finite differences. For f(x) = x³ + x² at x = 1.0 (dx = 1e-6), what is the result approximately?',
    explain: 'derivative defaults to the central difference (f(x+h) − f(x−h)) / 2h with error O(h²) — at h=1e-6 the error is ~1e-12, so rounding gives the exact value f′(1) = 3+2 = 5.0. Note: scipy ≥1.12 removed scipy.misc.derivative; for sampled arrays use np.gradient instead.',
    options: [
      '≈5.0 (f′(x) = 3x² + 2x, f′(1) = 5)',
      '≈3.0 (only the cubic term)',
      '≈2.0 (only the quadratic term)',
      '≈1.0 (mistaking f(1) for the derivative)',
    ],
  },
  nm13: {
    prompt: 'You hold only a series of discrete samples (an array, no formula) and want each point\'s derivative — the lecture uses np.gradient. For [0, 1, 4, 9, 16] (evenly spaced), what does it return?',
    explain: 'np.gradient needs no formula — it eats the data array directly: interior points get central differences (y[i+1]−y[i−1])/2 (e.g. at i=1, (4−0)/2 = 2), and the ends, lacking one neighbor, fall back to one-sided differences (first end 1−0 = 1, last end 16−9 = 7). It is the lecture\'s standard tool for verifying ODE numerical derivatives; a 2-D array returns one gradient array per axis.',
    options: [
      '[1.0, 2.0, 4.0, 6.0, 7.0] — central differences inside, one-sided at the ends',
      '[0, 2, 4, 6, 8] — central differences everywhere',
      '[1, 3, 5, 7, 9] — differences of neighbors',
      '2.0 — returns a single average slope',
    ],
  },
  nm14: {
    prompt: 'How is maximum likelihood estimation (MLE) done numerically? And why take the log first?',
    explain: 'The likelihood is a product of per-point probabilities ∏pᵢ; tens of points multiplied together can underflow to 0. Taking the log turns the product into a sum Σlog pᵢ — numerically stable and easy to differentiate. log is monotonic, so argmax L = argmax logL; a minus sign turns it into the standard minimize form. The lecture\'s line-fit MLE is exactly minimize(negative log-likelihood, initial guess) tuned step by step.',
    options: [
      'Maximizing likelihood = minimizing negative log-likelihood; the log turns a product into a sum and avoids underflow of many small factors',
      'The log merely smooths the curve, moving the argmax',
      'MLE can only be solved analytically, never with minimize',
      'What is minimized is the likelihood itself; the log slows the solver down',
    ],
  },

  // ============ W6 · Numerical methods · labyrinth runes (w6lair) ============
  nm4: {
    prompt: 'To find a root of f(x) = 0 inside the interval [a, b], which spell do you use?',
    explain: 'brentq requires f(a) and f(b) to have opposite signs, then converges robustly to the root. Solving the lensing equation or finding orbit intersections uses it.',
    options: ['brentq (the bracketing root-finder family)', 'quad', 'minimize', 'interp1d'],
  },
  nm15: {
    prompt: 'When the integrand carries extra parameters besides x (f(x, a, b) = a·x + b), how does quad deliver a and b deep into the labyrinth? What does this spell print?',
    explain: 'quad(f, a, b, args=(2, 1)) calls f(x, 2, 1) at every internal quadrature node: the args tuple is appended after x by position. ∫₀¹ (2x+1) dx = 2.0. A density like ρ(r, M₀, Rₛ) with physical parameters plus args= lets one quad sweep the whole parameter space.',
    options: [
      '2.0 — args=(2, 1) makes quad call f(x, 2, 1) at every quadrature node',
      '1.5 — the args are truncated by the integration bounds',
      '3.0 — args are added onto the integral result',
      'Error — quad\'s integrand may only take one parameter',
    ],
  },
  nm16: {
    prompt: 'The secant method is a weapon of root_scalar, but its opening move differs from other root spells — it wants two initial values. What does this spell print?',
    explain: 'The secant method draws a line through two initial points x0, x1 and extrapolates the next guess: no derivative needed (unlike Newton) and no sign change required (unlike brentq). The result lives in a RootResults object; the root is read from sol.root — printing sol directly shows only the iteration log. The root of x³−1 is of course 1.0.',
    options: ['1.0', '0.2', '1.5', 'Error: secant needs only one initial value'],
  },
  nm17: {
    prompt: 'Fitting y = a·x + b with curve_fit, but prior knowledge says the slope a must lie between 0 and 10. With bounds= in place, what does this spell print?',
    explain: 'bounds= takes (array of lower bounds, array of upper bounds), one slot per parameter: ([0, -inf], [10, inf]) means a∈[0, 10] with b unbounded. The true a=3 lies inside the bounds here, so the fit gives ≈(3.02, 1.86); an optimum outside would be pressed onto the boundary. This is most used for non-negative physical quantities (mass, amplitude, count rate).',
    options: [
      '[3.02, 1.86] — bounds=([lower bound per parameter], [upper bound per parameter]), a clamped into [0, 10]',
      '[3.02, 1.86, 0.0] — an extra out-of-bounds flag is returned',
      'Error: curve_fit does not support parameter bounds',
      '[10.0, 0.0] — both parameters pushed to their bounds',
    ],
  },
  nm18: {
    prompt: 'A second-order ODE (like the spring oscillator y″ = −y) cannot be fed straight to odeint/solve_ivp — they only eat first-order equations. What is the lecture\'s standard trick (order reduction and packing)?',
    explain: 'odeint/solve_ivp only accept first-order ODEs, but any n-th order equation reduces to n first-order ones: introduce z = y′, so y″ = z′ and the equation becomes z′ = −y. Pack y and z into the state vector u = [y, z]; the right-hand side returns [z, −y] and the initial value is [y₀, y′₀]. Springs, pendulums, orbit evolution — all solved this way; it is the last step toward the big N-body example.',
    options: [
      'Let z ≡ y′, pack the state as u = [y, z], and write the first-order system u′ = [z, −y]',
      'Square both sides of the equation to reduce the order',
      'Integrate y″ once more to get a closed-form y',
      'Use quad to treat the second-order equation as a double integral',
    ],
  },
  nm19: {
    prompt: 'Three guards stand in a row in the labyrinth; pair potentials must sum over all i < j — the lecture takes the upper triangle with np.triu to avoid double counting. What does this spell print?',
    explain: 'The pairwise distance matrix is symmetric: r[i,j] = r[j,i], so a plain sum counts every pair twice. np.triu(..., k=1) yields an upper-triangular boolean mask (k=1 skips the diagonal), keeping only i<j cells: (0,1)=1, (1,2)=2, (0,2)=3. The N-body potential sum is exactly these two steps: broadcast for the full matrix, triu to keep half.',
    options: [
      '[1.0, 2.0, 3.0] — every pair counted once (i<j)',
      '[1.0, 1.0, 2.0, 2.0, 3.0, 3.0] — the upper triangle does not deduplicate',
      '[0.0, 1.0, 2.0, 3.0] — the diagonal is included',
      '9.0 — all distances added together',
    ],
  },
  nm20: {
    prompt: 'The N-body gravity F ∝ 1/r² hides a danger: when two particles nearly coincide (r→0) the force diverges and the simulation step size collapses. The lecture\'s fix is softening (length ε) — add ε² to the denominator. With g(r) = 1/(r² + ε²) and ε = 0.5, what does this spell print?',
    explain: 'Bare 1/r² diverges as r→0; near-coincident particle pairs wreck the whole integration. Adding ε² to the denominator: at r=0, g = 1/ε² = 4.0 (finite), while for r≫ε, g ≈ 1/r² (the far field barely notices). Physically, ε means "interactions closer than this are smeared out" — a simulation with a finite particle count cannot resolve such close encounters anyway.',
    options: [
      '4.0 0.8 — finite at r=0 (=1/ε²), no longer diverging',
      'inf 1.0 — softening only works for r>0',
      '4.0 0.5',
      '0.0 0.8 — ε crushes the force to zero at r=0',
    ],
  },

  // ============ W6 · Optimization Minotaur (w6boss) ============
  nm6: {
    prompt: 'In the Minotaur\'s labyrinth six guards stand in a row. The core step of the big N-body example: one line of broadcasting computes every pairwise position difference, then @ the mass vector. What does this spell print?',
    explain: 'x - x[:, None] broadcasts the full 6×6 pairwise differences in one go (diagonal 0); @ with the mass vector weights each row: row i = 0.2×(Σx_j − 6x_i) = 0.2×(21 − 6x_i), giving [3.0, 1.8, 0.6, -0.6, -1.8, -3.0]. Two lines of vectorization replace the double loop — the magic of the Week 6 N-body example.',
    options: ['[3.0, 1.8, 0.6, -0.6, -1.8, -3.0]', '[3.0, 2.0, 1.0, -1.0, -2.0, -3.0]', '[15.0, 9.0, 3.0, -3.0, -9.0, -15.0]', '6'],
  },
  nm7: {
    prompt: 'The Minotaur\'s twin axes split the double integral\'s labyrinth! By hand, compute ∫₀²∫₀¹ x·y² dy dx — what does this spell print?',
    explain: 'The inner ∫₀¹ y² dy = 1/3, the outer ∫₀² x/3 dx = 2/3 ≈ 0.6667. Mind dblquad\'s integrand signature f(y, x) — y comes first! The outer interval [a, b] = [0, 2] belongs to x; gfun/hfun bound y.',
    options: ['0.6667', '1.5', '0.1667', '0.3333'],
  },
  nm8: {
    prompt: 'The labyrinth floor rises linearly along both axes. np.gradient hands back both gradients at once, with sampling spacing 0.1. What does this spell print?',
    explain: 'Along rows (axis 0) the value grows by 10 per row with spacing 0.1 → 10/0.1 = 100.0; along columns (axis 1) it grows by 1 → 1/0.1 = 10.0. np.gradient returns (axis-0 gradient, axis-1 gradient); forgetting the 0.1 spacing would give 10 and 1.',
    options: ['100.0 10.0', '10.0 100.0', '100.0 100.0', '10.0 1.0'],
  },

  // ============ W7 · Linear algebra & signals · shards (w7shard) ============
  sg1: {
    prompt: 'What does np.linalg.eig(A) return?',
    explain: 'eig is the eigen-decomposition spell: Aw = λw. The essence of principal component analysis (PCA) is the eigen-decomposition of the covariance matrix — sorting w from large to small gives the principal components.',
    options: ['Eigenvalues and eigenvectors', 'Determinant and inverse', 'Rank and trace', 'Mean and variance'],
  },
  sg2: {
    prompt: 'What does np.cov(data) compute?',
    explain: 'cov yields the symmetric covariance matrix: the diagonal holds each variable\'s variance, off-diagonal entries measure pairwise co-movement. Galaxy shape analysis and PCA both start here.',
    options: ['The covariance matrix', 'Correlation coefficients', 'Correlation functions', 'A convolution kernel'],
  },
  sg3: {
    prompt: 'Where does np.fft.fft(signal) take the signal?',
    explain: 'The FFT decomposes the signal into a superposition of sine waves of different frequencies — pulsation periods of periodic signals and the spectral signature of instrument noise all hide here.',
    options: ['The frequency domain (complex amplitudes of each frequency)', 'The time domain', 'The image domain', 'The logarithmic domain'],
  },
  sg9: {
    prompt: 'The sanctum\'s twin weapon racks: both scipy.linalg and numpy.linalg can invert, decompose and solve. Why does the lecture recommend scipy.linalg?',
    explain: 'For numpy.linalg, BLAS/LAPACK is optional at build time (it may fall back to naive implementations); scipy.linalg guarantees a bundled optimized build and is a superset of numpy.linalg — the same job can be an order of magnitude faster. The lecture\'s conclusion: prefer scipy.linalg for linear algebra.',
    options: [
      'It covers everything in numpy.linalg, and is always built with optimized BLAS/LAPACK — potentially much faster',
      'Only scipy.linalg supports complex matrices',
      'numpy.linalg is deprecated; its features moved wholesale into scipy',
      'The two backends are fully independent and may disagree on the same matrix',
    ],
  },
  sg10: {
    prompt: 'The Phantom\'s destiny matrix A hides its "natural frequencies". Eigenvalues λ are roots of which equation?',
    explain: 'det(A−λI) is a polynomial in λ (the characteristic polynomial); setting it to zero yields the eigenvalues; then for each λ solve (A−λI)v=0 for the eigenvector. np.linalg.eig hands back (w, v) in one step — that is how PCA digs the principal components out of a covariance matrix.',
    options: [
      '|A − λI| = 0 (the characteristic polynomial set to zero); each λ pairs with an eigenvector satisfying A·v = λv',
      'det(A) = λ',
      'A · Aᵀ = λI',
      'trace(A) = λ',
    ],
  },
  sg11: {
    prompt: 'The gates of the frequency-domain sanctum swing both ways. What does this round-trip spell print?',
    explain: 'fft takes a time-domain signal to the frequency domain; ifft is its inverse: frequency domain → time domain. After the round trip allclose recovers the original signal bit for bit — to filter out a frequency component, act in the frequency domain, then ifft back.',
    options: [
      'True — ifft is the inverse of fft, carrying the spectrum back to the time domain',
      'False — the round trip loses phase information',
      'Error — ifft accepts only real spectra',
      'False — only half the samples can be restored',
    ],
  },
  sg12: {
    prompt: 'Carved on the sanctum wall is the σ confidence table: 1σ=68%, 2σ=95%, 3σ=99.87%… How many σ must particle physics rack up to announce a "discovery", and at what confidence level?',
    explain: 'The lecture\'s σ table: 1σ=68%, 2σ=95%, 3σ=99.87%, 4σ=99.99%, 5σ=99.99994%. The "discovery" of the Higgs boson was announced on the 5σ line — surveys reporting new sources and timing searches for pulsars use the same ruler.',
    options: [
      '5σ, corresponding to 99.99994% (a false-alarm rate of about one in 3.5 million)',
      '3σ, corresponding to 99.87%',
      '5σ, corresponding to 99.5%',
      '2σ, corresponding to 95%',
    ],
  },
  sg13: {
    prompt: 'The sanctum seal Ax=b has two solution routes: inv(A).dot(b) versus np.linalg.solve(A, b). Which does the lecture recommend, and why?',
    explain: 'Explicit inversion costs more work and amplifies rounding error; solve is specialized for solving linear systems (LU decomposition then back-substitution). Rule of thumb: never invert a matrix just to solve an equation — on ill-conditioned matrices the gap blows up.',
    options: [
      'solve — it factors and solves directly, faster and numerically more stable than inverting first',
      'inv(A).dot(b) — inverting first is more intuitive, and the precision is identical',
      'Run both and average the results',
      'You should use np.dot(b, A)',
    ],
  },
  sg14: {
    prompt: 'Two guarding runes: what does np.linalg.matrix_rank(A) count? And what does det(A)=0 proclaim?',
    explain: 'Rank measures the "truly independent information dimensions" of a matrix — full rank is invertible; det=0 means the rows/columns are linearly dependent, the matrix is singular, and Ax=b has no unique solution. Survey correlation matrices often skirt the edge of singularity; rank and determinant are their two health reports.',
    options: [
      'Rank = the maximum number of independent rows/columns; determinant 0 = the matrix is singular, not invertible',
      'Rank = the count of nonzero entries; det=0 = the matrix is the zero matrix',
      'Rank = the number of eigenvalues; det=0 = all eigenvalues equal 1',
      'Rank = the length of the diagonal; det=0 = the matrix is asymmetric',
    ],
  },
  sg15: {
    prompt: 'The sanctum\'s classification guard is a random forest: RandomForestClassifier(n_estimators=100, criterion="gini"). What do the two hyperparameters control?',
    explain: 'A random forest = a stand of decision trees, each seeing a random subset of the data, voting on the verdict; more trees are steadier but slower (the lecture uses the default 100). gini measures the label impurity of a node — the purer, the more it is split. This question covers hyperparameters and evaluation, complementing sg5\'s fit/predict flow.',
    options: [
      'n_estimators: the number of decision trees in the forest (100 voting); criterion: the node-splitting rule (gini impurity)',
      'n_estimators: the maximum depth of each tree; criterion: the random seed',
      'n_estimators: the number of input features; criterion: the number of trees',
      'n_estimators: the number of training iterations; criterion: the gradient-descent learning rate',
    ],
  },

  // ============ W7 · Linear algebra & signals · gallery runes (w7lair) ============
  sg4: {
    prompt: 'A telescope "smears" starlight into a blob (the PSF). Which mathematical operation does this physical process most resemble?',
    explain: 'Observed image = true image ⊛ PSF (convolution). Removing the blur (deconvolution) or simulating an observation both mean dealing with convolution.',
    options: ['Convolution (the PSF slides over the image, multiplying and summing)', 'A correlation function', 'The Fourier transform', 'Matrix inversion'],
  },
  sg5: {
    prompt: 'What is the standard scikit-learn workflow?',
    explain: 'Every sklearn model follows the same spell: fit(X, y) to learn → predict(X) to forecast → score to evaluate. Classifying galaxy morphology or spectra uses it.',
    options: ['fit to train → predict to forecast', 'predict before fit', 'fit alone is enough', 'Hand-written gradient descent is required'],
  },
  sg16: {
    prompt: 'The x-axis of an FFT spectrum is not free — the lecture builds it with freq = np.arange(N)/T (T = N/sr). Sampling rate 2000 over 1 second, peaks at indices 1/4/7. What does this spell print?',
    explain: 'T = N/sr = 2000/2000 = 1 s, so bin k has frequency k/T = k Hz — the axis reads 0, 1, 2, … Hz, and the three peaks land at 1/4/7 Hz. The last item is the Nyquist limit sr/2 = 1000 Hz (at index N/2); beyond it lies the mirror of negative frequencies. sg6 tests the peak heights (A·N/2); this one tests how to read the x-axis.',
    options: [
      '1.0 4.0 7.0 1000.0',
      '1.0 4.0 7.0 2000.0',
      '2.0 8.0 14.0 1000.0',
      '1.0 4.0 7.0 500.0',
    ],
  },
  sg17: {
    prompt: 'On the sanctum mural a bright band: in a 7×7 tile field, columns 2-4 are bright and both sides dark, forming two vertical edges. convolve2d slides a Scharr kernel (negative left, positive right, detecting horizontal brightness jumps) over the image. What are the responses along the middle row at c=1 (left edge), c=3 (band center) and c=4 (right edge)?',
    explain: 'The Scharr kernel [−3 0 3; −10 0 10; −3 0 3] has opposite signs left and right, responding only where brightness jumps horizontally: dark→bright gives −16, bright→dark +16, and flat regions inside the band give 0. 2-D convolution = the kernel sliding over the image, weighted-summing — the lecture uses it to find edges on the ascent image; sg4 covered the 1-D PSF concept, this is the 2-D hands-on version.',
    options: [
      '-16 0 16',
      '16 0 -16',
      '0 0 0',
      '-16 -16 16',
    ],
  },
  sg18: {
    prompt: 'The Phantom\'s court: what does ConfusionMatrixDisplay.from_predictions(y_true, y_pred) draw?',
    explain: 'The confusion matrix shows at a glance "who was mistaken for whom": cell (i, j) counts true-class-i samples predicted as class j; the brighter the diagonal, the better the classification. accuracy_score reports one overall score (the lecture\'s MNIST ≈ 0.97); the confusion matrix gives the full picture — this question covers evaluation, distinct from Week 4\'s train_test_split question.',
    options: [
      'A grid of true labels vs predicted labels: rows = truth, columns = prediction, diagonal = correctly classified samples',
      'A bar chart of per-class predicted probabilities',
      'A diagram of the train/test split',
      'The feature-importance ranking of every tree in the forest',
    ],
  },
  sg19: {
    prompt: 'In the gallery, vector a wants to project itself onto the direction of vector b: proj = np.inner(a,b)/np.inner(b,b) · b. Then it verifies that the residual a−proj is perpendicular to the shadow. What does this spell print?',
    explain: 'sg8 already computed inner(a,b)=80; now ‖b‖²=25+36+49+64+81=255, so the projection coefficient = 80/255 ≈ 0.314 and proj = 0.314·b. The inner product of the residual a−proj with proj is 0 — the geometric essence of projection: no component of the residual can be squeezed out along the shadow.',
    options: [
      '[1.569 1.882 2.196 2.51 2.824] and True (the residual is perpendicular to the shadow)',
      '[5. 6. 7. 8. 9.] and False (the projection is b itself)',
      '[0. 0. 0. 0. 0.] and True (a and b are orthogonal)',
      '[1.569 1.882 2.196 2.51 2.824] and False (the residual is not perpendicular)',
    ],
  },
  sg20: {
    prompt: 'Solving the linear system Ax=B, the lecture first writes np.dot(B, inv(A)) and self-corrects on the next line. Run the pair — what do they print respectively?',
    explain: 'np.dot(B, inv(A)) actually computes B·A⁻¹ (matrix multiplication does not commute; for non-symmetric A this differs completely from A⁻¹B). Checking x+2y=10, 3x+4y=14 gives x=−6, y=8, so inv(A).dot(B) is the correct solution. The lecture erred and immediately self-corrected — order is everything.',
    options: [
      '[1. 3.] and [-6. 8.] — the multiplication order was reversed; the latter is the solution of Ax=B',
      '[-6. 8.] and [1. 3.] — the former is the solution of Ax=B',
      'Both print [-6. 8.] — argument order in dot does not matter',
      'The second line errors — inv\'s result cannot sit on the left of dot',
    ],
  },

  // ============ W7 · Fourier Phantom (w7boss) ============
  sg6: {
    prompt: 'The Phantom\'s roar is a superposition of three pure tones: 1/4/7 Hz, amplitudes 3/1/0.5, sampling rate 2000 over 1 second. What are the amplitudes of the three spikes on the FFT spectrum?',
    explain: 'The FFT spreads each frequency component onto a spectral peak: peak amplitude = A·N/2. With N=2000: 3×2000/2=3000, 1×2000/2=1000, 0.5×2000/2=500 — the amplitude information hides inside A·N/2.',
    options: ['3000 1000 500', '3 1 0.5', '1500 500 250', '1 4 7'],
  },
  sg7: {
    prompt: 'The Phantom sets a three-by-three seal matrix. Solve this linear system — what does the spell print?',
    explain: 'solve(A, b) solves Ax=b, giving x=[5, 3, -2]. Check: 4×5+3×3+2×(−2)=25 ✓, −2×5+2×3+3×(−2)=−10 ✓, 3×5−5×3+2×(−2)=−4 ✓. The lecture recommends solve over inv(A)@b — faster and more stable.',
    options: ['[5. 3. -2.]', '[25. -10. -4.]', '[1. 2. 3.]', 'Error (singular matrix)'],
  },
  sg8: {
    prompt: 'The sanctum\'s three multiplication altars! What do np.inner(a, b) and a * b print respectively?',
    explain: 'a * b is the element-wise (Hadamard) product: [0, 6, 14, 24, 36]; np.inner sums after the element-wise product: 0+6+14+24+36 = 80. The inner product is a scalar, the element-wise product a same-shape array — multiply item by item first, then decide whether to add.',
    options: ['80 and [0 6 14 24 36]', '[0 6 14 24 36] and 80', '80 and 80', '400 and [5 6 7 8 9]'],
  },

  // ============ W8 · Dark matter · shards (w8shard) ============
  dm1: {
    prompt: 'What quantity\'s radial distribution does the NFW profile describe for a dark matter halo?',
    explain: 'The NFW profile is the density distribution of a dark matter halo: divergent at the center (cuspy), falling as r³ in the outskirts. r_s is the characteristic radius and rho_0 the characteristic density.',
    options: ['Density ρ(r)', 'Mass M(r)', 'Luminosity L(r)', 'Temperature T(r)'],
  },
  dm4: {
    prompt: 'In a cosmological N-body simulation, what is the dominant interaction between dark matter particles?',
    explain: 'Dark matter interacts only gravitationally (plus the background of cosmic expansion). Trillions of particles clump, merge and form halos under gravity — that is the Week 8 cosmological simulation.',
    options: ['Gravity (driven by gravity alone)', 'Electromagnetism', 'The strong nuclear force', 'Fluid pressure'],
  },
  dm8: {
    prompt: 'The density scale on the Phantom Dragon\'s scales: the NFW profile ρ(r)=ρ₀/[x(1+x)²] (x=r/Rₛ) — what is the density at the characteristic radius r=Rₛ? Lecture numbers: ρ₀=5, Rₛ=0.3.',
    explain: 'Substituting x=1: ρ(Rₛ)=ρ₀/(1×2²)=ρ₀/4=5/4=1.25. The NFW value at the characteristic radius is always exactly ρ₀/4 — regardless of the specific ρ₀ and Rₛ — a natural scale mark on the dragon\'s scales.',
    options: ['1.25 (exactly ρ₀/4)', '5.0 (equal to ρ₀)', '2.5 (ρ₀/2)', '0.3 (equal to Rₛ)'],
  },
  dm9: {
    prompt: 'The decay spell of the dragon\'s outer wing: at r≫Rₛ, roughly which power of r does the NFW profile fall as? Going from radius 3 to 30 (Rₛ=0.3), to what fraction does the density drop?',
    explain: 'For r≫Rₛ, x≫1 and ρ≈ρ₀/x³ ∝ r⁻³: radius ×10 → density ×10⁻³. The code computes 0.0012 ≈ 1/1000 (at x=10, (1+x)² is not yet fully ≈ x², hence the slight offset). Contrast the inner core r≪Rₛ where ρ∝r⁻¹ (the cuspy central spike) — inner r⁻¹, outer r⁻³: the two faces of the NFW.',
    options: [
      'r⁻³, dropping to about 1/1000 (prints 0.0012)',
      'r⁻¹, dropping to about 1/10',
      'r⁻², dropping to about 1/100',
      'r⁻⁶, dropping to about 1/10⁶',
    ],
  },
  dm10: {
    prompt: 'The dragon\'s two faces: what is the relation between a halo\'s density profile ρ(r) and its cumulative mass M(r)?',
    explain: 'M(r)=∫4πr\'²ρdr\' (the analytic solution of the mass integral is exactly dm6\'s formula); differentiating it returns the density at once: dM/dr=4πr²ρ. Density and mass are two faces of the same dragon — which is why the lecture can approach it via both "quasi-density" and "quasi-mass".',
    options: [
      'They are integral/derivative of each other: mass integrates density over volume, and differentiating mass recovers density (dM/dr=4πr²ρ) — knowing either yields the other',
      'They are unrelated; both must be measured independently',
      'Mass follows only from integrating density; the reverse is impossible',
      'Density times r³ gives mass directly, no integral needed',
    ],
  },
  dm11: {
    prompt: 'Of the lecture\'s four MCMC take-home points, which set summarizes them best?',
    explain: 'All four are indispensable: Monte Carlo (random-number simulation) + Markov Chain (the current step decides the next; samples are correlated, not independent) + accept-reject (the Metropolis rule probes toward higher posterior) + convergence checking (confirm burn-in via trace/corner before keeping samples) — a chain before convergence is merely "on the road"; converged samples are the posterior itself.',
    options: [
      '① Monte Carlo: sampling with random numbers; ② Markov Chain: each step depends only on the current state, so chain samples influence each other; ③ the accept-reject rule decides each step; ④ convergence must be checked — only post-convergence samples represent the posterior',
      '① Monte Carlo: deterministic iteration for roots; ② Markov Chain: samples are independent; ③ least squares solves it in one shot; ④ no convergence check needed',
      '① Monte Carlo: grid-enumerate the parameter space; ② Markov Chain: each step depends on the full history; ③ the acceptance probability is always 1; ④ samples are valid forever',
      '① random numbers; ② i.i.d. sampling; ③ reject every deviant sample; ④ pre-convergence samples can serve directly as the posterior',
    ],
  },
  dm12: {
    prompt: 'The deep-space forging art of "inverse transform sampling": to generate samples from a target distribution, what do you feed the uniform random number U~UNIF[0,1] into?',
    explain: 'Inverse transform sampling: write down the target distribution\'s CDF, then feed the uniform U∈[0,1] into its inverse X=F⁻¹(U) — samples of any distribution can be forged this way. Week 8 uses exactly this trick to turn uniform random numbers into dark matter particles following the NFW radial distribution.',
    options: [
      'The inverse of the CDF: X = F⁻¹(U), yielding samples that follow the target distribution',
      'The CDF itself: X = F(U), yielding a uniform distribution',
      'Evaluating the PDF directly',
      'The random generator\'s seed',
    ],
  },
  dm13: {
    prompt: 'The Bayesian divination board — the corner plot: what do the single-parameter distributions on the diagonal, and the dashed truth lines, each represent?',
    explain: 'The corner plot pairs the dimensions of the posterior two by two: off-diagonal cells are 2-D joint posteriors (showing parameter correlations and degeneracy directions); the diagonal holds the marginalized 1-D posteriors (other parameters integrated out); truths=[5.0, 0.3] mark the true values — whether the posterior peak covers the dashed line tells at a glance whether this "divination" worked.',
    options: [
      'Diagonal = each parameter\'s marginalized 1-D posterior; truth lines = the true values used to generate the data, for checking whether the sampling hit',
      'Diagonal = pairwise correlation coefficients; truth lines = the fitted best values',
      'Diagonal = the prior distributions; truth lines = error bar sizes',
      'Diagonal = the full likelihood; truth lines = random reference lines with no meaning',
    ],
  },
  dm14: {
    prompt: 'Project-4\'s linking move: first use scipy.optimize.minimize to find the maximum-likelihood (ML) solution, then from where do the 32 walkers set out to run emcee?',
    explain: 'The frequentist scouts ahead: the ML solution is essentially the posterior peak. Scatter the walkers around it as center with a small Gaussian perturbation of order 0.01 — the chain starts inside the high-probability region and the burn-in shortens dramatically. Starting far away, or all at one identical point, wastes steps climbing (or dooms the whole ensemble to the same wrong peak).',
    options: [
      'Scatter them around the ML solution with a small perturbation (e.g. 0.01×randn) — the starting points sit near the posterior peak, so burn-in converges faster',
      'Pin all walkers exactly on the ML solution, no perturbation at all',
      'Scatter uniformly over the whole prior range, ignoring the ML solution',
      'Start from the origin (0, 0) and let the chain crawl over slowly',
    ],
  },
  dm15: {
    prompt: 'The origin of the NFW profile: how was the universal dark-matter-halo density shape ρ(r)=ρ₀/[x(1+x)²] first discovered?',
    explain: 'NFW = Navarro, Frenk & White (1996): they ran N-body gravitational simulations, measured the density profiles of many halos, and found that halos spanning many orders of magnitude in mass all follow approximately the same two-parameter curve — a paragon of numerical simulation "discovering" a law of physics, and the star of Week 8: the Phantom Dragon.',
    options: [
      'Navarro, Frenk & White (1996) analyzed N-body cosmological simulations and found that dark matter halos of all masses follow roughly the same universal curve',
      'An analytic solution derived from quantum field theory',
      'Measured directly with telescopes from the motion of stars in galaxy outskirts',
      'An exact vacuum solution of Einstein\'s field equations',
    ],
  },

  // ============ W8 · Dark matter · core runes (w8lair) ============
  dm3: {
    prompt: 'After measuring ρ(r) from N-body particles, how do you obtain the NFW parameters r_s and ρ₀?',
    explain: 'Treat the NFW formula as the model and the simulation data as observations; curve_fit finds the best-fitting (rho_0, r_s) — exactly the workflow of the course\'s Week 8 assignment.',
    options: ['Curve fitting (e.g. scipy\'s curve_fit)', 'Reading the file header directly', 'The Fourier transform', 'Machine-learning classification'],
  },
  dm16: {
    prompt: 'The craftsman\'s spell of inverting the CDF: the lecture has a "cumulative mass → radius" table mm/rr. How do you use interp1d to turn it into a "uniform random number → NFW radius" sampler?',
    explain: 'The normalized cumulative mass M(<r) is precisely the CDF of the radius. interp1d(mm, rr) acts as the inverse function F⁻¹: feed in U~[0,1], get back an r following the NFW radial distribution — "inverted CDF + linear interpolation" is the engineering implementation of inverse transform sampling. Mind that the independent variable is mm (the mass quantile), not the radius.',
    options: [
      'Swap x/y when feeding interp1d: interp1d(mm, rr) takes the cumulative mass mm as the argument and the radius rr as the value — a uniform u lands in some mass quantile, and you take the corresponding radius',
      'Sort mm and rr separately and add them element-wise',
      'Use interp1d(rr, mm) — look up mass by radius, then take the logarithm',
      'interp1d cannot handle tabular data; an analytic integral formula is required',
    ],
  },
  dm17: {
    prompt: 'When scattering dark matter particles uniformly over a sphere, which is the correct way to draw the polar angle θ and the azimuth ψ?',
    explain: 'Equal area means equal particle count: the area of a latitude band on the sphere ∝ d(cosθ), so a uniform cosθ ↔ uniform on the sphere; a directly uniform θ over-populates the polar caps per unit area (piling up at the poles). The longitude ψ is naturally uniform — 2πu suffices. This is a direct corollary of the solid angle dΩ=sinθ dθ dψ.',
    options: [
      'θ = arccos(2u−1): cos θ must be uniform (a directly uniform θ piles particles at the poles); ψ = 2πu directly uniform',
      'θ = πu directly uniform, ψ = arccos(2u−1) transformed',
      'Both θ and ψ use the arccos(2u−1) transform',
      'θ = 2πu, ψ = πu, both directly uniform',
    ],
  },
  dm18: {
    prompt: 'When fitting the NFW density profile, why does the lecture fit log₁₀ρ vs log₁₀r instead of ρ vs r directly?',
    explain: 'The NFW density spans many orders of magnitude: a direct ρ vs r fit has its χ² monopolized by the few high-density inner points, leaving the outer data invisible. In log₁₀ρ–log₁₀r space the relative residuals of all points are leveled (equivalent to reweighting by density), so the r⁻³ information of the outer wing can also constrain the parameters.',
    options: [
      'The density spans orders of magnitude: a linear fit is dominated by high-density inner points while the outer data drowns; in log space the weights are leveled and the outer r⁻³ wing can constrain the parameters',
      'Because curve_fit accepts only logarithmic input',
      'To make the fitted curve look smoother on the plot',
      'Because taking the log automatically removes all measurement error',
    ],
  },
  dm19: {
    prompt: 'After taking logs, -inf sneaks into the array (log₁₀(0) at r=0) and curve_fit blows up on the spot. What is the lecture\'s exorcism?',
    explain: 'log₁₀(0) = -inf is a mathematical fact, not a bug: the correct fix is a boolean mask — ~np.isinf(arr) builds a True/False array and indexing keeps only the finite values. Hard-replacing inf with 0 would fabricate a fake data point and drag the fit in a wrong direction. That is how Week 8 handles r=0 (or empty bins) after log binning.',
    options: [
      'Boolean mask: arr[~np.isinf(arr)] keeps only the finite elements and fits the clean data',
      'arr[arr == -np.inf] = 0 — hard-replace inf with 0 and carry on',
      'np.delete(arr, 0) — just drop the first element',
      'Round -inf to the nearest finite number',
    ],
  },
  dm20: {
    prompt: 'The "memory length" of the Phantom Dragon\'s chain: what does sampler.get_autocorr_time() measure, and how does it relate to choosing thin?',
    explain: 'Markov chain samples are correlated: adjacent steps are highly similar, and only after enough steps does the chain "forget". The autocorrelation time τ is that memory length — thin at the scale of ~τ (the lecture has τ≈15, hence thin=15, keeping 1 of every 15 steps) so the retained samples are approximately independent and the subsequent percentile statistics stand on solid ground. (W4\'s ap19 tests the semantics of get_chain\'s three arguments; this one tests the meaning of τ and its quantitative link to thin.)',
    options: [
      'The autocorrelation time τ: how many steps the chain needs to "forget" its starting point; thin at the ~τ scale so the retained samples are approximately independent',
      'τ is the total step count, and thin must equal it',
      'τ is the number of walkers, and thin must take that value to parallelize',
      'τ is the convergence criterion: τ < 1 means converged, unrelated to thin',
    ],
  },
  dm21: {
    prompt: 'Two fits of the same dragon: fitting the density profile ρ(r) directly (shell particle count ÷ shell volume), or fitting the cumulative mass M(<r) (particles inside the sphere × per-particle mass). Which does the lecture judge more robust, and why?',
    explain: 'The density ρ=N·m/(4πr²Δr) is noisy: outer shells are sparse, and dividing by the shell volume amplifies the scatter. The cumulative mass M(<r)=N(<r)·m amounts to integrating all the way out — fluctuations cancel and the curve is smooth, and the low-density outskirts are stabilized by the large inner particle counts — more robust parameter estimates. That is why the lecture fits density first (for teaching) then mass (recommended in practice).',
    options: [
      'The mass fit is more robust: M is the integral of ρ — fluctuations average out over the accumulation and the curve is smoother; every radius accumulates all inner particles, making it robust precisely where the sparse outskirts are insensitive',
      'The density fit is more robust: each shell is measured independently, hence more information',
      'The two are fully equivalent and always give identical parameters and errors',
      'The mass fit is more robust only because its formula skips the shell volume division and is shorter to write',
    ],
  },

  // ============ W8 · NFW Phantom Dragon (w8boss) ============
  dm5: {
    prompt: 'Integrating the NFW density ρ(r) from 0 to r yields what?',
    explain: 'Mass = the integral form of density × volume: M(r) grows monotonically with r; its value at r₂₀₀ is the halo mass. The density profile and mass profile convert into each other.',
    options: ['The cumulative mass enclosed within radius r (enclosed mass)', 'The total luminosity', 'The halo concentration parameter', 'The virial temperature'],
  },
  dm6: {
    prompt: 'The dragon\'s true form is the density ρ(r)=ρ₀/[x(1+x)²] (x=r/Rₛ). Integrating the density from 0 to R_max gives the mass M — which formula is correct? (Lecture numbers: ρ₀=5, Rₛ=0.3, R_max=3.)',
    explain: 'Integrating ∫₀^{R_max} 4πr²ρ(r)dr term by term and substituting x=r/Rₛ gives the closed form M = 4πρ₀Rₛ³[ln(1+x) + 1/(1+x) − 1]. With the lecture\'s numbers → M ≈ 2.5257. Density and mass are integral/derivative of each other — the two faces of one dragon.',
    options: [
      '4πρ₀Rₛ³[ln(1+R_max/Rₛ) + 1/(1+R_max/Rₛ) − 1]',
      '4πρ₀Rₛ³ · ln(1+R_max/Rₛ)',
      '(4/3)πρ₀R_max³',
      '4πρ₀Rₛ²[1 − 1/(1+R_max/Rₛ)]',
    ],
  },
  dm7: {
    prompt: 'The dragon breathes out its MCMC memory chain: 32 walkers walked 5000 steps in a 2-D parameter space. Burning the first 1000 steps (discard), keeping 1 of every 15 (thin), then flattening (flat) — how many samples remain?',
    explain: 'discard=1000 burns the unconverged "burn-in", leaving 4000 steps; thin=15 samples by the autocorrelation time to decorrelate → ⌊4000/15⌋=266 steps; flattened ×32 walkers = 8512 samples. (With thin=2, it would be 2000×32 = 64000.)',
    options: ['8512', '64000', '128000', '4000'],
  },
};

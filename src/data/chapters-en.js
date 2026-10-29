// ============================================================
// 章节英文 sidecar（Lane B）：zh 权威源 data/chapters.js 的显示层
// 英文覆写，按章 id 键控。结构与 zh 完全同形（npcLines/extraGreets
// 的函数签名一致），由 core/i18n.js 的 L(ch) 浅合并后交给
// 既有 phaseOf / npcLinesFor / HUD / WorldMap / modal 使用。
// 仅文案，不改动任何进度、存档、地图、题池语义。
// ============================================================

export const CHAPTERS_EN = {
  1: {
    title: 'Chapter 1 · Basics Village',
    subtitle: 'Week 1 · Python Basics I',
    shardLabel: 'code shards',
    fieldName: 'Nova Village',
    lairName: 'Data Dungeon',
    bossName: 'Data Slime King',
    npcName: 'Elder Sela',
    extraGreets: (G) => {
      if (G.progress[8] && G.progress[8].done) {
        return [
          'From variables to dark matter halos… you have finished the whole eight-week journey!',
          'Every rune stone on this continent remembers your name, hero.',
        ];
      }
      if (G.progress[2].done) {
        return [
          'Functions, control flow… even Python the Great Serpent has been sealed by you!',
          'The portal to the east leads to the Scientific Computing Highlands — where everything runs on NumPy.',
        ];
      }
      return null;
    },
    npcLines: {
      new: ({ cp }) => [
        'Welcome to Nova Village, hero! The magic of this continent is powered by "Python spells".',
        'Move with the [Arrow keys] or [WASD], swing your sword with [J] or [Space], and press [E] near glowing things to interact.',
        'Five rune stones are scattered around the village. Answer their Python questions to earn code shards.',
        `Collect ${cp.shardsNeeded} shards and the stone gate to the north will open. The Data Slime King dwells deep in the dungeon… Go!`,
      ],
      collecting: ({ cp }) => [
        `Well done! You already have ${cp.shards} / ${cp.shardsNeeded} shards.`,
        'There are 5 rune stones in the village — some by the pond and in the northeast corner are still unread.',
      ],
      ready: ({ cp }) => [
        `You have collected ${cp.shards} code shards!`,
        'Go to the stone gate in the north; it will open for you.',
        'The rune stones deep in the dungeon record the spells of lists and tuples — read them before challenging the Slime King!',
      ],
      open: [
        'The dungeon is just north. The rune stones inside teach lists, tuples and sets.',
        'The Data Slime King\'s shield can only be broken by solving "data structure" puzzles.',
        'Remember: when your HP runs low, come back to the village for a breather — the slimes you defeated will respawn.',
      ],
      done: [
        'Congratulations on defeating the Data Slime King!',
        'The portal east of the village is open — step through into the Forest of Functions.',
        'The stone tablets there will reveal the secrets of def, parameters and return.',
      ],
    },
    victory: {
      title: '🎉 Chapter 1 Complete!',
      text: 'You defeated the Data Slime King<br />and mastered the basic spells of variables, operators, strings, lists and tuples!',
      next: '▶ Enter Chapter 2 · Forest of Functions',
    },
  },

  2: {
    title: 'Chapter 2 · Forest of Functions',
    subtitle: 'Week 2 · Python Basics II',
    shardLabel: 'function shards',
    fieldName: 'Forest of Functions',
    lairName: 'Control Flow Cave',
    bossName: 'Python the Great Serpent',
    npcName: 'Function Tablet',
    extraGreets: (G) => {
      if (G.progress[8] && G.progress[8].done) {
        return ['Every rune on the tablet is lit — you have completed the entire journey.'];
      }
      if (G.progress[3] && G.progress[3].done) {
        return ['The Chaos Curve Overlord has also fallen to you… the portal to the east leads to the Astro-Package Star Tower.'];
      }
      return null;
    },
    npcLines: {
      new: ({ cp }) => [
        'Traveler… I am the guiding tablet of the Forest of Functions.',
        'A "function" is a scroll of spells you can chant again and again: define it with def, pass materials through parameters, and send treasures back with return.',
        'The glowing rune stones in the forest await you. Answer their questions to collect function shards.',
        `Collect ${cp.shardsNeeded} shards and the seal on the northern cave will open. Something… is writhing in there.`,
      ],
      collecting: ({ cp }) => [
        `You have ${cp.shards} / ${cp.shardsNeeded} function shards. Keep going.`,
        'The rune stones hide by the lake, in the eastern woods and in the southern grove — look carefully.',
      ],
      ready: ({ cp }) => [
        `You have collected ${cp.shards} function shards!`,
        'The northern seal is loosening — go to the cave gate.',
        'Python the Great Serpent coils deep in the cave — unlock the puzzles of control flow before challenging it!',
      ],
      done: [
        'Python the Great Serpent is sealed… you saw through everything with functions and control flow.',
        'The forest is calm again. The portal to the east leads to the "Scientific Computing Highlands".',
      ],
    },
    victory: {
      title: '👑 Chapter 2 Complete!',
      text: 'You sealed Python the Great Serpent<br />and collected the spells of functions, dictionaries and control flow!',
      next: '▶ Enter Chapter 3 · Scientific Computing Highlands',
    },
  },

  3: {
    title: 'Chapter 3 · Scientific Computing Highlands',
    subtitle: 'Week 3 · Scientific Computing',
    shardLabel: 'numeric shards',
    fieldName: 'Scientific Computing Highlands',
    lairName: 'Chaos Lair',
    bossName: 'Chaos Curve Overlord',
    npcName: 'Science Tablet',
    extraGreets: (G) => {
      if (G.progress[8] && G.progress[8].done) {
        return ['The wind on the highlands still blows — and you have packed the whole course into your bag.'];
      }
      return null;
    },
    npcLines: {
      new: ({ cp }) => [
        'Traveler… welcome to the Scientific Computing Highlands. The magic here is driven by NumPy.',
        'An "ndarray" is a magic matrix filled with one kind of material: one cast (vectorization) transforms a whole column of data at once, hundreds of times faster than a for loop.',
        'The rune stones on the highlands record the spells of arrays, indexing, broadcasting and plotting — answer them to collect numeric shards.',
        `Collect ${cp.shardsNeeded} shards and the seal on the northern Chaos Lair will open. The Overlord's shield can only be shattered by the true meaning of NumPy.`,
      ],
      collecting: ({ cp }) => [
        `Collected ${cp.shards} / ${cp.shardsNeeded} numeric shards.`,
        'Tip: NumPy array indexing and slicing follow the same rules as lists.',
      ],
      ready: ['Numeric shards collected! The seal on the northern lair is crumbling…'],
      done: ['The Chaos Curve Overlord has been defeated! The eastern portal leads to the "Astro-Package Star Tower".'],
    },
    victory: {
      title: '⚡ Chapter 3 Complete!',
      text: 'You defeated the Chaos Curve Overlord —<br />the gates of NumPy / SciPy / Matplotlib now stand open for you!',
      next: '▶ Enter Chapter 4 · Astro-Package Star Tower',
    },
  },

  4: {
    title: 'Chapter 4 · Astro-Package Star Tower',
    subtitle: 'Week 4 · Packages for Astronomy',
    shardLabel: 'star-chart shards',
    fieldName: 'Star Tower Plains',
    lairName: 'FITS Temple',
    bossName: 'Unit Sorcerer',
    npcName: 'Star-Chart Tablet',
    npcLines: {
      new: ({ cp }) => [
        'This is the Star Tower Plains — home base of astronomers.',
        'Astronomical data lives in FITS files: the header records coordinates and units, the data part records the numbers of starlight.',
        'Astropy grants you the spells of units (Quantity), coordinates (SkyCoord) and time (Time).',
        `Collect ${cp.shardsNeeded} star-chart shards, break the seal, and subdue the Unit Sorcerer entrenched in the FITS Temple.`,
      ],
      collecting: ({ cp }) => [`Collected ${cp.shards} / ${cp.shardsNeeded} star-chart shards. The FITS header hides the coordinates and units of astronomical data.`],
      ready: ['Star-chart shards collected! The gate of the FITS Temple to the north is opening…'],
      done: ['The Unit Sorcerer has been subdued! The eastern portal leads to the "Acceleration Forge".'],
    },
    victory: {
      title: '🔭 Chapter 4 Complete!',
      text: 'You subdued the Unit Sorcerer<br />and claimed the FITS and Astropy data spells!',
      next: '▶ Enter Chapter 5 · Acceleration Forge',
    },
  },

  5: {
    title: 'Chapter 5 · Acceleration Forge',
    subtitle: 'Week 5 · Speed up Your Code',
    shardLabel: 'engine shards',
    fieldName: 'Acceleration Forge',
    lairName: 'Sluggish Abyss',
    bossName: 'Sluggish Troll',
    npcName: 'Forge Tablet',
    npcLines: {
      new: ({ cp }) => [
        'Beneath the roaring forge, time is compute.',
        'The first spell of speed is "vectorization": if NumPy can do it, don\'t use a for loop.',
        'The second spell is numba\'s @jit: it compiles Python spells into machine language on the fly.',
        `Collect ${cp.shardsNeeded} engine shards, wake the forge, and drive the Sluggish Troll out of the abyss.`,
      ],
      collecting: ({ cp }) => [`Collected ${cp.shards} / ${cp.shardsNeeded} engine shards. Remember the KISS rule: make it right first, then make it fast.`],
      ready: ['Engine shards collected! The seal of the northern abyss is crumbling…'],
      done: ['The Sluggish Troll has been purified by the forge fire! The eastern portal leads to the "Temple of Numerical Methods".'],
    },
    victory: {
      title: '🔥 Chapter 5 Complete!',
      text: 'The Sluggish Troll bows to you —<br />the secrets of vectorization, JIT compilation and parallelism are etched into your scroll!',
      next: '▶ Enter Chapter 6 · Temple of Numerical Methods',
    },
  },

  6: {
    title: 'Chapter 6 · Temple of Numerical Methods',
    subtitle: 'Week 6 · Numerical Methods I',
    shardLabel: 'numeric shards',
    fieldName: 'Temple Outer Court',
    lairName: 'Optimization Labyrinth',
    bossName: 'Optimization Minotaur',
    npcName: 'Temple Tablet',
    npcLines: {
      new: ({ cp }) => [
        'This is the Temple of Numerical Methods — where scientific questions become numbers.',
        'The spells of scipy cover everything: quad for integrals, solve_ivp for ODEs, curve_fit for fitting, brentq for root-finding.',
        'Comet orbits, stellar light curves — anything can be turned into equations.',
        `Collect ${cp.shardsNeeded} numeric shards, enter the Optimization Labyrinth, and solve the Minotaur's riddles.`,
      ],
      collecting: ({ cp }) => [`Collected ${cp.shards} / ${cp.shardsNeeded} numeric shards. The essence of curve_fit: make the model curve hug the data points.`],
      ready: ['Shards collected! The gate of the Optimization Labyrinth is opening…'],
      done: ['The Optimization Minotaur has lowered its head! The eastern portal leads to the "Sanctum of Signals".'],
    },
    victory: {
      title: '🧮 Chapter 6 Complete!',
      text: 'You unravelled the Optimization Labyrinth<br />and claimed every numerical spell of integrals, ODEs and curve fitting!',
      next: '▶ Enter Chapter 7 · Sanctum of Signals',
    },
  },

  7: {
    title: 'Chapter 7 · Sanctum of Signals',
    subtitle: 'Week 7 · Numerical Methods II & ML',
    shardLabel: 'spectral shards',
    fieldName: 'Signal Sanctum Plains',
    lairName: 'Frequency-Domain Gallery',
    bossName: 'Fourier Phantom',
    npcName: 'Signal Tablet',
    npcLines: {
      new: ({ cp }) => [
        'This is the Sanctum of Signals — where time and frequency exchange places.',
        'np.linalg governs eigenvalues and covariance of matrices; np.fft decomposes time-domain signals into frequency components.',
        'Convolution is the pupil of a telescope, correlation functions are the fingerprints of galaxies; machine learning lets the data speak for itself.',
        `Collect ${cp.shardsNeeded} spectral shards, enter the Frequency-Domain Gallery, and face the Fourier Phantom.`,
      ],
      collecting: ({ cp }) => [`Collected ${cp.shards} / ${cp.shardsNeeded} spectral shards. Every signal is a superposition of sine waves of different frequencies.`],
      ready: ['Spectral shards collected! The seal of the Frequency-Domain Gallery is crumbling…'],
      done: ['The Fourier Phantom has dissolved! The eastern portal leads to the final "Deep-Space Halo".'],
    },
    victory: {
      title: '📡 Chapter 7 Complete!',
      text: 'The Fourier Phantom dissolved<br />in the light of linear algebra and the frequency domain!',
      next: '▶ Enter Chapter 8 · Deep-Space Halo',
    },
  },

  8: {
    title: 'Chapter 8 · Deep-Space Halo',
    subtitle: 'Week 8 · Dark Matter Halo',
    shardLabel: 'dark matter shards',
    fieldName: 'Deep-Space Halo',
    lairName: 'Dark Matter Core',
    bossName: 'NFW Phantom Dragon',
    npcName: 'Deep-Space Tablet',
    npcLines: {
      new: ({ cp }) => [
        'Welcome to the edge of the universe — the depths of a dark matter halo.',
        'Gravity gathers trillions of particles into halos; the NFW profile describes their density distribution.',
        'Integrate the density out to the radius where it is 200 times the critical density, and you get the halo mass; fit simulated data with curve_fit, and you will see dark matter\'s true face.',
        `Collect ${cp.shardsNeeded} dark matter shards, enter the core, and face the final NFW Phantom Dragon!`,
      ],
      collecting: ({ cp }) => [`Collected ${cp.shards} / ${cp.shardsNeeded} dark matter shards. NFW profile: ρ(r) ∝ 1 / [r(1+r/rs)²].`],
      ready: ['Dark matter shards collected! The gate of the core is opening… the Phantom Dragon awaits.'],
      done: ['The NFW Phantom Dragon has been sealed. The eight-week journey is complete.'],
    },
    victory: {
      title: '🌌 ALL CHAPTERS CLEAR!',
      text: 'You defeated the NFW Phantom Dragon and measured the density profile of a dark matter halo!<br />From variables to cosmology — eight weeks complete,<br />you are now a true Python astronomy hero!',
      next: 'Return to the Village · Free Exploration',
    },
  },
};

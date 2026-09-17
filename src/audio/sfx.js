// ============================================================
// 极简 WebAudio 音效（无需音频素材，程序化生成 8-bit 风格音效）
// ============================================================

let ctx = null;
let muted = false;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.1, { type = 'square', vol = 0.12, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur = 0.08, vol = 0.1, freq = 1200) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

export const sfx = {
  swing: () => noise(0.09, 0.14, 900),
  hitEnemy: () => tone(220, 0.08, { type: 'square', vol: 0.15, slide: -120 }),
  enemyDie: () => tone(330, 0.25, { type: 'triangle', vol: 0.14, slide: -220 }),
  hurt: () => tone(160, 0.25, { type: 'sawtooth', vol: 0.15, slide: -80 }),
  die: () => { tone(330, 0.18, { vol: 0.14 }); tone(220, 0.3, { vol: 0.14, delay: 0.18 }); tone(110, 0.5, { vol: 0.14, delay: 0.4 }); },
  pickup: () => { tone(660, 0.08, { vol: 0.11 }); tone(990, 0.12, { vol: 0.11, delay: 0.07 }); },
  heal: () => { tone(523, 0.09, { type: 'triangle' }); tone(784, 0.14, { type: 'triangle', delay: 0.08 }); },
  correct: () => { tone(523, 0.1, { type: 'triangle', vol: 0.14 }); tone(659, 0.1, { type: 'triangle', vol: 0.14, delay: 0.1 }); tone(784, 0.2, { type: 'triangle', vol: 0.14, delay: 0.2 }); },
  wrong: () => { tone(200, 0.18, { type: 'sawtooth', vol: 0.12 }); tone(150, 0.28, { type: 'sawtooth', vol: 0.12, delay: 0.16 }); },
  talk: () => tone(500, 0.05, { type: 'triangle', vol: 0.08 }),
  openGate: () => { tone(130, 0.4, { type: 'sawtooth', vol: 0.12, slide: 60 }); noise(0.35, 0.08, 300); },
  shieldBreak: () => { noise(0.3, 0.16, 500); tone(880, 0.3, { type: 'triangle', vol: 0.14, slide: -400 }); },
  bossDie: () => { [440, 330, 262, 175].forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', vol: 0.13, delay: i * 0.18 })); },
  toggleMute: () => { muted = !muted; return muted; },
};

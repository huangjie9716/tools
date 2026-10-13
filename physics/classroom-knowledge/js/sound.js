// ===================================================================
//  音效模块（Web Audio API 合成，无需外部音频文件）
//  开关见 config.js 里的 CONFIG.soundEnabled
// ===================================================================

// ===================================================================
//  音效模块（Web Audio API，无需外部音频文件）
// ===================================================================
const sound = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol) {
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  function seq(notes) { notes.forEach(n => tone(n.f, n.s, n.d, n.t, n.v)); }
  return {
    click()   { if (!CONFIG.soundEnabled) return; tone(620, 0, 0.07, 'triangle', 0.08); },
    correct() { if (!CONFIG.soundEnabled) return; seq([{ f: 660, s: 0, d: 0.12 }, { f: 880, s: 0.12, d: 0.2 }]); },
    wrong()   { if (!CONFIG.soundEnabled) return; seq([{ f: 220, s: 0, d: 0.18, t: 'sawtooth', v: 0.1 }, { f: 175, s: 0.16, d: 0.24, t: 'sawtooth', v: 0.1 }]); },
    win()     { if (!CONFIG.soundEnabled) return; seq([{ f: 523, s: 0, d: 0.15 }, { f: 659, s: 0.15, d: 0.15 }, { f: 784, s: 0.3, d: 0.35 }]); },
    // 双人 PK 专用：两边都选错（两次低沉下降，区别于单人答错的单次下降）
    bothWrong() { if (!CONFIG.soundEnabled) return; seq([{ f: 196, s: 0, d: 0.16, t: 'sawtooth', v: 0.11 }, { f: 147, s: 0.15, d: 0.22, t: 'sawtooth', v: 0.11 }, { f: 196, s: 0.45, d: 0.16, t: 'sawtooth', v: 0.11 }, { f: 147, s: 0.6, d: 0.28, t: 'sawtooth', v: 0.11 }]); }
  };
})();

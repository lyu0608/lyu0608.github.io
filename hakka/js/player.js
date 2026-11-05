/* 主頁播放範本：依勾選的標題／作者／句子，照速度與重複次數依序播放 */
(function () {
  'use strict';
  const art = (window.HAKKA_ARTICLES || [])[0];
  const T = window.HakkaTiming;
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = art.audio;
  if ('preservesPitch' in audio) audio.preservesPitch = true;

  let queue = [], qi = 0, endAt = 0, raf = 0, gapTimer = 0, token = 0;
  let onUnit = () => {}, onDone = () => {};

  /** u：0 標題、1 作者、n+2 第 n+1 句 */
  function rangeOf(u) {
    const t = T.get();
    return u === 0 ? t.title : u === 1 ? t.author : t.sentences[u - 2];
  }

  /**
   * 依序播放
   * @param {number[]} units 要播的單位
   * @param {{rate?:number, repeat?:number, gap?:number, onUnit?:Function, onDone?:Function}} opt
   */
  function play(units, opt = {}) {
    stop(true);
    const rep = Math.max(1, opt.repeat || 1);
    queue = [];
    units.forEach(u => { for (let r = 0; r < rep; r++) queue.push({ u, r: r + 1, of: rep }); });
    qi = 0;
    audio.playbackRate = opt.rate || 1;
    const gap = opt.gap == null ? 0.6 : opt.gap;
    onUnit = opt.onUnit || (() => {});
    onDone = opt.onDone || (() => {});
    const my = ++token;
    const next = () => {
      if (my !== token) return;
      if (qi >= queue.length) { finish(); return; }
      const item = queue[qi];
      const [a, b] = rangeOf(item.u);
      onUnit(item.u, item.r, item.of);
      endAt = b;
      const watch = () => {
        if (my !== token) return;
        if (audio.currentTime >= endAt || audio.ended) {
          audio.pause();
          qi++;
          gapTimer = setTimeout(next, qi < queue.length ? gap * 1000 / audio.playbackRate : 0);
          return;
        }
        raf = requestAnimationFrame(watch);
      };
      window.HakkaStartAt(audio, a).then(() => {
        if (my !== token) { audio.pause(); return; }
        raf = requestAnimationFrame(watch);
      }).catch(() => { if (my === token) finish(); });
    };
    next();
  }
  function finish() {
    token++;
    cancelAnimationFrame(raf); clearTimeout(gapTimer);
    if (!audio.paused) audio.pause();
    const cb = onDone; onDone = () => {}; onUnit = () => {};
    cb();
  }
  function stop(silent) {
    if (silent) { token++; cancelAnimationFrame(raf); clearTimeout(gapTimer); if (!audio.paused) audio.pause(); onDone = () => {}; onUnit = () => {}; return; }
    finish();
  }
  let active = false;
  window.HakkaPlayer = {
    play(units, opt = {}) {
      active = true;
      const done = opt.onDone;
      play(units, Object.assign({}, opt, { onDone: () => { active = false; if (done) done(); } }));
    },
    /** 停止並觸發 onDone */
    stop() { if (active) finish(); },
    get active() { return active; },
    /** 目前播放到的秒數（範本錄音的絕對時間） */
    get time() { return audio.currentTime; },
  };
})();

/* 範本切句時間：預設值來自 data/03.js，使用者在「校正切句」改過的存在瀏覽器（localStorage） */
(function () {
  'use strict';
  const art = (window.HAKKA_ARTICLES || [])[0];
  const KEY = 'hakka.timing.' + art.id;
  const clone = o => JSON.parse(JSON.stringify(o));
  const base = clone(art.timing);
  base.syl = clone(art.syl || { title: null, author: null, sentences: [] });   // 逐字時間（卡拉 OK）
  const listeners = [];

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Array.isArray(v.sentences) && v.sentences.length === base.sentences.length) {
        if (!v.syl) v.syl = clone(base.syl);   // 舊版只存切句，補上預設逐字時間
        return v;
      }
    } catch (_) { /* 無痕模式或資料壞掉時用預設值 */ }
    return null;
  }
  let custom = read();

  const T = {
    base: () => clone(base),
    get: () => clone(custom || base),
    isCustom: () => !!custom,
    savedAt: () => (custom && custom.savedAt) || null,
    save(t) {
      custom = Object.assign(clone(t), { savedAt: new Date().toISOString() });
      try { localStorage.setItem(KEY, JSON.stringify(custom)); } catch (_) { /* 存不了就只在這次有效 */ }
      listeners.forEach(f => f());
    },
    reset() {
      custom = null;
      try { localStorage.removeItem(KEY); } catch (_) { /* ignore */ }
      listeners.forEach(f => f());
    },
    onChange: f => listeners.push(f),
    /** 匯出：切句（同 data/03-timing.json）＋逐字時間 syl（同 data/03-syl.json） */
    exportJSON() {
      const t = T.get();
      return JSON.stringify({
        audio: base.audio, duration: base.duration, auto: false,
        note: '使用者於網頁「校正切句」調整' + (t.savedAt ? '（' + t.savedAt.slice(0, 10) + '）' : ''),
        title: t.title, author: t.author, sentences: t.sentences,
        syl: t.syl,
      });
    },
  };
  window.HakkaTiming = T;
})();

/* 播放器共用：確定音檔已載入、真的跳到 t 秒之後才開始播放。
 * - 第一次播放時音檔還沒載入，直接設定 currentTime 會被忽略而從頭播，所以要等 loadedmetadata 與 seeked。
 * - iPhone Safari：play() 必須在按鈕事件當下（同步）呼叫，否則會被擋；所以每個 audio 第一次一律先靜音 play() 解鎖，
 *   之後同一個 audio 元素就能在程式中自由播放。iPhone 上 volume 不能改，但 muted 可以。
 * - 放慢不變調：Safari 舊版用 webkitPreservesPitch。 */
window.HakkaPrepAudio = function (audio) {
  if ('preservesPitch' in audio) audio.preservesPitch = true;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = true;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = true;
  audio.setAttribute('playsinline', '');
  return audio;
};
window.HakkaStartAt = async function (audio, t) {
  if (!audio.__unlocked || audio.readyState < 1) {
    audio.muted = true;
    const p = audio.play();   // 同步呼叫，保留使用者手勢（iPhone 在此時解除播放限制）
    if (p && p.catch) p.catch(() => {});
    audio.__unlocked = true;
    if (audio.readyState < 1) {
      await new Promise(res => {
        const done = () => { clearTimeout(to); audio.removeEventListener('loadedmetadata', done); res(); };
        const to = setTimeout(done, 10000);
        audio.addEventListener('loadedmetadata', done);
      });
    }
  }
  if (Math.abs(audio.currentTime - t) > 0.02) {
    await new Promise(res => {
      let to = 0;
      const done = () => { clearTimeout(to); audio.removeEventListener('seeked', done); res(); };
      to = setTimeout(done, 3000);
      audio.addEventListener('seeked', done);
      audio.currentTime = t;
    });
  }
  audio.muted = false;
  const p = audio.play();
  if (p && p.then) await p;
};

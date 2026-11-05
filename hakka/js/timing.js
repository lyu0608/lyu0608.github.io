/* 範本切句時間：預設值來自 data/03.js，使用者在「校正切句」改過的存在瀏覽器（localStorage） */
(function () {
  'use strict';
  const art = (window.HAKKA_ARTICLES || [])[0];
  const KEY = 'hakka.timing.' + art.id;
  const clone = o => JSON.parse(JSON.stringify(o));
  const base = clone(art.timing);
  const listeners = [];

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && Array.isArray(v.sentences) && v.sentences.length === base.sentences.length) return v;
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
    /** 匯出成與 data/03-timing.json 相同格式 */
    exportJSON() {
      const t = T.get();
      return JSON.stringify({
        audio: base.audio, duration: base.duration, auto: false,
        note: '使用者於網頁「校正切句」調整' + (t.savedAt ? '（' + t.savedAt.slice(0, 10) + '）' : ''),
        title: t.title, author: t.author, sentences: t.sentences,
      }, null, 1);
    },
  };
  window.HakkaTiming = T;
})();

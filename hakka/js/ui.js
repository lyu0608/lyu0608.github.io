/* 客語朗讀練習 — 介面（選取、播放範本、卡拉 OK、校正切句、錄音入口；分析尚未接上） */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const art = (window.HAKKA_ARTICLES || [])[0];
  // 練習單位：u=0 標題、u=1 作者、u=n+2 第 n+1 句（與校正切句的順序一致）
  const units = [];       // {u, kind, pi, el, dur, label}
  const NUMS = '一二三四五六七八九十';

  // ---------- 瀏覽器支援檢查（iPhone 需 iOS 15.4 以上，Android Chrome 需近兩年內版本） ----------
  const OLD = typeof HTMLDialogElement !== 'function' || !window.Promise || !window.requestAnimationFrame;
  if (OLD) {
    const bar = document.createElement('div');
    bar.className = 'old-browser';
    bar.textContent = '你的瀏覽器版本較舊，部分功能（校正切句、版本紀錄）可能無法使用。iPhone 請更新到 iOS 15.4 以上，Android 請更新 Chrome。';
    document.body.prepend(bar);
  }

  // ---------- 版本 ----------
  $('#verLabel').textContent = window.APP_VERSION;
  $('#historyList').innerHTML = window.APP_HISTORY.map(h => `
    <li><div class="h-ver"><b>${h.ver}</b><span>${h.date}</span></div>
      <div class="h-title">${h.title}</div>
      <ul>${h.items.map(i => `<li>${i}</li>`).join('')}</ul></li>`).join('');

  // ---------- 文章 ----------
  // 注音中括號內是說明（如「(我)」「(連音)」「(ㄉㄝˊ)」），拆出來用小字顯示
  const splitNote = z => { const m = /^(.*?)\((.+)\)\s*$/.exec(z || ''); return m ? [m[1], m[2]] : [z, '']; };
  const tokHTML = t => {
    if (!t.z) return `<span class="tk pu"><span class="c">${t.c}</span><span class="z"></span><span class="p"></span></span>`;
    const [z, note] = splitNote(t.z);
    return `<span class="tk${t.fix ? ' fix' : ''}"${note ? ` title="${note}"` : ''}><span class="c">${t.c}</span>`
      + `<span class="z">${z || '·'}</span><span class="p">${t.p === '-' ? '·' : t.p}</span>`
      + (note ? `<span class="n">${note}</span>` : '') + `</span>`;
  };

  $('#contest').textContent = art.contest;
  const sideHTML = label => `<div class="sent-side">
          <button class="mini-play" aria-label="播放${label}"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></button>
          <button class="my-play" aria-label="播放我錄的${label}" title="我的錄音"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>
          <button class="del-rec" aria-label="刪除我錄的${label}" title="刪除這句錄音"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg><span>確定？</span></button>
          <span class="dur"></span>
          <span class="best" title="最佳分數" hidden></span>
        </div>`;
  const checkHTML = (u, num) => `<label class="check sent-check"><input type="checkbox" data-unit="${u}"><span class="box"></span><span class="num">${num}</span></label>`;
  // 標題、作者也是可勾選的練習單位
  [['title', 0, '題', '標題', `<span class="br">【</span>${art.titleTokens.map(tokHTML).join('')}<span class="br">】</span>`],
   ['author', 1, '作', '作者', art.authorTokens.map(tokHTML).join('')]].forEach(([kind, u, num, label, inner]) => {
    const el = $('#' + kind);
    el.classList.add('sent', 'head-row');
    el.dataset.u = u;
    el.innerHTML = `${checkHTML(u, num)}<div class="tokens head-tokens">${inner}</div>${sideHTML(label)}`;
    units.push({ u, kind, pi: -1, el, dur: 0, label });
  });

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  $('#refDur').textContent = fmt(window.HakkaTiming.get().duration);

  let idx = 0;
  const frag = document.createDocumentFragment();
  art.paragraphs.forEach((para, pi) => {
    const sec = document.createElement('section');
    sec.className = 'para';
    sec.innerHTML = `<header class="para-head">
        <label class="check"><input type="checkbox" data-para="${pi}"><span class="box"></span><span>第${NUMS[pi] || pi + 1}段</span></label>
        <span class="para-meta"><span class="para-dur" data-para-dur="${pi}"></span>
          <button class="grp-play" data-play-para="${pi}"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg><span>播放本段</span></button></span></header>`;
    para.forEach((s, si) => {
      const n = idx++, u = n + 2;
      const el = document.createElement('div');
      el.className = 'sent';
      el.dataset.idx = n;
      el.dataset.u = u;
      el.innerHTML = `${checkHTML(u, n + 1)}<div class="tokens">${s.t.map(tokHTML).join('')}</div>${sideHTML(`第 ${n + 1} 句`)}`;
      sec.appendChild(el);
      units.push({ u, kind: 'sent', pi, el, dur: 0, label: `第 ${n + 1} 句` });
    });
    frag.appendChild(sec);
  });
  $('#article').appendChild(frag);
  $('#sentCount').textContent = idx;

  // 每句秒數（校正後會即時更新）
  /** 把某句右側的秒數暫時改成跑動的「已播 / 總長」；text 為 null 時還原 */
  function setDurText(u, text) {
    const s = units.find(x => x.u === u);
    if (!s) return;
    const el = s.el.querySelector('.dur');
    el.classList.toggle('running', text != null);
    el.textContent = text != null ? text : s.dur.toFixed(1) + 's';
  }
  const clockText = (t, total) => `${Math.min(Math.max(0, t), total).toFixed(1)} / ${total.toFixed(1)}s`;
  function applyTiming() {
    const t = window.HakkaTiming.get();
    units.forEach(s => {
      const r = s.kind === 'sent' ? t.sentences[s.u - 2] : t[s.kind];
      s.dur = r[1] - r[0];
      s.el.querySelector('.dur').textContent = s.dur.toFixed(1) + 's';
    });
    $('#calibState').hidden = !window.HakkaTiming.isCustom();
    document.querySelectorAll('[data-para-dur]').forEach(el => {
      const list = units.filter(x => x.pi === +el.dataset.paraDur);
      el.textContent = `${list.length} 句 · ${Math.round(list.reduce((a, x) => a + x.dur, 0))} 秒`;
    });
    $('#allDur').textContent = fmt(units.reduce((a, x) => a + x.dur, 0));
  }
  applyTiming();
  window.HakkaTiming.onChange(() => { applyTiming(); refresh(); });


  // ---------- 選取 ----------
  const selected = new Set();
  function refresh() {
    units.forEach(s => {
      const on = selected.has(s.u);
      s.el.classList.toggle('on', on);
      s.el.querySelector('input').checked = on;
    });
    document.querySelectorAll('[data-para]').forEach(cb => {
      const pi = +cb.dataset.para;
      const list = units.filter(s => s.pi === pi);
      const k = list.filter(s => selected.has(s.u)).length;
      cb.checked = k === list.length; cb.indeterminate = k > 0 && k < list.length;
    });
    const all = $('#chkAll');
    all.checked = selected.size === units.length;
    all.indeterminate = selected.size > 0 && selected.size < units.length;
    const secs = units.filter(s => selected.has(s.u)).reduce((a, s) => a + s.dur, 0);
    const ids = [...selected].sort((a, b) => a - b);
    $('#selInfo').innerHTML = ids.length
      ? `已選 <b>${ids.length}</b> 項 <span class="range">${rangeText(ids)}</span> · 範本約 <b>${Math.round(secs)}</b> 秒`
      : '尚未選取<span class="hint-long"> — 勾選句子或段落開始練習</span>';
    $('#btnClear').hidden = !ids.length;
  }
  function rangeText(ids) {
    const head = [];
    if (ids.includes(0)) head.push('標題');
    if (ids.includes(1)) head.push('作者');
    const sn = ids.filter(u => u >= 2).map(u => u - 2);
    const parts = [];
    if (sn.length) {
      let a = sn[0], p = sn[0];
      for (const i of sn.slice(1).concat([null])) {
        if (i === p + 1) { p = i; continue; }
        parts.push(a === p ? `${a + 1}` : `${a + 1}–${p + 1}`); a = p = i;
      }
    }
    return '（' + head.concat(parts.length ? ['第 ' + parts.join('、') + ' 句'] : []).join('、') + '）';
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.unit !== undefined) { t.checked ? selected.add(+t.dataset.unit) : selected.delete(+t.dataset.unit); }
    else if (t.dataset.para !== undefined) {
      units.filter(s => s.pi === +t.dataset.para).forEach(s => t.checked ? selected.add(s.u) : selected.delete(s.u));
    } else if (t.id === 'chkAll') { units.forEach(s => t.checked ? selected.add(s.u) : selected.delete(s.u)); }
    else return;
    refresh();
  });
  // 點句子文字也可勾選
  document.querySelector('.page').addEventListener('click', e => {
    // 刪除單句錄音：按一下變「確定？」，3 秒內再按一次才刪
    const del = e.target.closest('.del-rec');
    if (del) {
      if (!del.classList.contains('armed')) {
        document.querySelectorAll('.del-rec.armed').forEach(x => x.classList.remove('armed'));
        del.classList.add('armed');
        clearTimeout(del._t); del._t = setTimeout(() => del.classList.remove('armed'), 3000);
      } else {
        del.classList.remove('armed');
        window.HakkaPractice.deleteOne(+del.closest('.sent').dataset.u);
      }
      return;
    }
    const my = e.target.closest('.my-play');
    if (my) { window.HakkaPractice.toggleOneMine(+my.closest('.sent').dataset.u, my); return; }
    const mp = e.target.closest('.mini-play');
    if (mp) { playOne(+mp.closest('.sent').dataset.u); return; }
    const tk = e.target.closest('.sent > .tokens');
    if (!tk) return;
    const n = +tk.parentElement.dataset.u;
    selected.has(n) ? selected.delete(n) : selected.add(n);
    refresh();
  });
  $('#btnClear').onclick = () => { selected.clear(); refresh(); };

  // ---------- 顯示設定 ----------
  const root = document.documentElement;
  const settings = $('#settings');
  $('#btnSettings').onclick = () => {
    settings.hidden = !settings.hidden;
    $('#btnSettings').setAttribute('aria-expanded', String(!settings.hidden));
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('hakka.' + k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('hakka.' + k, JSON.stringify(v)); } catch (_) { /* 無痕模式等 */ } },
  };
  [['optZhuyin', 'no-zhuyin'], ['optPinyin', 'no-pinyin'], ['optFix', 'no-fix']].forEach(([id, cls]) => {
    const cb = $('#' + id);
    cb.checked = store.get(id, true);
    root.classList.toggle(cls, !cb.checked);
    cb.onchange = () => { root.classList.toggle(cls, !cb.checked); store.set(id, cb.checked); };
  });
  const karaSel = $('#optKara');
  karaSel.value = store.get('karaColor', 'rainbow');
  karaSel.onchange = () => store.set('karaColor', karaSel.value);
  var karaColor = () => karaSel.value;
  let size = store.get('size', 0);
  const applySize = () => root.style.setProperty('--scale', String(1 + size * 0.12));
  applySize();
  document.querySelectorAll('[data-size]').forEach(b => b.onclick = () => {
    size = Math.max(-2, Math.min(4, size + +b.dataset.size)); store.set('size', size); applySize();
  });

  // ---------- 練習列（外觀） ----------
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    document.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
  });
  document.querySelectorAll('.dock .act').forEach(b => b.onclick = () => {
    if (b.dataset.act === 'play') { playSelected(); return; }
    if (b.dataset.act === 'rec') { window.HakkaPractice.start(); return; }
    if (b.dataset.act === 'mine') { window.HakkaPractice.playMine(); return; }
    if (b.dataset.act === 'ana') { if (needSelection('分析')) return; const a = $('#analysis'); a.hidden = false; a.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }

  });
  $('#btnCloseAna').onclick = () => { $('#analysis').hidden = true; };
  $('#btnCalib').onclick = () => { P.stop(); window.HakkaCalib.open(selected.size ? Math.min(...selected) : 0); };

  // ---------- 播放範本 ----------
  const P = window.HakkaPlayer;
  const playBtn = document.querySelector('.dock .act.play');
  const playLbl = playBtn.querySelector('span');
  const ICON_PLAY = '<path d="M8 5l11 7-11 7z"/>', ICON_STOP = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
  let playing = null;  // 目前在播什麼：'sel'（勾選範圍）、'u3'（單句）、'all'、'p0'（段落）
  // ---------- 卡拉 OK 逐字變色 ----------
  // 逐字時間：預設來自 data/03-syl.json，使用者在校正切句微調過的優先
  const sylOf = u => { const S = window.HakkaTiming.get().syl || {}; return (u === 0 ? S.title : u === 1 ? S.author : (S.sentences || [])[u - 2]) || null; };
  let karaU = null, karaToks = [], karaSyl = null, karaRaf = 0;
  /** getTime：回傳「範本錄音上的秒數」；播放時用播放器時間，錄音時用虛擬時鐘 */
  function karaStart(u, getTime = () => P.time) {
    karaStop();
    karaSyl = sylOf(u);
    if (!karaSyl) return;               // 這句還沒有逐字時間
    karaU = u;
    const el = unitEl(u);
    el.classList.add('kara');
    // 只取有讀音的字；標點跟著前一個字
    karaToks = [];
    el.querySelectorAll('.tokens .tk').forEach(tk => {
      if (tk.classList.contains('pu')) { if (karaToks.length) karaToks[karaToks.length - 1].pu.push(tk); return; }
      // 在字上疊一層紅色同字，用寬度控制露出多少
      const c = tk.querySelector('.c');
      const kf = document.createElement('span');
      kf.className = 'kf'; kf.textContent = c.textContent; kf.setAttribute('aria-hidden', 'true');
      c.appendChild(kf);
      karaToks.push({ tk, kf, pu: [], last: -1 });
    });
    if (karaToks.length !== karaSyl.length) { karaStop(); return; }
    // 彩虹螢光筆：每個字依序分配一個淺色底（紅→紫），字維持深色，好閱讀
    el.classList.toggle('kara-hl', karaColor() === 'rainbow');
    if (karaColor() === 'rainbow') {
      const n = Math.max(1, karaToks.length - 1);
      karaToks.forEach((k, i) => {
        const h = Math.round(i / n * 285);
        k.tk.style.setProperty("--kc", `hsl(${h}, var(--kbs), var(--kbl))`);
        k.tk.style.setProperty('--kt', `hsl(${h}, 70%, var(--ktl))`);
      });
    }
    const loop = () => {
      const t = getTime();
      karaToks.forEach((k, i) => {
        const [a, b] = karaSyl[i];
        const p = t >= b ? 100 : t <= a ? 0 : Math.round((t - a) / (b - a) * 100);
        if (p === k.last) return;
        k.last = p;
        k.kf.style.width = p + '%';
        k.tk.classList.toggle('k-now', p > 0 && p < 100);
        k.tk.classList.toggle('k-done', p >= 100);
        k.pu.forEach(x => x.classList.toggle('k-done', p >= 100));
      });
      karaRaf = requestAnimationFrame(loop);
    };
    loop();
  }
  function karaStop() {
    cancelAnimationFrame(karaRaf);
    if (karaU != null) {
      const el = unitEl(karaU);
      el.classList.remove('kara', 'kara-hl');
      el.querySelectorAll('.tk').forEach(tk => { tk.classList.remove('k-now', 'k-done'); tk.style.removeProperty('--kc'); tk.style.removeProperty('--kt'); });
      el.querySelectorAll('.kf').forEach(kf => kf.remove());
    }
    karaU = null; karaToks = []; karaSyl = null;
  }

  let clockU = null, clockRaf = 0;
  function clockStart(u, getTime) {
    clockStop();
    const T = window.HakkaTiming.get();
    const [a, b] = u === 0 ? T.title : u === 1 ? T.author : T.sentences[u - 2];
    clockU = u;
    let last = '';
    const loop = () => {
      const txt = clockText(getTime() - a, b - a);
      if (txt !== last) { setDurText(u, txt); last = txt; }
      clockRaf = requestAnimationFrame(loop);
    };
    loop();
  }
  function clockStop() {
    cancelAnimationFrame(clockRaf);
    if (clockU != null) setDurText(clockU, null);
    clockU = null;
  }
  function clearPlayUI() {
    karaStop();
    clockStop();
    document.querySelectorAll('.sent.playing').forEach(el => el.classList.remove('playing'));
    document.querySelectorAll('.mini-play.on').forEach(b => { b.classList.remove('on'); b.querySelector('svg').innerHTML = ICON_PLAY; });
    document.querySelectorAll('.grp-play.on').forEach(b => {
      b.classList.remove('on'); b.querySelector('svg').innerHTML = ICON_PLAY;
      b.querySelector('span').textContent = b.dataset.label;
    });
    playBtn.classList.remove('on'); playBtn.querySelector('svg').innerHTML = ICON_PLAY; playLbl.textContent = '播放範本';
    playing = null;
  }
  const unitEl = u => units.find(x => x.u === u).el;
  function markUnit(u, r, of, total, k, getTime) {
    document.querySelectorAll('.sent.playing').forEach(el => el.classList.remove('playing'));
    const el = unitEl(u);
    el.classList.add('playing');
    karaStart(u, getTime);
    clockStart(u, getTime || (() => P.time));
    const box = el.getBoundingClientRect();
    if (box.top < 110 || box.bottom > innerHeight - 150) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (total != null) playLbl.textContent = `停止 ${k}/${total}` + (of > 1 ? `（第 ${r} 遍）` : '');
  }
  /**
   * 不出聲的卡拉 OK（錄音時用）：照範本的時間與速度跑字幕，不播聲音。
   * list 依序跑，句與句之間停 gap 秒（與播放範本相同）；回傳 { stop(), done: Promise, total 秒 }
   */
  function karaokeRun(list, speed, gap) {
    const T = window.HakkaTiming.get();
    const rng = u => u === 0 ? T.title : u === 1 ? T.author : T.sentences[u - 2];
    const sched = []; let off = 0;
    list.forEach(u => { const [a, b] = rng(u); const d = (b - a) / speed; sched.push({ u, a, start: off, end: off + d }); off += d + gap / speed; });
    const total = sched.length ? sched[sched.length - 1].end : 0;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;
    let idx = -1, timer = 0, finish;
    const done = new Promise(r => { finish = r; });
    const tick = () => {
      const t = now();
      let k = idx < 0 ? 0 : idx;
      while (k + 1 < sched.length && t >= sched[k + 1].start) k++;
      if (k !== idx) {
        idx = k;
        const it = sched[k];
        markUnit(it.u, 1, 1, null, null, () => it.a + Math.max(0, now() - it.start) * speed);
      }
      if (t >= total) { clearInterval(timer); finish(true); }
    };
    timer = setInterval(tick, 50);
    tick();
    return {
      total,
      done,
      stop() { clearInterval(timer); clearPlayUI(); finish(false); },
    };
  }
  // ---------- 倒數提示：第一個字上色，跟著每一聲嗶跳一下 ----------
  let cueTk = null;
  function cueStart(u) {
    cueStop();
    const el = unitEl(u);
    cueTk = [...el.querySelectorAll('.tokens .tk')].find(t => !t.classList.contains('pu')) || null;
    if (!cueTk) return;
    if (karaColor() === 'rainbow') { cueTk.style.setProperty('--kc', 'hsl(0, var(--kbs), var(--kbl))'); cueTk.style.setProperty('--kt', 'hsl(0, 70%, var(--ktl))'); }
    cueTk.classList.add('k-cue');
    cueTk.classList.toggle('k-cue-hl', karaColor() === 'rainbow');
    const box = el.getBoundingClientRect();
    if (box.top < 110 || box.bottom > innerHeight - 160) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function cueBeat() {
    if (!cueTk) return;
    cueTk.classList.remove('k-beat'); void cueTk.offsetWidth; cueTk.classList.add('k-beat');
  }
  function cueStop() {
    if (!cueTk) return;
    cueTk.classList.remove('k-cue', 'k-cue-hl', 'k-beat');
    cueTk.style.removeProperty('--kc'); cueTk.style.removeProperty('--kt');
    cueTk = null;
  }
  const rate = () => parseFloat($('#speed').value) || 1;
  const reps = () => parseInt($('#repeat').value, 10) || 1;
  const mode = () => document.querySelector('.seg button.on').dataset.mode;
  function playSelected() {
    if (P.active && playing === 'sel') { P.stop(); return; }
    const list = [...selected].sort((a, b) => a - b);
    if (needSelection('播放')) return;
    clearPlayUI();
    playing = 'sel';
    playBtn.classList.add('on'); playBtn.querySelector('svg').innerHTML = ICON_STOP;
    let k = 0, lastU = null;
    P.play(list, {
      rate: rate(), repeat: reps(), gap: mode() === 'follow' ? 1.2 : 0.35,
      onUnit: (u, r, of) => { if (u !== lastU || r === 1) { k++; lastU = u; } markUnit(u, r, of, list.length, Math.min(k, list.length)); },
      onDone: clearPlayUI,
    });
  }
  function playOne(u) {
    if (P.active && playing === 'u' + u) { P.stop(); return; }
    clearPlayUI();
    playing = 'u' + u;
    const b = unitEl(u).querySelector('.mini-play');
    b.classList.add('on'); b.querySelector('svg').innerHTML = ICON_STOP;
    P.play([u], { rate: rate(), repeat: 1, onUnit: (x) => markUnit(x), onDone: clearPlayUI });
  }
  /** 全文／整段連續播放（不看勾選；全文包含標題、作者） */
  function playGroup(key, list, btn) {
    if (P.active && playing === key) { P.stop(); return; }
    clearPlayUI();
    playing = key;
    btn.classList.add('on'); btn.querySelector('svg').innerHTML = ICON_STOP;
    const lbl = btn.querySelector('span');
    let k = 0;
    P.play(list, {
      rate: rate(), repeat: 1, gap: 0.35,
      onUnit: u => { k++; markUnit(u); lbl.textContent = `停止 ${k}/${list.length}`; },
      onDone: clearPlayUI,
    });
  }
  document.querySelectorAll('.grp-play').forEach(b => { b.dataset.label = b.querySelector('span').textContent; });
  $('#btnPlayAll').onclick = e => playGroup('all', units.map(x => x.u), e.currentTarget);
  document.querySelectorAll('[data-play-para]').forEach(b => b.onclick = () => {
    const pi = +b.dataset.playPara;
    playGroup('p' + pi, units.filter(x => x.pi === pi).map(x => x.u), b);
  });

  // ---------- 版本紀錄 ----------
  const dlg = $('#dlgHistory');
  $('#btnHistory').onclick = () => dlg.showModal();
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  let tt;
  function toast(msg) {
    const t = $('#toast');
    // 有對話框開著時，提示要放進對話框裡，否則會被蓋住看不到
    const host = document.querySelector('dialog[open]') || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1800);
  }
  // 清除這台裝置上的錄音（按兩次確認）
  let wArmed = false;
  $('#btnDelWhole').onclick = e => {
    if (!wArmed) { wArmed = true; e.target.textContent = '確定刪除？'; setTimeout(() => { wArmed = false; e.target.textContent = '刪除連續朗讀錄音'; }, 3000); return; }
    wArmed = false; e.target.textContent = '刪除連續朗讀錄音';
    window.HakkaPractice.deleteWhole();
  };
  let clrArmed = false;
  $('#btnClearRec').onclick = e => {
    if (!clrArmed) { clrArmed = true; e.target.textContent = '確定清除？'; setTimeout(() => { clrArmed = false; e.target.textContent = '清除我的錄音'; }, 3000); return; }
    clrArmed = false; e.target.textContent = '清除我的錄音';
    window.HakkaPractice.clearAll();
  };

  /** 底部按鈕一律可按；沒勾選句子時提醒，並讓選取列閃一下。回傳 true 表示沒勾選 */
  function needSelection(what) {
    if (selected.size) return false;
    toast(`請先勾選要${what}的句子（可勾單句、整段或「全文」）`);
    const bar = document.querySelector('.select-bar');
    bar.classList.remove('nudge'); void bar.offsetWidth; bar.classList.add('nudge');
    return true;
  }

  // ---------- 底部按鈕永遠看得到 ----------
  // iPhone Safari 下拉或捲動時，底部網址列／工具列展開會蓋住 position:fixed 的按鈕列；
  // 用 visualViewport 算出實際可見範圍的底部，把按鈕列往上推到可見區域內。
  const dockEl = document.querySelector('.dock');
  const vv = window.visualViewport;
  if (vv) {
    let pending = 0;
    const place = () => {
      pending = 0;
      const hidden = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      // 鍵盤打開時（可見高度大幅縮小）不跟著移動，避免按鈕列跑到畫面中間
      const keyboard = vv.height < window.innerHeight * 0.6;
      dockEl.style.transform = hidden > 1 && !keyboard ? `translateY(${-hidden}px)` : '';
    };
    const req = () => { if (!pending) pending = requestAnimationFrame(place); };
    vv.addEventListener('resize', req);
    vv.addEventListener('scroll', req);
    window.addEventListener('scroll', req, { passive: true });
    place();
  }

  window.HakkaUI = {
    needSelection,
    tokHTML, toast, units, unitEl, markUnit, clearPlayUI, karaokeRun, cueStart, cueBeat, cueStop, rate, reps, mode, setDurText, clockText,
    selectedList: () => [...selected].sort((a, b) => a - b),
  };
  refresh();
})();

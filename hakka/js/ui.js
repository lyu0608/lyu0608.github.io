/* 客語朗讀練習 — 介面（目前：外觀、選取、播放範本、校正切句；錄音／分析尚未接上） */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const art = (window.HAKKA_ARTICLES || [])[0];
  // 練習單位：u=0 標題、u=1 作者、u=n+2 第 n+1 句（與校正切句的順序一致）
  const units = [];       // {u, kind, pi, el, dur, label}
  const NUMS = '一二三四五六七八九十';

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
          <span class="dur"></span>
          <span class="best" title="最佳分數">—</span>
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
        <span class="para-meta">${para.length} 句</span></header>`;
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
  function applyTiming() {
    const t = window.HakkaTiming.get();
    units.forEach(s => {
      const r = s.kind === 'sent' ? t.sentences[s.u - 2] : t[s.kind];
      s.dur = r[1] - r[0];
      s.el.querySelector('.dur').textContent = s.dur.toFixed(1) + 's';
    });
    $('#calibState').hidden = !window.HakkaTiming.isCustom();
  }
  applyTiming();
  window.HakkaTiming.onChange(() => { applyTiming(); refresh(); });

  // 示範：前三句顯示歷史分數
  [84, 69, 80].forEach((v, i) => { const b = units[i + 2].el.querySelector('.best'); b.textContent = v; b.className = 'best ' + (v >= 80 ? 'good' : 'mid'); });

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
      : '尚未選取 — 勾選句子或段落開始練習';
    $('#btnClear').hidden = !ids.length;
    document.querySelectorAll('.dock .act').forEach(b => { b.disabled = !ids.length; });
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
    if (b.dataset.act === 'ana') { const a = $('#analysis'); a.hidden = false; a.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    toast({ rec: '錄音', mine: '播放我的錄音' }[b.dataset.act] + '功能開發中');
  });
  $('#btnCloseAna').onclick = () => { $('#analysis').hidden = true; };
  $('#btnCalib').onclick = () => { P.stop(); window.HakkaCalib.open(selected.size ? Math.min(...selected) : 0); };

  // ---------- 播放範本 ----------
  const P = window.HakkaPlayer;
  const playBtn = document.querySelector('.dock .act.play');
  const playLbl = playBtn.querySelector('span');
  const ICON_PLAY = '<path d="M8 5l11 7-11 7z"/>', ICON_STOP = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
  let single = null;   // 正在用 ▶ 播單一項時的編號
  // ---------- 卡拉 OK 逐字變色 ----------
  const SYL = art.syl || {};
  const sylOf = u => (u === 0 ? SYL.title : u === 1 ? SYL.author : (SYL.sentences || [])[u - 2]) || null;
  let karaU = null, karaToks = [], karaSyl = null, karaRaf = 0;
  function karaStart(u) {
    karaStop();
    karaSyl = sylOf(u);
    if (!karaSyl) return;               // 這句還沒有逐字時間
    karaU = u;
    const el = unitEl(u);
    el.classList.add('kara');
    // 只取有讀音的字；標點跟著前一個字
    karaToks = [];
    el.querySelectorAll('.tokens .tk').forEach(tk => {
      if (tk.classList.contains('pu')) { if (karaToks.length) karaToks[karaToks.length - 1].pu.push(tk); }
      else karaToks.push({ tk, pu: [] });
    });
    if (karaToks.length !== karaSyl.length) { karaStop(); return; }
    const loop = () => {
      const t = P.time;
      karaToks.forEach(({ tk, pu }, i) => {
        const [a, b] = karaSyl[i];
        const p = t >= b ? 100 : t <= a ? 0 : (t - a) / (b - a) * 100;
        tk.style.setProperty('--p', p.toFixed(1) + '%');
        tk.classList.toggle('k-now', p > 0 && p < 100);
        tk.classList.toggle('k-done', p >= 100);
        pu.forEach(x => x.classList.toggle('k-done', p >= 100));
      });
      karaRaf = requestAnimationFrame(loop);
    };
    loop();
  }
  function karaStop() {
    cancelAnimationFrame(karaRaf);
    if (karaU != null) {
      const el = unitEl(karaU);
      el.classList.remove('kara');
      el.querySelectorAll('.tk').forEach(tk => { tk.classList.remove('k-now', 'k-done'); tk.style.removeProperty('--p'); });
    }
    karaU = null; karaToks = []; karaSyl = null;
  }

  function clearPlayUI() {
    karaStop();
    document.querySelectorAll('.sent.playing').forEach(el => el.classList.remove('playing'));
    document.querySelectorAll('.mini-play.on').forEach(b => { b.classList.remove('on'); b.querySelector('svg').innerHTML = ICON_PLAY; });
    playBtn.classList.remove('on'); playBtn.querySelector('svg').innerHTML = ICON_PLAY; playLbl.textContent = '播放範本';
    single = null;
  }
  const unitEl = u => units.find(x => x.u === u).el;
  function markUnit(u, r, of, total, k) {
    document.querySelectorAll('.sent.playing').forEach(el => el.classList.remove('playing'));
    const el = unitEl(u);
    el.classList.add('playing');
    karaStart(u);
    const box = el.getBoundingClientRect();
    if (box.top < 110 || box.bottom > innerHeight - 150) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (total != null) playLbl.textContent = `停止 ${k}/${total}` + (of > 1 ? `（第 ${r} 遍）` : '');
  }
  const rate = () => parseFloat($('#speed').value) || 1;
  const reps = () => parseInt($('#repeat').value, 10) || 1;
  const mode = () => document.querySelector('.seg button.on').dataset.mode;
  function playSelected() {
    if (P.active && single == null) { P.stop(); return; }
    const list = [...selected].sort((a, b) => a - b);
    if (!list.length) return;
    clearPlayUI();
    playBtn.classList.add('on'); playBtn.querySelector('svg').innerHTML = ICON_STOP;
    let k = 0, lastU = null;
    P.play(list, {
      rate: rate(), repeat: reps(), gap: mode() === 'follow' ? 1.2 : 0.35,
      onUnit: (u, r, of) => { if (u !== lastU || r === 1) { k++; lastU = u; } markUnit(u, r, of, list.length, Math.min(k, list.length)); },
      onDone: clearPlayUI,
    });
  }
  function playOne(u) {
    if (P.active && single === u) { P.stop(); return; }
    clearPlayUI();
    single = u;
    const b = unitEl(u).querySelector('.mini-play');
    b.classList.add('on'); b.querySelector('svg').innerHTML = ICON_STOP;
    P.play([u], { rate: rate(), repeat: 1, onUnit: (x) => markUnit(x), onDone: clearPlayUI });
  }

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
  window.HakkaUI = { tokHTML, toast };
  refresh();
})();

/* 客語朗讀練習 — 介面（目前：外觀、選取、校正切句；播放／錄音／分析尚未接上） */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const art = (window.HAKKA_ARTICLES || [])[0];
  const sentences = [];   // {pi, si, idx, el, tokens}
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
  $('#title').innerHTML = `<span class="br">【</span>${art.titleTokens.map(tokHTML).join('')}<span class="br">】</span>`;
  $('#author').innerHTML = art.authorTokens.map(tokHTML).join('');

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
      const n = idx++;
      const el = document.createElement('div');
      el.className = 'sent';
      el.dataset.idx = n;
      el.innerHTML = `<label class="check sent-check"><input type="checkbox" data-sent="${n}"><span class="box"></span><span class="num">${n + 1}</span></label>
        <div class="tokens">${s.t.map(tokHTML).join('')}</div>
        <div class="sent-side">
          <button class="mini-play" aria-label="播放第 ${n + 1} 句"><svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg></button>
          <span class="dur"></span>
          <span class="best" title="最佳分數">—</span>
        </div>`;
      sec.appendChild(el);
      sentences.push({ pi, si, idx: n, el, dur: 0 });
    });
    frag.appendChild(sec);
  });
  $('#article').appendChild(frag);
  $('#sentCount').textContent = sentences.length;

  // 每句秒數（校正後會即時更新）
  function applyTiming() {
    const t = window.HakkaTiming.get();
    sentences.forEach(s => {
      const r = t.sentences[s.idx];
      s.dur = r[1] - r[0];
      s.el.querySelector('.dur').textContent = s.dur.toFixed(1) + 's';
    });
    $('#calibState').hidden = !window.HakkaTiming.isCustom();
  }
  applyTiming();
  window.HakkaTiming.onChange(() => { applyTiming(); refresh(); });

  // 示範：前三句顯示歷史分數
  [84, 69, 80].forEach((v, i) => { const b = sentences[i].el.querySelector('.best'); b.textContent = v; b.className = 'best ' + (v >= 80 ? 'good' : 'mid'); });

  // ---------- 選取 ----------
  const selected = new Set();
  function refresh() {
    sentences.forEach(s => {
      const on = selected.has(s.idx);
      s.el.classList.toggle('on', on);
      s.el.querySelector('input').checked = on;
    });
    document.querySelectorAll('[data-para]').forEach(cb => {
      const pi = +cb.dataset.para;
      const list = sentences.filter(s => s.pi === pi);
      const k = list.filter(s => selected.has(s.idx)).length;
      cb.checked = k === list.length; cb.indeterminate = k > 0 && k < list.length;
    });
    const all = $('#chkAll');
    all.checked = selected.size === sentences.length;
    all.indeterminate = selected.size > 0 && selected.size < sentences.length;
    const secs = sentences.filter(s => selected.has(s.idx)).reduce((a, s) => a + s.dur, 0);
    const ids = [...selected].sort((a, b) => a - b);
    $('#selInfo').innerHTML = ids.length
      ? `已選 <b>${ids.length}</b> 句 <span class="range">${rangeText(ids)}</span> · 範本約 <b>${Math.round(secs)}</b> 秒`
      : '尚未選取 — 勾選句子或段落開始練習';
    $('#btnClear').hidden = !ids.length;
    document.querySelectorAll('.act').forEach(b => { b.disabled = !ids.length; });
  }
  function rangeText(ids) {
    const parts = []; let a = ids[0], p = ids[0];
    for (const i of ids.slice(1).concat([null])) {
      if (i === p + 1) { p = i; continue; }
      parts.push(a === p ? `${a + 1}` : `${a + 1}–${p + 1}`); a = p = i;
    }
    return '（第 ' + parts.join('、') + ' 句）';
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.sent !== undefined) { t.checked ? selected.add(+t.dataset.sent) : selected.delete(+t.dataset.sent); }
    else if (t.dataset.para !== undefined) {
      sentences.filter(s => s.pi === +t.dataset.para).forEach(s => t.checked ? selected.add(s.idx) : selected.delete(s.idx));
    } else if (t.id === 'chkAll') { sentences.forEach(s => t.checked ? selected.add(s.idx) : selected.delete(s.idx)); }
    else return;
    refresh();
  });
  // 點句子文字也可勾選
  $('#article').addEventListener('click', e => {
    if (e.target.closest('.mini-play')) { toast('播放功能開發中'); return; }
    const tk = e.target.closest('.tokens');
    if (!tk) return;
    const n = +tk.parentElement.dataset.idx;
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
  document.querySelectorAll('.act').forEach(b => b.onclick = () => {
    if (b.dataset.act === 'ana') { const a = $('#analysis'); a.hidden = false; a.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    toast({ play: '播放', rec: '錄音', mine: '播放我的錄音' }[b.dataset.act] + '功能開發中');
  });
  $('#btnCloseAna').onclick = () => { $('#analysis').hidden = true; };
  $('#btnCalib').onclick = () => window.HakkaCalib.open(Math.min(...selected, Infinity));

  // ---------- 版本紀錄 ----------
  const dlg = $('#dlgHistory');
  $('#btnHistory').onclick = () => dlg.showModal();
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  let tt;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1800);
  }
  window.HakkaUI = { tokHTML, toast };
  refresh();
})();

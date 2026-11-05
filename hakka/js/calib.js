/* 校正切句：看波形、拖拉起訖點、試聽，結果自動存在瀏覽器，可匯出 JSON */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const art = (window.HAKKA_ARTICLES || [])[0];
  const T = window.HakkaTiming;
  const UI = () => window.HakkaUI;
  const dlg = $('#dlgCalib');
  const cv = $('#calWave');
  const ctx = cv.getContext('2d');
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = art.audio;
  if ('preservesPitch' in audio) audio.preservesPitch = true;

  // 項目：標題、作者、各句
  const sents = art.paragraphs.flat();
  const items = [
    { key: 'title', label: '標題', tokens: art.titleTokens },
    { key: 'author', label: '作者', tokens: art.authorTokens },
    ...sents.map((s, i) => ({ key: i, label: `第 ${i + 1} 句`, tokens: s.t })),
  ];
  let tm = null;        // 編輯中的 timing（物件）
  let cur = 2;          // 目前項目
  let pad = 1.2;        // 波形左右多顯示幾秒
  let view = [0, 1];
  let peaks = null, pps = 100, peakState = 'idle';
  let stopAt = null, raf = 0, drag = null;
  let lastPos = null;   // 最近一次播放停在哪裡（播完後仍可「設為目前播放位置」）
  const REACT = 0.15;   // 聽到後按下按鈕的反應時間，自動往前扣

  const range = i => { const it = items[i]; return typeof it.key === 'number' ? tm.sentences[it.key] : tm[it.key]; };
  const r2 = v => Math.round(v * 100) / 100;
  const textOf = it => it.tokens.map(t => t.c).join('');

  // ---------- 開啟／關閉 ----------
  function open(sentIdx) {
    tm = T.get();
    cur = Number.isFinite(sentIdx) ? sentIdx + 2 : 2;
    $('#calItem').innerHTML = items.map((it, i) => {
      const t = textOf(it);
      return `<option value="${i}">${it.label}　${t.length > 16 ? t.slice(0, 16) + '…' : t}</option>`;
    }).join('');
    dlg.showModal();
    loadPeaks();
    select(cur);
    status();
  }
  function close() { stop(); dlg.close(); }

  // ---------- 波形資料 ----------
  async function loadPeaks() {
    if (peakState !== 'idle') return;
    peakState = 'loading'; draw();
    try {
      const buf = await (await fetch(art.audio)).arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      const ab = await new Promise((res, rej) => {
        const p = ac.decodeAudioData(buf, res, rej);
        if (p && p.then) p.then(res, rej);
      });
      const ch = ab.getChannelData(0), step = ab.sampleRate / pps;
      peaks = new Float32Array(Math.ceil(ch.length / step));
      for (let k = 0; k < peaks.length; k++) {
        let m = 0; const a = Math.floor(k * step), b = Math.min(ch.length, Math.floor((k + 1) * step));
        for (let i = a; i < b; i++) { const v = ch[i] < 0 ? -ch[i] : ch[i]; if (v > m) m = v; }
        peaks[k] = m;
      }
      // 正規化（以 99.5 百分位當滿格）
      const s = Array.from(peaks).sort((x, y) => x - y), top = s[Math.floor(s.length * 0.995)] || 1;
      for (let k = 0; k < peaks.length; k++) peaks[k] = Math.min(1, peaks[k] / top);
      if (ac.close) ac.close();
      peakState = 'ok';
    } catch (e) {
      peakState = 'fail';
    }
    draw();
  }

  // ---------- 選項目 ----------
  function select(i) {
    cur = Math.max(0, Math.min(items.length - 1, i));
    lastPos = null;
    $('#calItem').value = String(cur);
    $('#calText').innerHTML = items[cur].tokens.map(UI().tokHTML).join('');
    $('#calPrev').disabled = cur === 0;
    $('#calNext').disabled = cur === items.length - 1;
    const base = T.base(), it = items[cur];
    const b = typeof it.key === 'number' ? base.sentences[it.key] : base[it.key];
    $('#calRevertOne').disabled = r2(b[0]) === r2(range(cur)[0]) && r2(b[1]) === r2(range(cur)[1]);
    fitView();
    fields();
    draw();
  }
  function fitView() {
    const [a, b] = range(cur), d = tm.duration;
    view = [Math.max(0, a - pad), Math.min(d, b + pad)];
  }
  function fields() {
    const [a, b] = range(cur);
    $('#calStart').value = a.toFixed(2);
    $('#calEnd').value = b.toFixed(2);
    $('#calLen').textContent = (b - a).toFixed(2) + ' 秒';
  }

  // ---------- 修改 ----------
  let saveTimer = 0;
  function setEdge(which, v) {
    const r = range(cur), d = tm.duration;
    v = r2(Math.max(0, Math.min(d, v)));
    if (which === 0) r[0] = Math.min(v, r[1] - 0.2); else r[1] = Math.max(v, r[0] + 0.2);
    r[0] = r2(r[0]); r[1] = r2(r[1]);
    fields(); draw();
    $('#calRevertOne').disabled = false;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { T.save(tm); tm = T.get(); status(); }, 250);
  }
  function status() {
    const el = $('#calStatus');
    if (T.isCustom()) {
      const d = new Date(T.savedAt());
      el.textContent = `已自動儲存在這個瀏覽器 · ${d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      el.className = 'cal-status saved';
    } else {
      el.textContent = '目前使用預設切句';
      el.className = 'cal-status';
    }
  }

  // ---------- 播放 ----------
  function play(a, b) {
    stop();
    audio.currentTime = Math.max(0, a);
    stopAt = b;
    const p = audio.play();
    if (p && p.catch) p.catch(() => UI().toast('無法播放音檔'));
    $('#calPlay').classList.add('on');
    tick();
  }
  function stop() {
    if (stopAt != null) lastPos = audio.currentTime;
    if (!audio.paused) audio.pause();
    stopAt = null; cancelAnimationFrame(raf);
    $('#calPlay').classList.remove('on');
    draw();
  }
  function tick() {
    if (stopAt != null && audio.currentTime >= stopAt) { stop(); return; }
    if (audio.paused && audio.readyState >= 2 && stopAt != null && audio.currentTime > 0 && audio.ended) { stop(); return; }
    // 播放超出視窗就跟著捲動
    const t = audio.currentTime;
    if (t > view[1]) { const w = view[1] - view[0]; view = [t - w * 0.2, t + w * 0.8]; }
    draw();
    raf = requestAnimationFrame(tick);
  }
  const isPlaying = () => stopAt != null && !audio.paused;

  // ---------- 繪圖 ----------
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w) return;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const [v0, v1] = view, X = t => (t - v0) / (v1 - v0) * w;
    const axisH = 18, top = 22, mid = top + (h - top - axisH) / 2, amp = (h - top - axisH) / 2 - 2;
    const colInk = css('--indigo'), colLine = css('--line'), colMuted = css('--ink-3'), colRed = css('--red'), colSel = css('--sel'), colPaper = css('--paper');

    // 其他句的範圍（淡色）
    items.forEach((_, i) => {
      if (i === cur) return;
      const [a, b] = range(i);
      if (b < v0 || a > v1) return;
      ctx.fillStyle = colLine; ctx.globalAlpha = 0.5;
      ctx.fillRect(X(a), top, X(b) - X(a), h - top - axisH);
      ctx.globalAlpha = 1;
      ctx.fillStyle = colMuted; ctx.font = '11px system-ui, sans-serif';
      const lbl = items[i].key === 'title' ? '標題' : items[i].key === 'author' ? '作者' : String(items[i].key + 1);
      ctx.fillText(lbl, Math.max(2, X(a) + 3), top + 12);
    });
    const [a, b] = range(cur);
    ctx.fillStyle = colSel; ctx.fillRect(X(a), top, X(b) - X(a), h - top - axisH);

    // 波形
    if (peaks) {
      for (let x = 0; x < w; x++) {
        const t0 = v0 + (v1 - v0) * x / w, t1 = v0 + (v1 - v0) * (x + 1) / w;
        let m = 0;
        for (let k = Math.floor(t0 * pps); k <= Math.floor(t1 * pps) && k < peaks.length; k++) if (peaks[k] > m) m = peaks[k];
        const inSel = t0 >= a && t0 <= b;
        ctx.fillStyle = inSel ? colInk : colMuted;
        ctx.globalAlpha = inSel ? 0.9 : 0.55;
        const hh = Math.max(1, m * amp);
        ctx.fillRect(x, mid - hh, 1, hh * 2);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = colMuted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(peakState === 'fail' ? '無法顯示波形（請用網址開啟本頁），仍可輸入秒數並試聽' : '載入波形中…', w / 2, mid + 4);
      ctx.textAlign = 'start';
    }

    // 時間軸
    ctx.fillStyle = colMuted; ctx.strokeStyle = colLine; ctx.font = '10.5px system-ui, sans-serif';
    const span = v1 - v0, step = span > 12 ? 2 : span > 5 ? 1 : 0.5;
    for (let t = Math.ceil(v0 / step) * step; t <= v1; t += step) {
      const x = X(t);
      ctx.fillRect(x, h - axisH, 1, 4);
      ctx.fillText(t >= 60 ? `${Math.floor(t / 60)}:${(t % 60).toFixed(step < 1 ? 1 : 0).padStart(step < 1 ? 4 : 2, '0')}` : t.toFixed(step < 1 ? 1 : 0), x + 2, h - 4);
    }

    // 起訖把手
    [[a, '起'], [b, '迄']].forEach(([t, lbl], k) => {
      const x = X(t);
      ctx.fillStyle = colRed;
      ctx.fillRect(x - 1, top - 2, 2, h - top - axisH + 2);
      const tw = 22;
      const bx = k === 0 ? x - 1 : x - tw + 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, 1, tw, 19, 5); else ctx.rect(bx, 1, tw, 19);
      ctx.fill();
      ctx.fillStyle = colPaper; ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(lbl, bx + 5, 15);
    });

    // 播放位置（播放中：綠色實線；停止後：綠色虛線，表示「設為目前播放位置」會用這裡）
    const pos = stopAt != null ? audio.currentTime : lastPos;
    if (pos != null) {
      const x = X(pos);
      ctx.fillStyle = css('--good');
      if (stopAt != null) ctx.fillRect(x - 1, top, 2, h - top - axisH);
      else for (let y = top; y < h - axisH; y += 6) ctx.fillRect(x - 1, y, 2, 3);
    }
  }

  // ---------- 波形互動：拖拉起訖點、點一下從該處播放 ----------
  const tAt = e => { const r = cv.getBoundingClientRect(); return view[0] + (e.clientX - r.left) / r.width * (view[1] - view[0]); };
  const xOf = t => (t - view[0]) / (view[1] - view[0]) * cv.clientWidth;
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left;
    const [a, b] = range(cur);
    const da = Math.abs(x - xOf(a)), db = Math.abs(x - xOf(b));
    const near = e.pointerType === 'touch' ? 22 : 12;
    if (Math.min(da, db) <= near) {
      drag = { which: da <= db ? 0 : 1, moved: false };
      cv.setPointerCapture(e.pointerId);
      stop();
      e.preventDefault();
    } else {
      play(tAt(e), view[1]);
    }
  });
  cv.addEventListener('pointermove', e => {
    if (drag) { drag.moved = true; setEdge(drag.which, tAt(e)); return; }
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left;
    const [a, b] = range(cur);
    cv.style.cursor = Math.min(Math.abs(x - xOf(a)), Math.abs(x - xOf(b))) <= 12 ? 'ew-resize' : 'pointer';
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    const [a, b] = range(cur);
    // 放開後自動試聽該處
    if (d.which === 0) play(a, Math.min(b, a + 1.8)); else play(Math.max(a, b - 1.8), b);
    if (a < view[0] + 0.3 || b > view[1] - 0.3) { fitView(); draw(); }
  };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  // ---------- 按鈕 ----------
  $('#calItem').onchange = e => { stop(); select(+e.target.value); };
  $('#calPrev').onclick = () => { stop(); select(cur - 1); };
  $('#calNext').onclick = () => { stop(); select(cur + 1); };
  $('#calPlay').onclick = () => { if (isPlaying()) stop(); else { const [a, b] = range(cur); play(a, b); } };
  $('#calHead').onclick = () => { const [a, b] = range(cur); play(a, Math.min(b, a + 1.8)); };
  $('#calTail').onclick = () => { const [a, b] = range(cur); play(Math.max(a, b - 1.8), b); };
  $('#calCtx').onclick = () => { const [a, b] = range(cur); play(Math.max(0, a - 1.5), Math.min(tm.duration, b + 1.5)); };
  document.querySelectorAll('[data-nudge]').forEach(btn => btn.onclick = () => {
    const [which, d] = btn.dataset.nudge.split(':');
    setEdge(+which, range(cur)[+which] + parseFloat(d));
  });
  document.querySelectorAll('[data-here]').forEach(btn => btn.onclick = () => {
    const which = +btn.dataset.here;
    const playing = stopAt != null;
    const t = playing ? audio.currentTime - REACT : lastPos;
    if (t == null) { UI().toast('先按「播放」，聽到要切的位置時再按這個鈕'); return; }
    const before = range(cur)[which];
    setEdge(which, t);
    const after = range(cur)[which];
    flash(which === 0 ? '#calStart' : '#calEnd');
    if (Math.abs(after - t) > 0.05) UI().toast(`${which ? '迄點' : '起點'}不能${which ? '早於起點' : '晚於迄點'}，已設為 ${after.toFixed(2)} 秒`);
    else UI().toast(`${which ? '迄點' : '起點'}：${before.toFixed(2)} → ${after.toFixed(2)} 秒`);
  });
  function flash(id) { const el = $(id); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  [['#calStart', 0], ['#calEnd', 1]].forEach(([id, which]) => {
    $(id).onchange = e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) setEdge(which, v); else fields(); };
  });
  $('#calZoomIn').onclick = () => { pad = Math.max(0.3, pad / 1.6); fitView(); draw(); };
  $('#calZoomOut').onclick = () => { pad = Math.min(8, pad * 1.6); fitView(); draw(); };
  $('#calRevertOne').onclick = () => {
    const base = T.base(), it = items[cur];
    const b = typeof it.key === 'number' ? base.sentences[it.key] : base[it.key];
    setEdge(0, b[0]); setEdge(1, b[1]); setEdge(0, b[0]);
    $('#calRevertOne').disabled = true;
  };
  let armed = false;
  $('#calResetAll').onclick = e => {
    if (!armed) { armed = true; e.target.textContent = '確定全部還原？'; setTimeout(() => { armed = false; e.target.textContent = '全部還原'; }, 3000); return; }
    armed = false; e.target.textContent = '全部還原';
    T.reset(); tm = T.get(); select(cur); status();
    UI().toast('已還原成預設切句');
  };
  $('#calExport').onclick = () => {
    const blob = new Blob([T.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${art.id}-timing.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('#calCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(T.exportJSON()); UI().toast('已複製切句資料'); }
    catch (_) { UI().toast('無法複製，請改用「下載」'); }
  };
  $('#calClose').onclick = close;
  dlg.addEventListener('cancel', () => stop());
  dlg.addEventListener('close', () => stop());
  dlg.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); $('#calPlay').click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); $('#calNext').click(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); $('#calPrev').click(); }
  });
  window.addEventListener('resize', () => { if (dlg.open) draw(); });

  window.HakkaCalib = { open };
})();

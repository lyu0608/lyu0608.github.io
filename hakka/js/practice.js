/* 錄音練習流程
 * 逐句跟讀：播範本 → 嗶 → 錄音（講完自動停）→ 可聽、重錄，2.5 秒後自動下一句
 * 連續朗讀：嗶 → 一口氣唸完勾選範圍 → 按「完成」
 * 錄音存在這台裝置（IndexedDB）：每句保留最新一次（key "u3"），連續朗讀保留最新一次（key "whole"）
 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const R = window.HakkaRec, P = window.HakkaPlayer, T = window.HakkaTiming;
  const UI = () => window.HakkaUI;
  const bar = $('#recBar'), stateEl = $('#recState'), timeEl = $('#recTime'), lvl = $('#recLevel'), btns = $('#recBtns');
  const recBtn = document.querySelector('.dock .act.rec');
  const recLbl = recBtn.querySelector('span:last-child');
  const mineBtn = document.querySelector('.dock .act.mine');
  const mineLbl = mineBtn.querySelector('span');

  let session = null;            // { quit:boolean, cur:{cancel,stop}|null, wait:Function|null }
  const have = new Set();        // 有錄音的單位
  const player = new Audio();
  player.setAttribute('playsinline', '');
  let playerUrl = null, mineQueue = null;

  const rangeOf = u => { const t = T.get(); return u === 0 ? t.title : u === 1 ? t.author : t.sentences[u - 2]; };
  const labelOf = u => UI().units.find(x => x.u === u).label;
  const fmt = s => s < 60 ? s.toFixed(1) + ' 秒' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------- 狀態列 ----------
  function showBar(state, text, buttons) {
    bar.hidden = false;
    bar.dataset.state = state;
    stateEl.textContent = text;
    timeEl.textContent = '';
    lvl.style.width = '0%';
    btns.innerHTML = '';
    (buttons || []).forEach(([label, fn, cls]) => {
      const b = document.createElement('button');
      b.textContent = label; if (cls) b.className = cls;
      b.onclick = fn; btns.appendChild(b);
    });
  }
  function hideBar() { bar.hidden = true; }
  const waitChoice = () => new Promise(res => { session.wait = res; });
  const choose = v => () => { if (session && session.wait) { const w = session.wait; session.wait = null; w(v); } };

  // ---------- 列表上的「我的錄音」鈕 ----------
  function markHave(u, on) {
    on ? have.add(u) : have.delete(u);
    const el = UI().units.find(x => x.u === u);
    if (el) el.el.classList.toggle('has-rec', on);
  }
  async function loadKeys() {
    try { (await R.store.keys()).forEach(k => { if (/^u\d+$/.test(k)) markHave(+k.slice(1), true); }); }
    catch (_) { /* 無痕模式可能不能用 IndexedDB */ }
    refreshMine();
  }
  function refreshMine() { mineBtn.dataset.has = have.size ? '1' : ''; }

  // ---------- 檢查環境 ----------
  function preflight() {
    if (R.env.inApp) { UI().toast('LINE、FB 等 App 內建瀏覽器通常不能錄音，請用 Safari 或 Chrome 開啟本頁'); }
    if (!R.env.supported || !R.env.secure) {
      UI().toast('這個瀏覽器不支援錄音（iPhone 需 iOS 14.3 以上，並用 https 網址開啟）');
      return false;
    }
    try {
      if (!localStorage.getItem('hakka.recTip')) {
        localStorage.setItem('hakka.recTip', '1');
        UI().toast('建議戴耳機：逐句跟讀時範本聲音才不會被錄進去');
      }
    } catch (_) { /* ignore */ }
    return true;
  }

  // ---------- 錄一段 ----------
  async function recordOnce(text, opt) {
    showBar('rec', text, [['完成', () => session.cur && session.cur.stop(), 'primary'], ['結束', quit]]);
    let r;
    try {
      await R.beep();
      if (session.quit) return null;
      r = await R.record(Object.assign({
        onLevel: (v, t) => { lvl.style.width = Math.round(v * 100) + '%'; timeEl.textContent = fmt(t); },
      }, opt));
    } catch (e) {
      UI().toast(e && e.name === 'NotAllowedError' ? '麥克風權限被拒絕：請在瀏覽器設定允許本網站使用麥克風' : '無法開啟麥克風');
      return 'error';
    }
    session.cur = r;
    const res = await r.done;
    session.cur = null;
    return res;
  }

  // ---------- 逐句跟讀 ----------
  async function follow(list, rate, reps) {
    for (let i = 0; i < list.length && !session.quit; i++) {
      const u = list[i];
      const [a, b] = rangeOf(u);
      const name = `${labelOf(u)}（${i + 1}/${list.length}）`;
      const last = i === list.length - 1;
      // 1. 聽範本
      const listen = async () => {
        showBar('ref', `${name}：先聽範本`, [['跳過範本', () => P.stop()], ['結束', quit]]);
        await new Promise(res => {
          UI().clearPlayUI();
          P.play([u], { rate, repeat: reps, gap: 0.6, onUnit: x => UI().markUnit(x), onDone: res });
        });
        UI().clearPlayUI();
      };
      await listen();
      let step = 'ready', res = null;
      while (!session.quit) {
        if (step === 'ready') {
          // 2. 等使用者按「開始錄音」
          UI().unitEl(u).classList.add('ready');
          showBar('ready', `${name}：準備好就按「開始錄音」`, [
            ['開始錄音', () => { R.unlock(); choose('rec')(); }, 'primary rec-go'],
            ['再聽範本', choose('again')], [last ? '略過' : '跳過這句', choose('next')], ['結束', quit],
          ]);
          const c = await waitChoice();
          UI().unitEl(u).classList.remove('ready');
          if (c === 'again') { await listen(); continue; }
          if (c !== 'rec') break;
          // 3. 嗶一聲後錄音，唸完按「完成」
          UI().unitEl(u).classList.add('recording');
          res = await recordOnce(`● 錄音中：${name}（唸完按「完成」）`, { maxSec: (b - a) / rate * 3 + 10, autoStop: false });
          UI().unitEl(u).classList.remove('recording');
          if (res === 'error' || !res || session.quit) { session.quit = session.quit || res === 'error'; break; }
          if (!res.speech) {
            showBar('warn', `${name}：沒有聽到聲音`, [['重錄', choose('redo'), 'primary'], ['跳過', choose('next')], ['結束', quit]]);
            if (await waitChoice() === 'redo') { step = 'ready'; continue; }
            break;
          }
          await R.store.put('u' + u, { u, blob: res.blob, mime: res.mime, dur: res.dur, at: Date.now() }).catch(() => {});
          markHave(u, true); refreshMine();
          step = 'saved';
        }
        // 4. 錄好了：聽我的、重錄，或按「下一句」
        showBar('saved', `${name}：錄好了（${fmt(res.dur)}）`, [
          ['聽我的', () => playBlob(res.blob)], ['重錄', choose('redo')],
          [last ? '完成' : '下一句', choose('next'), 'primary'], ['結束', quit],
        ]);
        const c = await waitChoice();
        stopMine();
        if (c === 'redo') { step = 'ready'; continue; }
        break;
      }
    }
  }

  // ---------- 連續朗讀 ----------
  async function whole(list) {
    const total = list.reduce((s, u) => { const [a, b] = rangeOf(u); return s + (b - a); }, 0);
    list.forEach(u => UI().unitEl(u).classList.add('recording'));
    UI().unitEl(list[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
    const res = await recordOnce(`● 連續錄音中（${list.length} 項，範本約 ${Math.round(total)} 秒），唸完按「完成」`,
      { maxSec: total * 2 + 20, autoStop: false });
    list.forEach(u => UI().unitEl(u).classList.remove('recording'));
    if (!res || res === 'error' || session.quit) return;
    if (!res.speech) { UI().toast('沒有聽到聲音，請再錄一次'); return; }
    await R.store.put('whole', { units: list, blob: res.blob, mime: res.mime, dur: res.dur, at: Date.now() }).catch(() => {});
    have.add('whole'); refreshMine();
    showBar('saved', `連續朗讀錄好了（${fmt(res.dur)}）`, [['聽我的', () => playBlob(res.blob)], ['關閉', choose('next'), 'primary']]);
    await waitChoice();
  }

  // ---------- 開始／結束 ----------
  async function start() {
    if (session) { quit(); return; }
    const list = UI().selectedList();
    if (!list.length) return;
    if (!preflight()) return;
    R.unlock();                       // 在按鈕事件當下解鎖 AudioContext（iPhone）
    stopMine();
    session = { quit: false, cur: null, wait: null };
    recBtn.classList.add('on'); recLbl.textContent = '結束錄音';
    document.body.classList.add('rec-session');
    try {
      if (UI().mode() === 'follow') await follow(list, UI().rate(), UI().reps());
      else await whole(list);
    } finally {
      const n = list.filter(u => have.has(u)).length;
      session = null;
      P.stop(); UI().clearPlayUI(); hideBar();
      document.querySelectorAll('.sent.recording').forEach(el => el.classList.remove('recording'));
      recBtn.classList.remove('on'); recLbl.textContent = '錄音';
      document.body.classList.remove('rec-session');
      if (n) UI().toast('按「我的錄音」可以回放');
    }
  }
  function quit() {
    if (!session) return;
    session.quit = true;
    if (session.cur) session.cur.cancel();
    P.stop();
    choose('quit')();
  }

  // ---------- 回放我的錄音 ----------
  function playBlob(blob, onEnd) {
    stopMine(true);
    playerUrl = URL.createObjectURL(blob);
    player.src = playerUrl;
    player.onended = () => { stopMine(true); if (onEnd) onEnd(); };
    const p = player.play();
    if (p && p.catch) p.catch(() => UI().toast('無法播放錄音'));
  }
  function stopMine(keepQueue) {
    player.pause();
    if (playerUrl) { URL.revokeObjectURL(playerUrl); playerUrl = null; }
    document.querySelectorAll('.my-play.on').forEach(b => b.classList.remove('on'));
    if (!keepQueue) {
      mineQueue = null;
      mineBtn.classList.remove('on'); mineLbl.textContent = '我的錄音';
      document.querySelectorAll('.sent.mine-playing').forEach(el => el.classList.remove('mine-playing'));
    }
  }
  async function playOneMine(u, btn, onEnd) {
    const rec = await R.store.get('u' + u).catch(() => null);
    if (!rec) { UI().toast(`${labelOf(u)}還沒有錄音`); if (onEnd) onEnd(); return; }
    document.querySelectorAll('.sent.mine-playing').forEach(el => el.classList.remove('mine-playing'));
    UI().unitEl(u).classList.add('mine-playing');
    if (btn) btn.classList.add('on');
    playBlob(rec.blob, onEnd);
  }
  /** 底部「我的錄音」：逐句模式依序播勾選句子的錄音；連續模式播最新一次連續錄音 */
  async function playMine() {
    if (mineQueue) { stopMine(); return; }
    if (session) return;
    P.stop(); UI().clearPlayUI();
    if (UI().mode() === 'whole') {
      const rec = await R.store.get('whole').catch(() => null);
      if (!rec) { UI().toast('還沒有連續朗讀的錄音'); return; }
      mineQueue = [];
      mineBtn.classList.add('on'); mineLbl.textContent = '停止';
      playBlob(rec.blob, () => stopMine());
      return;
    }
    const list = UI().selectedList().filter(u => have.has(u));
    if (!list.length) { UI().toast('勾選的句子還沒有錄音'); return; }
    mineQueue = list.slice();
    mineBtn.classList.add('on');
    const next = () => {
      if (!mineQueue || !mineQueue.length) { stopMine(); return; }
      const u = mineQueue.shift();
      mineLbl.textContent = `停止 ${list.length - mineQueue.length}/${list.length}`;
      const el = UI().unitEl(u), box = el.getBoundingClientRect();
      if (box.top < 110 || box.bottom > innerHeight - 160) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      playOneMine(u, null, () => setTimeout(next, 400));
    };
    next();
  }
  function toggleOneMine(u, btn) {
    if (btn.classList.contains('on')) { stopMine(); return; }
    stopMine(); P.stop(); UI().clearPlayUI();
    playOneMine(u, btn, () => stopMine());
  }
  async function clearAll() {
    await R.store.clear().catch(() => {});
    [...have].forEach(u => typeof u === 'number' && markHave(u, false));
    have.clear(); refreshMine();
    UI().toast('已清除這台裝置上的所有錄音');
  }

  window.HakkaPractice = { start, quit, playMine, toggleOneMine, clearAll, get active() { return !!session; } };
  loadKeys();
})();

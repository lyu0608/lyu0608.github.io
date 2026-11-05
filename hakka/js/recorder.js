/* 錄音底層：麥克風、MediaRecorder、自動偵測講完、提示音、IndexedDB 儲存（只存在這台裝置）
 * 相容性：
 *  - iPhone Safari（iOS 14.3+）錄成 audio/mp4；Android Chrome 錄成 audio/webm(opus)
 *  - iPhone 開著麥克風時播放聲音會變小聲，所以只在「錄音那一段」開麥克風，錄完立刻關掉
 *  - AudioContext 必須在按鈕事件當下建立／resume（unlock()）
 */
(function () {
  'use strict';
  let ac = null;

  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ac) ac = new AC();
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    return ac;
  }

  /** 嗶一聲，表示開始錄音 */
  function beep(freq = 880, dur = 0.16) {
    const c = unlock();
    if (!c) return Promise.resolve();
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
    return new Promise(r => setTimeout(r, (dur + 0.05) * 1000));
  }

  function pickMime() {
    if (!window.MediaRecorder) return null;
    const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
    for (const m of list) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) { /* ignore */ } }
    return '';
  }

  const ua = navigator.userAgent || '';
  const env = {
    supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    secure: window.isSecureContext !== false,
    inApp: /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua),
  };

  /**
   * 錄一段音
   * @param {{maxSec:number, autoStop?:boolean, silenceSec?:number, noSpeechSec?:number, onLevel?:Function, before?:Function}} opt
   * @returns {{stop:Function, cancel:Function, done:Promise<{blob:Blob,mime:string,dur:number,speech:boolean}|null>}}
   */
  async function record(opt) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
    });
    const c = unlock();
    const src = c.createMediaStreamSource(stream);
    const an = c.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const readRms = () => {
      if (an.getFloatTimeDomainData) an.getFloatTimeDomainData(buf);
      else { const b8 = new Uint8Array(an.fftSize); an.getByteTimeDomainData(b8); for (let i = 0; i < b8.length; i++) buf[i] = (b8[i] - 128) / 128; }
      let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      return Math.sqrt(s / buf.length);
    };

    const mime = pickMime();
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

    // 麥克風先開好，倒數（嗶三聲）結束才真正開始錄，避免漏掉開頭的字。
    // 倒數期間還沒開口，順便量環境噪音當基準（以前用錄音開頭 0.3 秒，但嗶完馬上開口就會量到人聲，誤判「沒聲音」）
    const pre = [];
    let preTimer = 0;
    if (opt.before) {
      preTimer = setInterval(() => {
        const r = readRms(); pre.push(r);
        if (opt.onLevel) opt.onLevel(Math.min(1, r / 0.25), 0, false);
      }, 50);
      const go = await opt.before();
      clearInterval(preTimer);
      if (go === false) { try { src.disconnect(); } catch (_) { /* ignore */ } stream.getTracks().forEach(t => t.stop()); return null; }
    }
    // 噪音基準：倒數期間音量的中位數（太吵時最多算 0.03）；沒有倒數時改用錄音中最安靜的部分推估
    const median = a => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[v.length >> 1] : 0; };
    let floor = pre.length >= 5 ? Math.min(median(pre), 0.03) : null;

    let resolveDone;
    const done = new Promise(r => { resolveDone = r; });
    let cancelled = false, speech = false, loud = 0, quiet = 0, timer = 0, peak = 0;
    const samples = [];
    const t0 = performance.now();
    const elapsed = () => (performance.now() - t0) / 1000;
    const thresh = () => Math.max(0.006, (floor != null ? floor : 0.004) * 2.5);

    const finish = () => {
      clearInterval(timer); clearInterval(preTimer);
      try { src.disconnect(); } catch (_) { /* ignore */ }
      stream.getTracks().forEach(t => t.stop());
    };
    mr.onstop = () => {
      finish();
      if (cancelled) { resolveDone(null); return; }
      // 保險：沒有倒數時用錄音中最安靜的 20% 當噪音；只要最大音量明顯高過噪音就算有聲音
      if (floor == null && samples.length) { const v = samples.slice().sort((x, y) => x - y); floor = v[Math.floor(v.length * 0.2)]; }
      const hasVoice = speech || peak > Math.max(0.015, (floor || 0) * 4);
      const type = mr.mimeType || mime || (chunks[0] && chunks[0].type) || 'audio/webm';
      resolveDone({ blob: new Blob(chunks, { type }), mime: type, dur: elapsed(), speech: hasVoice });
    };
    mr.start(250);

    const stop = () => { if (mr.state !== 'inactive') mr.stop(); };
    // 用 setInterval（不是 requestAnimationFrame），切到背景時也能偵測
    timer = setInterval(() => {
      const rms = readRms();
      const t = elapsed();
      samples.push(rms);
      if (rms > peak) peak = rms;
      if (opt.onLevel) opt.onLevel(Math.min(1, rms / 0.25), t, speech);
      if (rms > thresh()) { loud++; quiet = 0; if (loud >= 3) speech = true; }
      else { loud = 0; quiet++; }
      if (opt.autoStop !== false) {
        if (speech && quiet * 0.05 >= (opt.silenceSec || 1.2)) stop();              // 講完了
        if (!speech && t >= (opt.noSpeechSec || 6)) stop();                          // 一直沒出聲
      }
      if (t >= opt.maxSec) stop();
    }, 50);

    return { stop, cancel: () => { cancelled = true; stop(); }, done };
  }

  // ---------- IndexedDB：每句（u 編號）最新一次錄音、連續朗讀最新一次 ----------
  const DB = 'hakka-rec', STORE = 'takes';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(STORE, mode), s = t.objectStore(STORE);
      const r = fn(s);
      t.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
      t.onerror = () => rej(t.error);
    });
  }
  const store = {
    put: (key, v) => tx('readwrite', s => s.put(v, key)),
    get: key => tx('readonly', s => s.get(key)),
    del: key => tx('readwrite', s => s.delete(key)),
    keys: () => tx('readonly', s => s.getAllKeys()),
    clear: () => tx('readwrite', s => s.clear()),
  };

  window.HakkaRec = { env, unlock, beep, record, store, pickMime };
})();

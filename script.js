// ============================================================
// script.js  ―  時間割アプリ 完成版
// ============================================================

// ============================================================
// 【1】時間割データ  timetable[曜日0=月〜4=金][時限0=1限〜5=6限]
// ============================================================
var TIMETABLE = [
  // 月曜日
  ['国語', '数学', '英語', '実習', '実習', 'LHR'],
  // 火曜日
  ['数学', '国語', '社会', '理科', '英語', '保健'],
  // 水曜日
  ['英語', '社会', '数学', 'プログラミング技術', '工業情報数理', '電気回路'],
  // 木曜日
  ['理科', '電気回路', '国語', '数学', 'プログラミング技術', '社会'],
  // 金曜日
  ['保健', '英語', '工業情報数理', '国語', '電気回路', '実習']
];

// ============================================================
// 【2】教科ごとの持ち物データ
// ============================================================
var BELONGINGS = {
  '国語':              ['ファイル', 'ダブルクリア', '教科書', 'ノート'],
  '社会':              ['教科書', 'ノート'],
  '数学':              ['ファイル', 'パラレルノート', '教科書'],
  '理科':              ['ファイル', '教科書'],
  '英語':              ['パソコン', 'ファイル', '教科書'],
  '電気回路':          ['ファイル', '教科書'],
  'プログラミング技術': ['ノート', '教科書'],
  '工業情報数理':      ['ノート', '教科書', 'ファイル'],
  '実習':              ['ファイル', 'パソコン', '教科書'],
  '保健':              ['パソコン', '教科書', 'ノート'],
  'LHR':               []
};

var DAY_NAMES = ['月', '火', '水', '木', '金'];

// ============================================================
// 【3】タイマー・BGM 用グローバル変数
// ============================================================
var timerTotal     = 25 * 60;
var timerRemaining = 25 * 60;
var timerRunning   = false;
var timerInterval  = null;
var selectedBgm    = 'none';
var bgmAudioCtx    = null;
var bgmSourceNode  = null;
var bgmGainNode    = null;
var bgmLoopTimer   = null;
var confettiId     = null;

// ============================================================
// 【4】DOMContentLoaded ですべてを起動する
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initNav();
  initTimetableTab();
  initPomodoroTab();
  initReminderTab();
  initSettingsTab();
});

// ============================================================
// 【5】ユーティリティ
// ============================================================

// 月曜=0〜金曜=4 を返す。16時以降は翌営業日
function getTargetDayIndex() {
  var now   = new Date();
  var jsDay = now.getDay(); // 0=日,1=月…6=土
  if (now.getHours() >= 16) {
    jsDay = jsDay + 1;
  }
  // 土日 → 月曜(0)
  if (jsDay === 0 || jsDay === 7) { return 0; }
  if (jsDay === 6)                { return 0; }
  return jsDay - 1; // 1〜5 → 0〜4
}

// HTML特殊文字をエスケープ
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 【6】ボトムナビ ― タブ切り替え
// ============================================================
function initNav() {
  var navBtns = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener('click', function () {
      var target = this.dataset.tab;

      // ナビボタンのアクティブ
      for (var j = 0; j < navBtns.length; j++) {
        navBtns[j].classList.remove('active');
      }
      this.classList.add('active');

      // タブページの切り替え
      var pages = document.querySelectorAll('.tab-page');
      for (var k = 0; k < pages.length; k++) {
        pages[k].classList.remove('active');
      }
      document.getElementById('tab-' + target).classList.add('active');

      // ヘッダータイトル
      var titles = {
        timetable: '📅 時間割',
        pomodoro:  '⏱️ 集中タイマー',
        reminder:  '🚨 リマインダー',
        settings:  '⚙️ 設定'
      };
      document.getElementById('header-title').textContent = titles[target] || '';

      // 曜日ボタンは時間割タブのみ表示
      var daySel = document.getElementById('day-selector');
      if (target === 'timetable') {
        daySel.classList.remove('hidden');
      } else {
        daySel.classList.add('hidden');
      }
    });
  }
}

// ============================================================
// 【7】タブ① 時間割
// ============================================================
function initTimetableTab() {
  var targetDay = getTargetDayIndex();
  var now       = new Date();
  var h         = now.getHours();
  var lbl       = document.getElementById('today-label');

  if (h >= 16) {
    lbl.textContent = h + ':' + String(now.getMinutes()).padStart(2, '0') +
      ' 以降 → ' + DAY_NAMES[targetDay] + '曜日を表示中';
  } else if (now.getDay() === 0 || now.getDay() === 6) {
    lbl.textContent = '週末のため、月曜日を表示中';
  } else {
    lbl.textContent = DAY_NAMES[targetDay] + '曜日の時間割を表示中';
  }

  // 曜日ボタン
  var dayBtns = document.querySelectorAll('.day-btn');
  for (var i = 0; i < dayBtns.length; i++) {
    dayBtns[i].addEventListener('click', function () {
      for (var j = 0; j < dayBtns.length; j++) {
        dayBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      var idx = parseInt(this.dataset.day, 10);
      renderTimetable(idx);
      renderChecklist(idx);
    });
  }

  // 初期アクティブ
  var activeBtn = document.querySelector('.day-btn[data-day="' + targetDay + '"]');
  if (activeBtn) { activeBtn.classList.add('active'); }

  renderTimetable(targetDay);
  renderChecklist(targetDay);
}

// 時間割カードを描画
function renderTimetable(dayIndex) {
  var container = document.getElementById('timetable-cards');
  container.innerHTML = '';

  var periods = TIMETABLE[dayIndex];
  for (var i = 0; i < periods.length; i++) {
    var subject = periods[i];
    var items   = BELONGINGS[subject] || [];

    // カード要素
    var card = document.createElement('div');
    card.className = 'period-card';

    // 左帯
    var periodEl = document.createElement('div');
    periodEl.className = 'card-period';
    periodEl.innerHTML = '<span class="period-num">' + (i + 1) + '</span><span class="period-lbl">限</span>';

    // 右エリア
    var bodyEl = document.createElement('div');
    bodyEl.className = 'card-body';

    var subjectEl = document.createElement('p');
    subjectEl.className = 'card-subject';
    subjectEl.textContent = subject;
    bodyEl.appendChild(subjectEl);

    if (items.length > 0) {
      var ul = document.createElement('ul');
      ul.className = 'card-items';
      for (var j = 0; j < items.length; j++) {
        var li = document.createElement('li');
        li.textContent = items[j];
        ul.appendChild(li);
      }
      bodyEl.appendChild(ul);
    } else {
      var noItem = document.createElement('span');
      noItem.className = 'card-no-items';
      noItem.textContent = '持ち物なし';
      bodyEl.appendChild(noItem);
    }

    card.appendChild(periodEl);
    card.appendChild(bodyEl);
    container.appendChild(card);
  }
}

// 持ち物チェックリストを描画
function renderChecklist(dayIndex) {
  var listEl   = document.getElementById('checklist');
  var statusEl = document.getElementById('checklist-status');
  var msgEl    = document.getElementById('complete-message');

  msgEl.style.display = 'none';
  listEl.innerHTML    = '';

  // 教科×持ち物の組み合わせを収集（重複なし）
  var seen       = {};
  var checkItems = [];
  var periods    = TIMETABLE[dayIndex];

  for (var i = 0; i < periods.length; i++) {
    var subject = periods[i];
    var items   = BELONGINGS[subject] || [];
    for (var j = 0; j < items.length; j++) {
      var key = subject + ':' + items[j];
      if (!seen[key]) {
        seen[key] = true;
        checkItems.push({ subject: subject, item: items[j], key: key });
      }
    }
  }

  if (checkItems.length === 0) {
    statusEl.textContent = '今日は持ち物がありません 🎈';
    return;
  }

  statusEl.textContent = checkItems.length + ' 個のアイテムを確認しよう！';

  // 各チェック項目を生成（クロージャを避けるためIIFEを使用）
  for (var c = 0; c < checkItems.length; c++) {
    (function (info, total) {
      var li       = document.createElement('li');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      var safeKey  = info.key.replace(/[^a-zA-Z0-9]/g, '_');
      checkbox.id  = 'chk_' + safeKey;

      var label    = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.style.cssText = 'cursor:pointer;flex:1;display:flex;align-items:center;gap:5px;';

      var tag = document.createElement('span');
      tag.className   = 'subject-tag';
      tag.textContent = info.subject;

      var txt = document.createElement('span');
      txt.className   = 'item-text';
      txt.textContent = 'の' + info.item;

      label.appendChild(tag);
      label.appendChild(txt);

      // チェックボックス変更
      checkbox.addEventListener('change', function () {
        if (this.checked) {
          li.classList.add('checked');
        } else {
          li.classList.remove('checked');
        }
        checkAllDone(total);
      });

      // li 全体クリックでもチェック
      li.addEventListener('click', function (e) {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          var evt = document.createEvent('Event');
          evt.initEvent('change', true, true);
          checkbox.dispatchEvent(evt);
        }
      });

      li.appendChild(checkbox);
      li.appendChild(label);
      listEl.appendChild(li);
    })(checkItems[c], checkItems.length);
  }
}

// 全チェック完了確認
function checkAllDone(total) {
  var checked  = document.querySelectorAll('#checklist input[type="checkbox"]:checked').length;
  var statusEl = document.getElementById('checklist-status');
  var msgEl    = document.getElementById('complete-message');

  statusEl.textContent = checked + ' / ' + total + ' 個チェック済み';

  if (checked === total && total > 0) {
    msgEl.style.display = 'block';
    launchConfetti();
  } else {
    msgEl.style.display = 'none';
  }
}

// ============================================================
// 【8】紙吹雪（Canvas アニメーション）
// ============================================================
function launchConfetti() {
  var canvas = document.getElementById('confetti-canvas');
  var ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  var COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#f06595', '#20c997'];

  // パーティクル配列
  var particles = [];
  for (var i = 0; i < 150; i++) {
    particles.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * -canvas.height,
      w:     Math.random() * 10 + 6,
      h:     Math.random() * 6  + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
      drift: (Math.random() - 0.5) * 1.5
    });
  }

  var elapsed = 0;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;
      if (p.y > canvas.height + 10) {
        p.x     = Math.random() * canvas.width;
        p.y     = -10;
        p.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    elapsed++;
    if (elapsed < 240) {
      confettiId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiId = null;
    }
  }

  if (confettiId) { cancelAnimationFrame(confettiId); }
  animate();
}

// ============================================================
// 【9】タブ② ポモドーロタイマー
// ============================================================
function initPomodoroTab() {
  updateTimerDisplay();

  // プリセットボタン
  var presetBtns = document.querySelectorAll('.preset-btn');
  for (var i = 0; i < presetBtns.length; i++) {
    presetBtns[i].addEventListener('click', function () {
      for (var j = 0; j < presetBtns.length; j++) {
        presetBtns[j].classList.remove('active-preset');
      }
      this.classList.add('active-preset');
      setTimerMinutes(parseInt(this.dataset.min, 10));
    });
  }

  // カスタム入力
  document.getElementById('custom-set-btn').addEventListener('click', function () {
    var val = parseInt(document.getElementById('custom-min').value, 10);
    if (!val || val < 1 || val > 180) { return; }
    for (var j = 0; j < presetBtns.length; j++) {
      presetBtns[j].classList.remove('active-preset');
    }
    setTimerMinutes(val);
  });

  // スタートボタン
  document.getElementById('timer-start').addEventListener('click', function () {
    if (timerRemaining <= 0) { return; }
    timerRunning = true;
    document.getElementById('timer-start').disabled = true;
    document.getElementById('timer-pause').disabled = false;
    startBgm(selectedBgm);

    timerInterval = setInterval(function () {
      timerRemaining--;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        stopBgm();
        playChime();
        document.getElementById('timer-mode-label').textContent = '完了！';
        document.getElementById('timer-start').disabled = false;
        document.getElementById('timer-pause').disabled = true;
      }
    }, 1000);
  });

  // 一時停止ボタン
  document.getElementById('timer-pause').addEventListener('click', function () {
    clearInterval(timerInterval);
    timerRunning = false;
    stopBgm();
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-pause').disabled = true;
  });

  // リセットボタン
  document.getElementById('timer-reset').addEventListener('click', function () {
    clearInterval(timerInterval);
    timerRunning   = false;
    timerRemaining = timerTotal;
    stopBgm();
    updateTimerDisplay();
    document.getElementById('timer-mode-label').textContent = '作業';
    document.getElementById('timer-start').disabled = false;
    document.getElementById('timer-pause').disabled = true;
  });

  // BGMボタン
  var bgmBtns = document.querySelectorAll('.bgm-btn');
  for (var b = 0; b < bgmBtns.length; b++) {
    bgmBtns[b].addEventListener('click', function () {
      for (var k = 0; k < bgmBtns.length; k++) {
        bgmBtns[k].classList.remove('active-bgm');
      }
      this.classList.add('active-bgm');
      selectedBgm = this.dataset.bgm;
      if (timerRunning) { startBgm(selectedBgm); }
    });
  }
}

// タイマー表示を更新
function updateTimerDisplay() {
  var min = String(Math.floor(timerRemaining / 60)).padStart(2, '0');
  var sec = String(timerRemaining % 60).padStart(2, '0');
  document.getElementById('timer-time').textContent = min + ':' + sec;

  // プログレスバー
  var ratio = (timerTotal > 0) ? (timerRemaining / timerTotal) : 0;
  document.getElementById('timer-prog-bar').style.width = (ratio * 100) + '%';
}

// タイマーを指定分数にセット
function setTimerMinutes(min) {
  clearInterval(timerInterval);
  timerRunning   = false;
  timerTotal     = min * 60;
  timerRemaining = min * 60;
  stopBgm();
  updateTimerDisplay();
  document.getElementById('timer-start').disabled = false;
  document.getElementById('timer-pause').disabled = true;
  document.getElementById('timer-mode-label').textContent = '作業';
}

// ============================================================
// 【10】BGM（Web Audio API）― すべて try-catch で保護
// ============================================================

// AudioContext を遅延生成して取得
function getAudioCtx() {
  try {
    if (!bgmAudioCtx) {
      bgmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // iOS/Chrome でサスペンド状態なら再開
    if (bgmAudioCtx.state === 'suspended') {
      bgmAudioCtx.resume();
    }
    return bgmAudioCtx;
  } catch (e) {
    return null;
  }
}

// BGMを停止してリソースを解放
function stopBgm() {
  try {
    if (bgmLoopTimer) {
      clearTimeout(bgmLoopTimer);
      bgmLoopTimer = null;
    }
    if (bgmSourceNode) {
      bgmSourceNode.stop();
      bgmSourceNode.disconnect();
      bgmSourceNode = null;
    }
    if (bgmGainNode) {
      bgmGainNode.disconnect();
      bgmGainNode = null;
    }
  } catch (e) {
    // エラーは無視
    bgmSourceNode = null;
    bgmGainNode   = null;
    bgmLoopTimer  = null;
  }
}

// BGMを開始
function startBgm(type) {
  stopBgm();
  if (type === 'none') { return; }

  try {
    var ctx = getAudioCtx();
    if (!ctx) { return; }

    if (type === 'rain' || type === 'wave' || type === 'river') {
      startNoiseBgm(type, ctx);
    } else if (type === 'lofi') {
      startLofiBgm(ctx);
    } else if (type === 'piano') {
      startPianoBgm(ctx);
    }
  } catch (e) {
    // BGMエラーは無視してタイマーは継続
  }
}

// ノイズ系BGM（雨・波・川）
function startNoiseBgm(type, ctx) {
  var sampleRate = ctx.sampleRate;
  var bufSize    = sampleRate * 3;
  var buffer     = ctx.createBuffer(1, bufSize, sampleRate);
  var data       = buffer.getChannelData(0);
  for (var i = 0; i < bufSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  var source    = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop   = true;

  var filter    = ctx.createBiquadFilter();
  if (type === 'rain') {
    filter.type            = 'highshelf';
    filter.frequency.value = 3000;
    filter.gain.value      = 8;
  } else if (type === 'wave') {
    filter.type            = 'lowpass';
    filter.frequency.value = 350;
  } else {
    filter.type            = 'bandpass';
    filter.frequency.value = 1200;
  }

  var gainNode        = ctx.createGain();
  gainNode.gain.value = 0.25;

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();

  bgmSourceNode = source;
  bgmGainNode   = gainNode;
}

// Lofi BGM（低音ループ）
function startLofiBgm(ctx) {
  var osc    = ctx.createOscillator();
  var filter = ctx.createBiquadFilter();
  var gain   = ctx.createGain();

  osc.type             = 'sawtooth';
  osc.frequency.value  = 110;
  filter.type          = 'lowpass';
  filter.frequency.value = 500;
  gain.gain.value      = 0.07;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  bgmSourceNode = osc;
  bgmGainNode   = gain;

  // キック音を一定間隔で追加
  var beatMs   = Math.round(60 / 80 * 1000);
  var stepIdx  = 0;
  var pattern  = [1, 0, 0, 1, 0, 0, 1, 0];

  function tick() {
    if (!timerRunning) { return; }
    if (pattern[stepIdx % pattern.length] === 1) {
      try {
        var b = ctx.createOscillator();
        var g = ctx.createGain();
        b.frequency.setValueAtTime(110, ctx.currentTime);
        b.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.45, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        b.connect(g);
        g.connect(ctx.destination);
        b.start();
        b.stop(ctx.currentTime + 0.4);
      } catch (e) { /* 無視 */ }
    }
    stepIdx++;
    if (timerRunning && selectedBgm === 'lofi') {
      bgmLoopTimer = setTimeout(tick, beatMs);
    }
  }
  tick();
}

// ピアノ風BGM
function startPianoBgm(ctx) {
  var notes = [261.6, 220.0, 174.6, 196.0]; // C4, A3, F3, G3
  var idx   = 0;

  function playNote() {
    if (!timerRunning) { return; }
    try {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type            = 'sine';
      osc.frequency.value = notes[idx % notes.length];
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.0);
    } catch (e) { /* 無視 */ }
    idx++;
    if (timerRunning && selectedBgm === 'piano') {
      bgmLoopTimer = setTimeout(playNote, 2000);
    }
  }
  playNote();
}

// チャイム音（タイマー終了時）
function playChime() {
  try {
    var ctx   = getAudioCtx();
    if (!ctx) { return; }
    var freqs = [784, 659, 523, 659];
    for (var i = 0; i < freqs.length; i++) {
      (function (freq, delay) {
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        var t    = ctx.currentTime + delay;
        osc.type            = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.9);
      })(freqs[i], i * 0.35);
    }
  } catch (e) { /* チャイムエラーは無視 */ }
}

// ============================================================
// 【11】タブ③ リマインダー
// ============================================================

// localStorageからデータを安全に読み込む
var reminders = [];
try {
  reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
  if (!Array.isArray(reminders)) { reminders = []; }
} catch (e) {
  reminders = [];
}

function saveReminders() {
  try {
    localStorage.setItem('reminders', JSON.stringify(reminders));
  } catch (e) { /* 無視 */ }
}

// 期限までの日数（負なら期限切れ）
function daysUntil(dateStr) {
  if (!dateStr) { return null; }
  var today    = new Date();
  today.setHours(0, 0, 0, 0);
  var deadline = new Date(dateStr);
  return Math.ceil((deadline - today) / 86400000);
}

// 期限バッジのHTML文字列を返す
function getBadgeHtml(days) {
  if (days === null) { return ''; }
  if (days < 0)  { return '<span class="deadline-badge badge-overdue">期限切れ</span>'; }
  if (days === 0) { return '<span class="deadline-badge badge-urgent">今日！</span>'; }
  if (days <= 2) { return '<span class="deadline-badge badge-urgent">あと' + days + '日！</span>'; }
  if (days <= 7) { return '<span class="deadline-badge badge-soon">あと' + days + '日</span>'; }
  return '<span class="deadline-badge badge-safe">あと' + days + '日</span>';
}

function initReminderTab() {
  // 今日の日付をデフォルトにセット
  var today = new Date().toISOString().split('T')[0];
  document.getElementById('reminder-date').value = today;

  document.getElementById('reminder-add-btn').addEventListener('click', addReminder);

  document.getElementById('reminder-text').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { addReminder(); }
  });

  renderReminders();
}

function addReminder() {
  var text = document.getElementById('reminder-text').value.trim();
  var date = document.getElementById('reminder-date').value;
  if (!text) {
    document.getElementById('reminder-text').focus();
    return;
  }
  reminders.push({ text: text, date: date || null });
  saveReminders();
  renderReminders();
  document.getElementById('reminder-text').value = '';
}

function renderReminders() {
  var listEl   = document.getElementById('reminder-list');
  var emptyEl  = document.getElementById('reminder-empty');
  var badgeEl  = document.getElementById('reminder-badge');
  listEl.innerHTML = '';

  // 期限順ソート（null は末尾）
  var sorted = reminders.slice().sort(function (a, b) {
    if (!a.date && !b.date) { return 0; }
    if (!a.date) { return 1; }
    if (!b.date) { return -1; }
    return new Date(a.date) - new Date(b.date);
  });

  // 緊急件数をナビバッジに反映
  var urgentCount = 0;
  for (var i = 0; i < reminders.length; i++) {
    var d = daysUntil(reminders[i].date);
    if (d !== null && d <= 7) { urgentCount++; }
  }
  if (urgentCount > 0) {
    badgeEl.textContent    = urgentCount;
    badgeEl.style.display  = 'flex';
  } else {
    badgeEl.style.display  = 'none';
  }

  if (sorted.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  for (var s = 0; s < sorted.length; s++) {
    (function (r, originalIdx) {
      var days = daysUntil(r.date);
      var li   = document.createElement('li');
      li.className = 'reminder-item';

      li.innerHTML =
        getBadgeHtml(days) +
        '<span class="reminder-text">' + escHtml(r.text) + '</span>' +
        (r.date ? '<span class="reminder-date-text">' + r.date + '</span>' : '') +
        '<button class="del-btn" title="削除">✕</button>';

      li.querySelector('.del-btn').addEventListener('click', function (e) {
        e.stopPropagation();
        reminders.splice(originalIdx, 1);
        saveReminders();
        renderReminders();
      });

      listEl.appendChild(li);
    })(sorted[s], reminders.indexOf(sorted[s]));
  }
}

// ============================================================
// 【12】タブ④ 設定（テーマ切り替え）
// ============================================================
function initTheme() {
  var saved = 'normal';
  try { saved = localStorage.getItem('theme') || 'normal'; } catch (e) {}
  applyTheme(saved);
}

function initSettingsTab() {
  var themeBtns = document.querySelectorAll('.theme-btn');
  for (var i = 0; i < themeBtns.length; i++) {
    themeBtns[i].addEventListener('click', function () {
      var theme = this.dataset.theme;
      applyTheme(theme);
      try { localStorage.setItem('theme', theme); } catch (e) {}
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var themeBtns = document.querySelectorAll('.theme-btn');
  for (var i = 0; i < themeBtns.length; i++) {
    if (themeBtns[i].dataset.theme === theme) {
      themeBtns[i].classList.add('active-theme');
    } else {
      themeBtns[i].classList.remove('active-theme');
    }
  }
}

// ============================================================
// 【13】ウィンドウリサイズ時にキャンバスサイズを更新
// ============================================================
window.addEventListener('resize', function () {
  var cv    = document.getElementById('confetti-canvas');
  cv.width  = window.innerWidth;
  cv.height = window.innerHeight;
});

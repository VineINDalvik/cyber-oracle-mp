const tarot = require('../../utils/tarot');
const api = require('../../utils/api');
const collection = require('../../utils/collection');

const BIRTH_KEY = 'co_birth_profile_v1';
const DAILY_STATE_PREFIX = 'co_daily_state_v1:';

const SHICHEN_OPTIONS = [
  { value: '', label: '不设置' },
  { value: '子时', label: '子时（23:00-01:00）' },
  { value: '丑时', label: '丑时（01:00-03:00）' },
  { value: '寅时', label: '寅时（03:00-05:00）' },
  { value: '卯时', label: '卯时（05:00-07:00）' },
  { value: '辰时', label: '辰时（07:00-09:00）' },
  { value: '巳时', label: '巳时（09:00-11:00）' },
  { value: '午时', label: '午时（11:00-13:00）' },
  { value: '未时', label: '未时（13:00-15:00）' },
  { value: '申时', label: '申时（15:00-17:00）' },
  { value: '酉时', label: '酉时（17:00-19:00）' },
  { value: '戌时', label: '戌时（19:00-21:00）' },
  { value: '亥时', label: '亥时（21:00-23:00）' },
];

const WEATHER_OPTIONS = [
  { value: '', label: '不设置' },
  { value: 'sunny', label: '晴' },
  { value: 'cloudy', label: '阴' },
  { value: 'rain', label: '雨' },
  { value: 'snow', label: '雪' },
  { value: 'wind', label: '风' },
  { value: 'fog', label: '雾' },
  { value: 'hot', label: '热' },
  { value: 'cold', label: '冷' },
];

const MOOD_OPTIONS = [
  { value: '', label: '不设置' },
  { value: 'low', label: '低落' },
  { value: 'mid', label: '一般' },
  { value: 'high', label: '很棒' },
];

function getBirth() {
  try {
    return wx.getStorageSync(BIRTH_KEY) || {};
  } catch { return {}; }
}

function saveBirth(b) {
  try { wx.setStorageSync(BIRTH_KEY, b || {}); } catch {}
}

function getDailyState(dateStr) {
  try {
    return wx.getStorageSync(DAILY_STATE_PREFIX + dateStr) || {};
  } catch { return {}; }
}

function saveDailyState(dateStr, s) {
  try { wx.setStorageSync(DAILY_STATE_PREFIX + dateStr, s || {}); } catch {}
}

function weatherLabel(w) {
  var m = { sunny:'晴', cloudy:'阴', rain:'雨', snow:'雪', wind:'风', fog:'雾', hot:'热', cold:'冷' };
  return m[w] || '';
}

function moodLabel(m) {
  var map = { low:'低落', mid:'一般', high:'很棒' };
  return map[m] || '';
}

function buildSeed(deviceId, dateStr, birth, daily) {
  return [
    'd=' + deviceId,
    'date=' + dateStr,
    daily.sleep ? 'sleep=' + daily.sleep : '',
    daily.stress ? 'stress=' + daily.stress : '',
    daily.mood ? 'mood=' + daily.mood : '',
    daily.weather ? 'weather=' + daily.weather : '',
    birth.birthDate ? 'birth=' + birth.birthDate : '',
    birth.birthTime ? 'time=' + birth.birthTime : '',
  ].filter(Boolean).join('|');
}

function buildCalendar(seed, gz, wLabel, mLabel) {
  var hash = function(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  var rng = hash(seed);
  var yiPool = ['沟通协商','整理收纳','做计划','轻运动','读书学习','断舍离','写作记录','早睡修复','复盘总结','散步晒太阳','社交破冰','补水养生'];
  var jiPool = ['冲动决策','硬刚对抗','熬夜透支','过度消费','情绪化发言','拖延逃避','过量咖啡','无意义内耗'];
  var pick = function(arr, n, offset) {
    var out = [], used = {};
    for (var i = 0; i < n; i++) {
      var idx = (rng + offset + i * 97) % arr.length;
      while (used[idx]) idx = (idx + 1) % arr.length;
      used[idx] = true;
      out.push(arr[idx]);
    }
    return out;
  };
  var yi = pick(yiPool, 3, 11);
  var ji = pick(jiPool, 2, 37);
  var adviceBase = gz.wuxingElement === '水' ? '适合回收、沉淀、慢一点' :
    gz.wuxingElement === '火' ? '适合启动、推进、把话说开' :
    gz.wuxingElement === '金' ? '适合断舍离、做取舍、立规矩' :
    gz.wuxingElement === '木' ? '适合学习成长、建立链接' : '适合稳住节奏、做基础建设';
  var moodHint = mLabel ? '心情' + mLabel + '时：先稳住，再出手。' : '';
  var weatherHint = wLabel ? '天气' + wLabel + '：按环境调节节奏。' : '';
  var advice = [adviceBase, moodHint, weatherHint].filter(Boolean).join(' ');
  return { yi: yi, ji: ji, advice: advice };
}

Page({
  data: {
    dateStr: '',
    weekday: '',
    result: null,
    ganZhi: null,
    derivation: '',
    reading: '',
    showReading: false,
    isLoading: false,
    collectionCount: 0,
    picked: false,

    showBirth: false,
    showDaily: false,

    sleepOptions: [
      { value: '', label: '不设置' },
      { value: 'good', label: '睡得好' },
      { value: 'ok', label: '一般' },
      { value: 'bad', label: '没睡好' },
    ],
    stressOptions: [
      { value: '', label: '不设置' },
      { value: 'low', label: '低' },
      { value: 'mid', label: '中' },
      { value: 'high', label: '高' },
    ],
    moodOptions: MOOD_OPTIONS,
    weatherOptions: WEATHER_OPTIONS,
    shichenOptions: SHICHEN_OPTIONS,

    birth: { birthDate: '', birthTime: '' },
    daily: { sleep: '', stress: '', mood: '', weather: '' },

    birthHasFilled: false,
    dailyHasFilled: false,
    weatherText: '',
    moodText: '',

    calendar: null,
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    var self = this;
    var dateStr = tarot.getTodayDateString();
    var weekday = ['日','一','二','三','四','五','六'][new Date().getDay()];
    var deviceId = collection.getDeviceId();
    var birth = getBirth();
    var daily = getDailyState(dateStr);
    var seed = buildSeed(deviceId, dateStr, birth, daily);
    var result = tarot.getDailySign(dateStr, seed);
    var gz = result.ganZhi;
    var picked = !!wx.getStorageSync('co_daily_picked_' + dateStr);
    var wLabel = weatherLabel(daily.weather);
    var mLabel = moodLabel(daily.mood);
    var calendar = buildCalendar(seed, gz, wLabel, mLabel);

    self.setData({
      dateStr: dateStr, weekday: weekday, result: result, ganZhi: gz,
      derivation: gz.gan + gz.zhi + '日 → ' + gz.wuxing + '（' + gz.wuxingElement + '行）→ 塔罗' + result.card.element + '元素 → 赛博·' + result.card.name,
      collectionCount: collection.getCollection().seenCards.length,
      birth: { birthDate: birth.birthDate || '', birthTime: birth.birthTime || '' },
      daily: { sleep: daily.sleep || '', stress: daily.stress || '', mood: daily.mood || '', weather: daily.weather || '' },
      birthHasFilled: !!(birth.birthDate || birth.birthTime),
      dailyHasFilled: !!(daily.weather || daily.mood),
      weatherText: wLabel,
      moodText: mLabel,
      picked: picked,
      calendar: calendar,
    });

    collection.syncToServer().then(function() {
      collection.recordCardSeen(result.card.id);
      collection.dailyCheckin(dateStr).then(function() {
        var stats = collection.getCollection();
        self.setData({ collectionCount: stats.seenCards.length });
      });
    });

    // hydrate birth from server if local is empty
    if (!birth.birthDate && !birth.birthTime) {
      collection.apiFetch().then(function(res) {
        if (res && res.birthProfile) {
          var bp = res.birthProfile;
          if (bp.birthDate || bp.birthTime) {
            saveBirth({ birthDate: bp.birthDate, birthTime: bp.birthTime });
            self.setData({
              birth: { birthDate: bp.birthDate || '', birthTime: bp.birthTime || '' },
              birthHasFilled: true,
            });
            self._recompute();
          }
        }
      }).catch(function() {});
    }
  },

  _recompute() {
    var dateStr = this.data.dateStr;
    var deviceId = collection.getDeviceId();
    var birth = getBirth();
    var daily = getDailyState(dateStr);
    var seed = buildSeed(deviceId, dateStr, birth, daily);
    var result = tarot.getDailySign(dateStr, seed);
    var gz = result.ganZhi;
    var wLabel = weatherLabel(daily.weather);
    var mLabel = moodLabel(daily.mood);
    var calendar = buildCalendar(seed, gz, wLabel, mLabel);
    this.setData({
      result: result, ganZhi: gz,
      derivation: gz.gan + gz.zhi + '日 → ' + gz.wuxing + '（' + gz.wuxingElement + '行）→ 塔罗' + result.card.element + '元素 → 赛博·' + result.card.name,
      weatherText: wLabel, moodText: mLabel,
      calendar: calendar,
    });
  },

  pickCard(e) {
    var idx = Number(e.currentTarget.dataset.idx || 0);
    try {
      wx.setStorageSync('co_daily_picked_' + this.data.dateStr, 1);
      wx.setStorageSync('co_daily_pick_' + this.data.dateStr, idx);
    } catch {}
    this.setData({ picked: true });
  },

  noop() {},

  // --- Birth Modal ---
  openBirth() {
    var b = getBirth();
    this.setData({
      showBirth: true,
      birth: { birthDate: b.birthDate || '', birthTime: b.birthTime || '' },
    });
  },

  closeBirth() { this.setData({ showBirth: false }); },

  onBirthDateChange(e) {
    this.setData({ 'birth.birthDate': e.detail.value });
  },

  onBirthTimeChange(e) {
    var idx = Number(e.detail.value || 0);
    var opt = SHICHEN_OPTIONS[idx] || SHICHEN_OPTIONS[0];
    this.setData({ 'birth.birthTime': opt.value });
  },

  saveBirthProfile() {
    var b = this.data.birth;
    saveBirth({ birthDate: (b.birthDate || '').trim(), birthTime: (b.birthTime || '').trim() });
    this.setData({
      showBirth: false, birthHasFilled: !!(b.birthDate || b.birthTime),
      reading: '', showReading: false, picked: false,
    });
    this._clearPickCache();
    this._recompute();
    // sync to server
    var deviceId = collection.getDeviceId();
    collection.apiCall('birth-set', { birthDate: b.birthDate, birthTime: b.birthTime });
  },

  clearBirthProfile() {
    saveBirth({});
    this.setData({
      showBirth: false, birthHasFilled: false,
      birth: { birthDate: '', birthTime: '' },
      reading: '', showReading: false, picked: false,
    });
    this._clearPickCache();
    this._recompute();
    collection.apiCall('birth-set', { birthDate: '', birthTime: '' });
  },

  // --- Daily State Modal ---
  openDaily() {
    var d = getDailyState(this.data.dateStr);
    this.setData({
      showDaily: true,
      daily: { sleep: d.sleep || '', stress: d.stress || '', mood: d.mood || '', weather: d.weather || '' },
    });
  },

  closeDaily() { this.setData({ showDaily: false }); },

  onDailySleepChange(e) {
    var idx = Number(e.detail.value || 0);
    var opts = this.data.sleepOptions;
    this.setData({ 'daily.sleep': opts[idx].value });
  },

  onDailyStressChange(e) {
    var idx = Number(e.detail.value || 0);
    var opts = this.data.stressOptions;
    this.setData({ 'daily.stress': opts[idx].value });
  },

  onDailyMoodChange(e) {
    var idx = Number(e.detail.value || 0);
    var opts = this.data.moodOptions;
    this.setData({ 'daily.mood': opts[idx].value });
  },

  onDailyWeatherChange(e) {
    var idx = Number(e.detail.value || 0);
    var opts = this.data.weatherOptions;
    this.setData({ 'daily.weather': opts[idx].value });
  },

  saveDailyState() {
    var d = this.data.daily;
    saveDailyState(this.data.dateStr, d);
    this.setData({
      showDaily: false,
      dailyHasFilled: !!(d.weather || d.mood),
      reading: '', showReading: false, picked: false,
    });
    this._clearPickCache();
    this._recompute();
  },

  clearDailyState() {
    saveDailyState(this.data.dateStr, {});
    this.setData({
      showDaily: false, dailyHasFilled: false,
      daily: { sleep: '', stress: '', mood: '', weather: '' },
      reading: '', showReading: false, picked: false,
    });
    this._clearPickCache();
    this._recompute();
  },

  _clearPickCache() {
    try {
      wx.setStorageSync('co_daily_picked_' + this.data.dateStr, '');
      wx.setStorageSync('co_daily_pick_' + this.data.dateStr, '');
    } catch {}
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  requestReading() {
    if (this.data.reading) {
      this.setData({ showReading: !this.data.showReading });
      return;
    }
    this.fetchReading();
  },

  fetchReading() {
    var self = this;
    var result = self.data.result;
    var dateStr = self.data.dateStr;
    var gz = self.data.ganZhi;
    var birth = getBirth();
    var daily = getDailyState(dateStr);
    self.setData({ showReading: true, isLoading: true });
    collection.recordReading();

    api.streamReading({
      mode: 'daily',
      card: '赛博·' + result.card.name + '（' + result.card.cyberName + '）',
      cardMeaning: result.isReversed ? result.card.reversed : result.card.upright,
      isReversed: result.isReversed,
      fortune: result.fortune,
      date: dateStr,
      ganZhi: gz.gan + gz.zhi + '日',
      wuxing: gz.wuxing,
      wuxingElement: gz.wuxingElement,
      direction: gz.direction,
      color: gz.color,
      deviceId: collection.getDeviceId(),
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      sleep: daily.sleep,
      stress: daily.stress,
      mood: daily.mood,
      weather: daily.weather,
    }).then(function(text) {
      self.setData({ reading: text, isLoading: false });
    }).catch(function(e) {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  previewTip() {
    var url = '/images/tip-qrcode.jpg';
    wx.previewImage({ current: url, urls: [url] });
  },

  onShareAppMessage() {
    var result = this.data.result;
    return {
      title: '今天的赛博签是「赛博·' + result.card.name + '」',
      path: '/pages/daily/daily',
    };
  },

  onShareTimeline() {
    var result = this.data.result;
    return {
      title: '赛博神算子 · 今日签「赛博·' + (result ? result.card.name : '') + '」',
    };
  },
});

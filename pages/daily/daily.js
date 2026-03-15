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
    weekCards: [], // 最近7天的牌历

    showBirth: false,
    showDaily: false,
    showShareCard: false,
    shareCardLoading: false,
    shareCardPath: '',

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
      weekCards: self._buildWeekCards(),
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
    var result = this.data.result;
    try {
      wx.setStorageSync('co_daily_picked_' + this.data.dateStr, 1);
      wx.setStorageSync('co_daily_pick_' + this.data.dateStr, idx);
      // 记录当天牌面，用于周历展示
      if (result && result.card) {
        wx.setStorageSync('co_daily_card_' + this.data.dateStr, {
          cardId: result.card.id,
          isReversed: result.isReversed,
          cardName: result.card.name,
        });
      }
    } catch {}
    this.setData({ picked: true, weekCards: this._buildWeekCards() });
  },

  _buildWeekCards() {
    var apiUtils = require('../../utils/api');
    var days = [];
    var weekNames = ['日','一','二','三','四','五','六'];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().slice(0, 10);
      var month = d.getMonth() + 1;
      var day = d.getDate();
      var wn = weekNames[d.getDay()];
      var cardData = null;
      try { cardData = wx.getStorageSync('co_daily_card_' + ds) || null; } catch {}
      days.push({
        dateStr: ds,
        label: (i === 0 ? '今天' : ('周' + wn)),
        dayNum: month + '/' + day,
        isToday: i === 0,
        cardId: cardData ? cardData.cardId : -1,
        isReversed: cardData ? cardData.isReversed : false,
        cardName: cardData ? cardData.cardName : '',
        imageUrl: cardData ? apiUtils.getCardImageUrl(cardData.cardId) : '',
        hasPicked: !!cardData,
      });
    }
    return days;
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

  onHide() {
    // 保存已获取的 LLM 解读文本，切回来不需要重新请求
    if (this.data.reading) {
      getApp().globalData.dailyPageState = {
        reading: this.data.reading,
        showReading: this.data.showReading,
        dateStr: this.data.dateStr,
      };
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    // 如果今天的解读已缓存，切回来直接还原，不重新请求
    var saved = getApp().globalData.dailyPageState;
    if (saved && saved.reading && saved.dateStr === this.data.dateStr) {
      if (!this.data.reading) {
        this.setData({ reading: saved.reading, showReading: saved.showReading });
      }
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

    var calendar = self.data.calendar;
    api.streamReading({
      mode: 'daily',
      card: '赛博·' + result.card.name + '（' + result.card.cyberName + '）',
      cardMeaning: result.isReversed ? result.card.reversed : result.card.upright,
      cardUprightMeaning: result.card.upright,
      cardReversedMeaning: result.card.reversed,
      isReversed: result.isReversed,
      fortune: result.fortune,
      label: result.label,
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
      calendarYi: calendar ? calendar.yi.join('、') : '',
      calendarJi: calendar ? calendar.ji.join('、') : '',
      calendarAdvice: calendar ? calendar.advice : '',
    }).then(function(text) {
      self.setData({ reading: text, isLoading: false });
    }).catch(function(e) {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  showShareOptions() {
    this.setData({ showShareCard: true, shareCardPath: '' });
  },

  closeShareCard() {
    this.setData({ showShareCard: false, shareCardLoading: false });
  },

  _buildShareParams() {
    var result = this.data.result;
    var gz = this.data.ganZhi;
    return {
      cardId: result.card.id,
      cardName: result.card.name,
      cyberName: result.card.cyberName,
      isReversed: result.isReversed,
      fortune: result.fortune,
      label: result.label,
      mode: 'daily',
      modeLabel: '每日签',
      dateStr: this.data.dateStr,
      ganZhi: gz ? gz.gan + gz.zhi + '日' : '',
      wuxing: gz ? gz.wuxing : '',
    };
  },

  saveShareCard() {
    if (this.data.shareCardLoading) return;
    var self = this;
    // 如果已生成，直接保存
    if (self.data.shareCardPath) {
      self._doSave(self.data.shareCardPath);
      return;
    }
    self.setData({ shareCardLoading: true });
    api.generateShareCard(self._buildShareParams()).then(function(tmpPath) {
      self.setData({ shareCardLoading: false, shareCardPath: tmpPath });
      self._doSave(tmpPath);
    }).catch(function(e) {
      self.setData({ shareCardLoading: false });
      wx.showToast({ title: '生成失败，可截图保存', icon: 'none', duration: 2500 });
    });
  },

  _doSave(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function() {
        wx.showToast({ title: '已保存到相册 ✓', icon: 'success', duration: 2000 });
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在右上角「...」→ 设置 中允许访问相册',
            confirmText: '去设置',
            success: function(res) { if (res.confirm) wx.openSetting(); },
          });
        } else {
          wx.showToast({ title: '保存失败，请截图', icon: 'none', duration: 2000 });
        }
      },
    });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  showCollectionTip() {
    var count = this.data.collectionCount;
    var left = 22 - count;
    var msg = count === 22
      ? '恭喜！你已集齐全部 22 张大阿卡纳！\n\n塔罗共有 22 张主牌（大阿卡纳），每天抽签系统会记录你抽到过哪些牌。每种牌只算一次，不重复计数。\n\n你是见过世界的人。'
      : '你已抽到 ' + count + '/22 种牌，还差 ' + left + ' 种没见过。\n\n塔罗共有 22 张主牌（大阿卡纳），每天抽签系统会记录你见过哪些牌。每种只算一次，全部解锁才算集齐。\n\n坚持每天来，慢慢遇见它们。';
    wx.showModal({
      title: '已抽到 ' + count + '/22 种牌',
      content: msg,
      showCancel: false,
      confirmText: '知道了',
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

const tarot = require('../../utils/tarot');
const api = require('../../utils/api');
const collection = require('../../utils/collection');

const DREAM_HISTORY_KEY = 'co_dream_history_v1';
const MAX_HISTORY = 30;

function getDreamHistory() {
  try { return wx.getStorageSync(DREAM_HISTORY_KEY) || []; } catch { return []; }
}

function saveDreamEntry(entry) {
  try {
    var list = getDreamHistory();
    // 去重（同一天的覆盖）
    list = list.filter(function(d) { return d.dateStr !== entry.dateStr; });
    list.unshift(entry);
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    wx.setStorageSync(DREAM_HISTORY_KEY, list);
    return list;
  } catch { return []; }
}

const DREAM_HINTS = [
  '我梦到自己在飞…',
  '梦见大水淹没了城市…',
  '梦到蛇缠绕在手臂上…',
  '梦见考试但什么都不会…',
  '梦到已故的亲人…',
  '梦见在黑暗中寻找出口…',
  '梦到掉牙了…',
  '梦见自己在追赶什么…',
];

Page({
  data: {
    phase: 'input',
    dream: '',
    hint: '',
    result: null,
    reading: '',
    isLoading: false,
    // 时间轴
    showHistory: false,
    dreamHistory: [],
    // 分享卡片
    showShareCard: false,
    shareCardLoading: false,
    shareCardPath: '',
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({
      hint: DREAM_HINTS[Math.floor(Math.random() * DREAM_HINTS.length)],
      dreamHistory: getDreamHistory(),
    });
    // 页面被内存回收后重建，尝试还原上次状态
    var saved = getApp().globalData.dreamPageState;
    if (saved && saved.phase && saved.phase !== 'input') {
      this.setData(saved);
    }
  },

  onHide() {
    if (this.data.phase !== 'input' || this.data.reading) {
      getApp().globalData.dreamPageState = {
        phase: this.data.phase,
        dream: this.data.dream,
        result: this.data.result,
        reading: this.data.reading,
        isLoading: false,
      };
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    var saved = getApp().globalData.dreamPageState;
    if (saved && saved.phase && saved.phase !== 'input' && this.data.phase === 'input') {
      this.setData(saved);
    }
  },

  onDreamInput(e) { this.setData({ dream: e.detail.value }); },

  fillExample() {
    var base = DREAM_HINTS[Math.floor(Math.random() * DREAM_HINTS.length)];
    var expanded = base + '\n\n- 发生地点/场景：\n- 出现的人/物：\n- 你当时的情绪：\n- 结尾发生了什么：\n';
    this.setData({ dream: expanded });
  },

  changeHint() {
    var t = DREAM_HINTS[Math.floor(Math.random() * DREAM_HINTS.length)];
    this.setData({ dream: t });
  },

  clearDream() {
    this.setData({ dream: '' });
  },

  startAnalysis() {
    if (this.data.dream.trim().length < 4) return;
    this.setData({ phase: 'analyzing' });
    var result = tarot.dreamDraw(this.data.dream);
    this.setData({ result: result });
    collection.recordCardSeen(result.card.id);
    var self = this;
    setTimeout(function() { self.setData({ phase: 'result' }); }, 1200);
  },

  requestReading() { this.fetchReading(); },

  fetchReading() {
    var self = this;
    var result = self.data.result;
    var dream = self.data.dream;
    self.setData({ isLoading: true });
    collection.recordReading();
    api.streamReading({
      mode: 'dream',
      dreamText: dream,
      card: '赛博·' + result.card.name + '（' + result.card.cyberName + '）',
      cardMeaning: result.isReversed ? result.card.reversed : result.card.upright,
      isReversed: result.isReversed,
      element: result.card.element,
    }).then(function(text) {
      self.setData({ reading: text, isLoading: false });
      // 保存到历史记录
      var d = new Date();
      var dateStr = d.toISOString().slice(0, 10);
      var entry = {
        dateStr: dateStr,
        timeStr: d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'),
        dream: dream,
        cardId: result.card.id,
        isReversed: result.isReversed,
        cardName: result.card.name,
        imageUrl: api.getCardImageUrl(result.card.id),
        reading: text,
        dreamExcerpt: dream.length > 40 ? dream.slice(0, 40) + '…' : dream,
      };
      var newHistory = saveDreamEntry(entry);
      self.setData({ dreamHistory: newHistory });
    }).catch(function(e) {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  toggleHistory() {
    this.setData({ showHistory: !this.data.showHistory });
  },

  viewHistoryItem(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      phase: 'result',
      dream: item.dream,
      result: {
        card: { id: item.cardId, name: item.cardName },
        isReversed: item.isReversed,
      },
      reading: item.reading,
      showHistory: false,
    });
  },

  previewTip() {
    var url = '/images/tip-qrcode.jpg';
    wx.previewImage({ current: url, urls: [url] });
  },

  reset() {
    this.setData({ phase: 'input', dream: '', result: null, reading: '', isLoading: false, showShareCard: false });
  },

  noop() {},

  // --- Share Card ---
  showShareCard() {
    this.setData({ showShareCard: true, shareCardPath: '' });
  },

  closeShareCard() {
    this.setData({ showShareCard: false, shareCardLoading: false });
  },

  _buildShareParams() {
    var result = this.data.result;
    var reading = this.data.reading;
    return {
      cardId: result.card.id,
      cardName: result.card.name,
      cyberName: result.card.cyberName || result.card.name,
      isReversed: result.isReversed,
      fortune: reading || result.card.upright,
      label: '梦境解码',
      mode: 'dream',
      modeLabel: '梦境解码',
      dateStr: new Date().toISOString().slice(0, 10),
    };
  },

  saveShareCard() {
    if (this.data.shareCardLoading) return;
    var self = this;
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

  onShareAppMessage() {
    var result = this.data.result;
    var title = '赛博神算子 · 解梦';
    if (result) {
      title = '梦境对应「赛博·' + result.card.name + '」';
    }
    return { title: title, path: '/pages/dream/dream' };
  },

  onShareTimeline() {
    var result = this.data.result;
    var title = '赛博神算子 · 解梦';
    if (result) {
      title = '梦境对应「赛博·' + result.card.name + '」';
    }
    return { title: title };
  },
});

const tarot = require('../../utils/tarot');
const api = require('../../utils/api');
const collection = require('../../utils/collection');

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
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({ hint: DREAM_HINTS[Math.floor(Math.random() * DREAM_HINTS.length)] });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
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
    }).catch(function() {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  previewTip() {
    var url = '/images/tip-qrcode.jpg';
    wx.previewImage({ current: url, urls: [url] });
  },

  reset() {
    this.setData({ phase: 'input', dream: '', result: null, reading: '', isLoading: false });
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

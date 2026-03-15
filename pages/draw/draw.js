const tarot = require('../../utils/tarot');
const api = require('../../utils/api');
const collection = require('../../utils/collection');

function makeTableCards(seed, count) {
  var sysInfo = wx.getSystemInfoSync();
  // 以屏幕宽度为基准，散牌偏移约 ±4% 屏宽，保证所有机型效果一致
  var maxOffset = Math.round(sysInfo.windowWidth * 0.04);
  var cards = [];
  for (var i = 0; i < count; i++) {
    var n = ((seed + i * 997) % 1000 + 1000) % 1000;
    cards.push({
      id: 't_' + seed + '_' + i,
      rot: ((n % 13) - 6) * 2.2,
      // 直接用 px（已由 windowWidth 计算，device px 单位，inline style 用 px）
      x: Math.round(((n % 9) - 4) / 4 * maxOffset),
      removed: false,
    });
  }
  return cards;
}

Page({
  data: {
    view: 'menu',
    phase: 'select',
    spreads: tarot.SPREAD_TYPES,
    topics: [
      { id:'love', icon:'💘', name:'感情运', desc:'感情全维解读' },
      { id:'career', icon:'💼', name:'事业运', desc:'事业全维解读' },
      { id:'wealth', icon:'💰', name:'财运', desc:'财运全维解读' },
      { id:'health', icon:'🏥', name:'健康', desc:'身心能量分析' },
      { id:'social', icon:'🤝', name:'人际关系', desc:'社交场域解读' },
      { id:'open', icon:'🧩', name:'自由提问', desc:'写下你最想问的一句话', requiresQuestion: true },
    ],
    topicQuestion: '',
    selectedSpread: null,
    selectedTopic: null,
    spreadResult: null,
    pickIndex: 0,
    tableCards: [],
    shuffleCount: 0,
    hexagram: null,
    wuxingAnalysis: '',
    topicGanZhi: null,
    topicFortune: null,
    briefReading: '',
    reading: '',
    showReading: false,
    isLoading: false,
  },

  onLoad() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    // 页面被内存回收后重新 onLoad，从 globalData 还原上一次的状态
    var saved = getApp().globalData.drawPageState;
    if (saved && saved.view && saved.view !== 'menu') {
      this.setData(saved);
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 如果页面没有被销毁（正常切 tab），也要兜一下，以防 onLoad 没执行
    var saved = getApp().globalData.drawPageState;
    if (saved && saved.view && saved.view !== 'menu' && this.data.view === 'menu') {
      this.setData(saved);
    }
  },

  onHide() {
    // 离开页面时把完整状态快照存到 globalData
    getApp().globalData.drawPageState = {
      view: this.data.view,
      phase: this.data.phase,
      selectedSpread: this.data.selectedSpread,
      selectedTopic: this.data.selectedTopic,
      spreadResult: this.data.spreadResult,
      pickIndex: this.data.pickIndex,
      tableCards: this.data.tableCards,
      shuffleCount: this.data.shuffleCount,
      hexagram: this.data.hexagram,
      wuxingAnalysis: this.data.wuxingAnalysis,
      topicGanZhi: this.data.topicGanZhi,
      topicFortune: this.data.topicFortune,
      briefReading: this.data.briefReading,
      reading: this.data.reading,
      showReading: this.data.showReading,
      topicQuestion: this.data.topicQuestion,
      isLoading: false, // 加载中状态不保留，切回来如需重试手动操作
    };
  },

  selectSpread(e) {
    var idx = e.currentTarget.dataset.idx;
    var spread = this.data.spreads[idx];
    var result = tarot.drawSpread(spread);
    result.cards.forEach(function(c) { collection.recordCardSeen(c.card.id); });
    var seed = Date.now();
    var tableCount = Math.max(9, spread.cardCount + 8);
    this.setData({
      selectedSpread: spread, spreadResult: result,
      view: 'spread', phase: 'shuffling',
      pickIndex: 0, shuffleCount: 0,
      tableCards: makeTableCards(seed, tableCount),
    });
    var self = this;
    setTimeout(function() { self.setData({ phase: 'table' }); }, 1200);
  },

  selectTopic(e) {
    var idx = e.currentTarget.dataset.idx;
    var topic = this.data.topics[idx];
    this.setData({ selectedTopic: topic, topicQuestion: '' });
    if (topic.requiresQuestion) {
      this.setData({ view: 'topicQuestion', phase: 'select' });
      return;
    }
    this._startTopicFortune(topic);
  },

  onQuestionInput(e) {
    this.setData({ topicQuestion: e.detail.value });
  },

  submitQuestion() {
    if (this.data.topicQuestion.trim().length < 3) return;
    this._startTopicFortune(this.data.selectedTopic);
  },

  backFromQuestion() {
    this.setData({ view: 'menu', phase: 'select', selectedTopic: null, topicQuestion: '' });
  },

  _startTopicFortune(topic) {
    var spread = this.data.spreads[1];
    var fortune = tarot.castTopicFortune(topic.id, spread);
    fortune.spread.cards.forEach(function(c) { collection.recordCardSeen(c.card.id); });
    var seed = Date.now();
    var tableCount = Math.max(9, spread.cardCount + 8);
    this.setData({
      selectedSpread: spread,
      view: 'topic', phase: 'shuffling',
      spreadResult: fortune.spread,
      hexagram: fortune.hexagram,
      wuxingAnalysis: fortune.wuxingAnalysis,
      topicGanZhi: fortune.ganZhi,
      topicFortune: fortune,
      pickIndex: 0, shuffleCount: 0,
      tableCards: makeTableCards(seed, tableCount),
    });
    var self = this;
    setTimeout(function() { self.setData({ phase: 'table' }); }, 1500);
  },

  reshuffleTable() {
    if (this.data.pickIndex > 0) return;
    var count = this.data.shuffleCount + 1;
    var tableCount = Math.max(9, (this.data.selectedSpread || { cardCount: 1 }).cardCount + 8);
    this.setData({
      shuffleCount: count,
      tableCards: makeTableCards(Date.now() + count * 131, tableCount),
    });
  },

  pickFromTable(e) {
    if (this.data.phase !== 'table') return;
    var tid = e.currentTarget.dataset.tid;
    var tableCards = this.data.tableCards;
    var idx = -1;
    for (var i = 0; i < tableCards.length; i++) {
      if (tableCards[i].id === tid) { idx = i; break; }
    }
    if (idx === -1 || tableCards[idx].removed) return;

    var pickIndex = this.data.pickIndex;
    var spread = this.data.selectedSpread;
    if (pickIndex >= spread.cardCount) return;

    var key = 'tableCards[' + idx + '].removed';
    var updates = {};
    updates[key] = true;
    updates.pickIndex = pickIndex + 1;
    this.setData(updates);

    var self = this;
    var nextPick = pickIndex + 1;
    if (nextPick >= spread.cardCount) {
      setTimeout(function() {
        var u = { phase: 'revealed' };
        if (self.data.selectedTopic && self.data.topicFortune) {
          u.briefReading = tarot.generateBriefReading(self.data.topicFortune, self.data.selectedTopic.name);
        }
        self.setData(u);
      }, 400);
    } else {
      var remaining = 0;
      for (var j = 0; j < tableCards.length; j++) {
        if (!tableCards[j].removed && tableCards[j].id !== tid) remaining++;
      }
      if (remaining < 2) {
        var nc = self.data.shuffleCount + 1;
        var tc = Math.max(9, (self.data.selectedSpread || { cardCount: 1 }).cardCount + 8);
        self.setData({
          shuffleCount: nc,
          tableCards: makeTableCards(Date.now() + nc * 131, tc),
        });
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

  toggleReading() {
    this.setData({ showReading: !this.data.showReading });
  },

  fetchReading() {
    var data = this.data;
    this.setData({ showReading: true, isLoading: true });
    collection.recordReading();

    var cardsSummary = data.spreadResult.cards.map(function(c) {
      var state = c.isReversed ? '逆位' : '正位';
      return '位置「' + c.position.name + '」(' + c.position.description + ')：赛博·' + c.card.name + '（' + c.card.cyberName + '）— ' + state + ' — 牌义：' + (c.isReversed ? c.card.reversed : c.card.upright);
    }).join('\n');

    var mode = data.selectedTopic ? 'topic' : 'spread';
    var params = { mode: mode, spreadName: data.selectedSpread.name, cards: cardsSummary };

    if (data.selectedTopic) {
      params.topicId = data.selectedTopic.id;
      params.topicName = data.selectedTopic.name;
      if (data.topicQuestion.trim()) params.question = data.topicQuestion.trim();
    }
    if (data.hexagram) {
      params.hexagramName = data.hexagram.name;
      params.hexagramSymbol = data.hexagram.symbol;
      params.hexagramNature = data.hexagram.nature;
      params.hexagramKeywords = data.hexagram.keywords;
      params.hexagramUpper = data.hexagram.upper;
      params.hexagramLower = data.hexagram.lower;
    }
    if (data.wuxingAnalysis) params.wuxingAnalysis = data.wuxingAnalysis;
    if (data.topicGanZhi) {
      params.ganZhi = data.topicGanZhi.gan + data.topicGanZhi.zhi + '日';
      params.wuxing = data.topicGanZhi.wuxing;
      params.wuxingElement = data.topicGanZhi.wuxingElement;
    }

    var self = this;
    api.streamReading(params).then(function(text) {
      self.setData({ reading: text, isLoading: false });
    }).catch(function() {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  backFromResult() {
    var topic = this.data.selectedTopic;
    if (topic && topic.requiresQuestion) {
      this.setData({
        view: 'topicQuestion', phase: 'select',
        reading: '', showReading: false,
        spreadResult: null, pickIndex: 0, tableCards: [],
        briefReading: '',
      });
      return;
    }
    this.reset();
  },

  previewTip() {
    wx.previewImage({ current: '/images/tip-qrcode.jpg', urls: ['/images/tip-qrcode.jpg'] });
  },

  reset() {
    this.setData({
      view: 'menu', phase: 'select',
      selectedSpread: null, selectedTopic: null,
      spreadResult: null, pickIndex: 0, tableCards: [], shuffleCount: 0,
      hexagram: null, wuxingAnalysis: '', topicGanZhi: null,
      topicFortune: null, briefReading: '',
      reading: '', showReading: false, topicQuestion: '',
    });
  },

  onShareAppMessage() {
    var topic = this.data.selectedTopic;
    var result = this.data.spreadResult;
    var title = '赛博神算子 · 主题解读';
    if (topic && result && result.cards.length > 0) {
      title = topic.name + ' · 赛博·' + result.cards[0].card.name;
    } else if (result && result.cards.length > 0) {
      title = '赛博神算子 · 赛博·' + result.cards[0].card.name;
    }
    return { title: title, path: '/pages/draw/draw' };
  },

  onShareTimeline() {
    var topic = this.data.selectedTopic;
    var result = this.data.spreadResult;
    var title = '赛博神算子 · 主题解读';
    if (topic && result && result.cards.length > 0) {
      title = topic.name + ' · 赛博·' + result.cards[0].card.name;
    }
    return { title: title };
  },
});

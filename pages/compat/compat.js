const tarot = require('../../utils/tarot');
const api = require('../../utils/api');
const collection = require('../../utils/collection');

Page({
  data: {
    phase: 'topic',
    topics: [
      { id:'love', icon:'💘', name:'感情合盘', desc:'两个人之间的化学反应' },
      { id:'friend', icon:'🤝', name:'友谊合盘', desc:'你和TA的灵魂契合度' },
      { id:'work', icon:'💼', name:'事业合盘', desc:'你们适合一起共事吗' },
    ],
    topic: null,
    aResult: null, aRevealed: false,
    bResult: null, bRevealed: false,
    shareCode: '',
    codeInput: '',
    reading: '', isLoading: false,
    // 分享卡片
    showShareCard: false,
    shareCardLoading: false,
    shareCardPath: '',
  },

  onLoad(options) {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    // 页面被内存回收后重建，尝试还原上次状态
    var saved = getApp().globalData.compatPageState;
    if (saved && saved.phase && saved.phase !== 'topic') {
      this.setData(saved);
    }
    const code = (options && options.code) ? String(options.code).toUpperCase() : '';
    if (!code) return;
    this.setData({ shareCode: code, phase: 'b-draw' });
    // Fetch session: prefill A card & topic
    api.requestJson(`/api/compat/session/${code}`, 'GET').then(s => {
      const t = this.data.topics.find(x => x.id === s.topicId) || this.data.topics[0];
      const card = tarot.MAJOR_ARCANA[(s.a.cardId || 0) % 22];
      this.setData({
        topic: { ...t, name: s.topicName || t.name },
        aResult: { cards: [{ card, isReversed: !!s.a.isReversed, position: tarot.SPREAD_TYPES[0].positions[0] }] },
        aRevealed: true,
      });
    }).catch(() => {
      wx.showToast({ title: '口令已过期', icon: 'none' });
      this.setData({ phase: 'topic', shareCode: '' });
    });
  },

  onHide() {
    if (this.data.phase !== 'topic') {
      getApp().globalData.compatPageState = {
        phase: this.data.phase,
        topic: this.data.topic,
        aResult: this.data.aResult,
        aRevealed: this.data.aRevealed,
        bResult: this.data.bResult,
        bRevealed: this.data.bRevealed,
        shareCode: this.data.shareCode,
        reading: this.data.reading,
        isLoading: false,
      };
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    var saved = getApp().globalData.compatPageState;
    if (saved && saved.phase && saved.phase !== 'topic' && this.data.phase === 'topic') {
      this.setData(saved);
    }
  },

  goCodeInput() {
    this.setData({ phase: 'code-input', codeInput: '' });
  },

  onCodeInput(e) {
    this.setData({ codeInput: e.detail.value.toUpperCase() });
  },

  submitCode() {
    var code = this.data.codeInput.trim().toUpperCase();
    if (code.length < 3) return;

    if (code === 'DEMO') {
      var t = this.data.topics[0];
      var aCard = tarot.MAJOR_ARCANA[6];
      var bCard = tarot.MAJOR_ARCANA[11];
      this.setData({
        topic: t, shareCode: 'DEMO',
        aResult: { cards: [{ card: aCard, isReversed: false, position: tarot.SPREAD_TYPES[0].positions[0] }] },
        aRevealed: true,
        bResult: { cards: [{ card: bCard, isReversed: true, position: tarot.SPREAD_TYPES[0].positions[0] }] },
        bRevealed: true,
        phase: 'b-done',
      });
      return;
    }

    this.setData({ shareCode: code, phase: 'b-draw' });
    var self = this;
    api.requestJson('/api/compat/session/' + code, 'GET').then(function(s) {
      var t = self.data.topics.find(function(x) { return x.id === s.topicId; }) || self.data.topics[0];
      var card = tarot.MAJOR_ARCANA[(s.a.cardId || 0) % 22];
      self.setData({
        topic: { id: t.id, icon: t.icon, name: s.topicName || t.name, desc: t.desc },
        aResult: { cards: [{ card: card, isReversed: !!s.a.isReversed, position: tarot.SPREAD_TYPES[0].positions[0] }] },
        aRevealed: true,
      });
    }).catch(function() {
      wx.showToast({ title: '口令无效或已过期', icon: 'none' });
      self.setData({ phase: 'topic', shareCode: '', codeInput: '' });
    });
  },

  backFromCode() {
    this.setData({ phase: 'topic', codeInput: '' });
  },

  selectTopic(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ topic: this.data.topics[idx], phase: 'a-draw' });
  },

  drawA() {
    const spread = tarot.SPREAD_TYPES[0];
    const result = tarot.drawSpread(spread, Date.now());
    collection.recordCardSeen(result.cards[0].card.id);
    this.setData({ aResult: result });
  },

  revealA() {
    this.setData({ aRevealed: true });
    setTimeout(() => this.setData({ phase: 'a-done' }), 600);
    // Create 24h session for partner
    const { topic, aResult } = this.data;
    if (!topic || !aResult) return;
    const card = aResult.cards[0];
    api.requestJson('/api/compat/session', 'POST', {
      topicId: topic.id,
      topicName: topic.name,
      aCardId: card.card.id,
      aIsReversed: !!card.isReversed,
    }).then(r => {
      this.setData({ shareCode: String(r.code || '').toUpperCase() });
    }).catch(() => {});
  },

  goToBDraw() { this.setData({ phase: 'b-draw' }); },

  drawB() {
    const spread = tarot.SPREAD_TYPES[0];
    const result = tarot.drawSpread(spread, Date.now() + 9999);
    collection.recordCardSeen(result.cards[0].card.id);
    this.setData({ bResult: result });
  },

  revealB() {
    this.setData({ bRevealed: true });
    setTimeout(() => this.setData({ phase: 'b-done' }), 600);
    const { shareCode, bResult } = this.data;
    if (!shareCode || !bResult) return;
    const card = bResult.cards[0];
    api.requestJson(`/api/compat/session/${shareCode}`, 'POST', { bCardId: card.card.id, bIsReversed: !!card.isReversed })
      .catch(() => {});
  },

  copyCode() {
    wx.setClipboardData({ data: this.data.shareCode });
  },

  copyLink() {
    var code = this.data.shareCode;
    if (!code) return;
    wx.setClipboardData({ data: 'https://cyber.vinex.top/?mode=compat&code=' + code });
  },

  requestReading() {
    this.setData({ phase: 'result' });
    this.fetchReading();
  },

  fetchReading() {
    var self = this;
    var data = this.data;
    this.setData({ isLoading: true });
    collection.recordReading();
    var aCard = data.aResult.cards[0];
    var bCard = data.bResult.cards[0];
    api.streamReading({
      mode: 'compatibility',
      topicName: data.topic.name,
      personA: '赛博·' + aCard.card.name + '（' + aCard.card.cyberName + '）' + (aCard.isReversed ? '逆位' : '正位') + ' — ' + (aCard.isReversed ? aCard.card.reversed : aCard.card.upright),
      personB: '赛博·' + bCard.card.name + '（' + bCard.card.cyberName + '）' + (bCard.isReversed ? '逆位' : '正位') + ' — ' + (bCard.isReversed ? bCard.card.reversed : bCard.card.upright),
    }).then(function(text) {
      self.setData({ reading: text, isLoading: false });
    }).catch(function(e) {
      self.setData({ reading: '⚠️ ' + (e.message || '信号中断'), isLoading: false });
    });
  },

  previewTip() {
    const url = '/images/tip-qrcode.jpg';
    wx.previewImage({ current: url, urls: [url] });
  },

  reset() {
    this.setData({
      phase: 'topic', topic: null,
      aResult: null, aRevealed: false,
      bResult: null, bRevealed: false,
      shareCode: '', codeInput: '', reading: '', isLoading: false,
      showShareCard: false,
    });
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
    var data = this.data;
    var aCard = data.aResult && data.aResult.cards[0];
    var bCard = data.bResult && data.bResult.cards[0];
    return {
      cardId: aCard ? aCard.card.id : 0,
      cardName: aCard ? aCard.card.name : '塔罗',
      cyberName: aCard ? (aCard.card.cyberName || aCard.card.name) : '塔罗',
      isReversed: aCard ? aCard.isReversed : false,
      secondaryCardId: bCard ? bCard.card.id : 0,
      secondaryCardName: bCard ? bCard.card.name : '塔罗',
      secondaryReversed: bCard ? bCard.isReversed : false,
      fortune: data.reading || '',
      label: data.topic ? data.topic.name : '合盘',
      mode: 'compat',
      modeLabel: data.topic ? data.topic.name : '合盘',
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
    var code = this.data.shareCode;
    var path = code ? '/pages/compat/compat?code=' + code : '/pages/compat/compat';
    return { title: '赛博神算子 · 来和我合盘', path: path };
  },

  onShareTimeline() {
    return { title: '赛博神算子 · 来和我合盘' };
  },
});

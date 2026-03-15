const collection = require('../../utils/collection');

const TOKEN_KEY = 'co_jwt_token';
const OPENID_KEY = 'co_openid';
const BIRTH_KEY = 'co_birth_profile_v1';

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

function getBirth() {
  try { return wx.getStorageSync(BIRTH_KEY) || {}; } catch { return {}; }
}
function saveBirth(b) {
  try { wx.setStorageSync(BIRTH_KEY, b || {}); } catch {}
}

Page({
  data: {
    openid: '',
    isLoggedIn: false,
    credits: 0,
    totalReadings: 0,
    seenCards: 0,
    checkinStreak: 0,
    checkinDays: 0,
    memberLevel: '免费版',
    // 生辰档案（展示）
    birthDate: '',
    birthTime: '',
    birthHasFilled: false,
    // 生辰编辑弹窗
    showBirth: false,
    editBirth: { birthDate: '', birthTime: '' },
    shichenOptions: SHICHEN_OPTIONS,
    shichenIdx: 0,
    // 退出确认
    showLogoutConfirm: false,
  },

  onLoad() {
    this._loadProfile();
  },

  onShow() {
    this._loadProfile();
  },

  _loadProfile() {
    var token = wx.getStorageSync(TOKEN_KEY);
    var openid = wx.getStorageSync(OPENID_KEY);
    var coll = collection.getCollection();
    var credits = collection.getCredits();
    var birth = getBirth();
    var shichenIdx = 0;
    if (birth.birthTime) {
      var idx = SHICHEN_OPTIONS.findIndex(function(o) { return o.value === birth.birthTime; });
      if (idx >= 0) shichenIdx = idx;
    }

    this.setData({
      isLoggedIn: !!token,
      openid: openid ? openid.slice(0, 8) + '****' : '微信账号自动连接',
      credits: credits.credits || 0,
      totalReadings: coll.totalReadings || 0,
      seenCards: (coll.seenCards || []).length,
      checkinStreak: coll.checkinStreak || 0,
      checkinDays: (coll.checkinDays || []).length,
      birthDate: birth.birthDate || '',
      birthTime: birth.birthTime || '',
      birthHasFilled: !!(birth.birthDate || birth.birthTime),
      editBirth: { birthDate: birth.birthDate || '', birthTime: birth.birthTime || '' },
      shichenIdx: shichenIdx,
      memberLevel: '免费版',
    });
  },

  // ── 生辰档案 ────────────────────────────
  openBirthEdit() {
    this.setData({ showBirth: true });
  },

  closeBirth() {
    this.setData({ showBirth: false });
  },

  onBirthDateInput(e) {
    this.setData({ 'editBirth.birthDate': e.detail.value });
  },

  onShichenChange(e) {
    var idx = parseInt(e.detail.value, 10);
    var opt = SHICHEN_OPTIONS[idx] || SHICHEN_OPTIONS[0];
    this.setData({ shichenIdx: idx, 'editBirth.birthTime': opt.value });
  },

  saveBirthProfile() {
    var b = this.data.editBirth;
    saveBirth({ birthDate: (b.birthDate || '').trim(), birthTime: (b.birthTime || '').trim() });
    this.setData({
      showBirth: false,
      birthDate: (b.birthDate || '').trim(),
      birthTime: (b.birthTime || '').trim(),
      birthHasFilled: !!(b.birthDate || b.birthTime),
    });
    wx.showToast({ title: '生辰档案已保存', icon: 'success' });
    // 同步到云端
    collection.apiCall('birth-set', { birthDate: b.birthDate, birthTime: b.birthTime });
  },

  clearBirthProfile() {
    saveBirth({});
    this.setData({
      showBirth: false,
      birthDate: '',
      birthTime: '',
      birthHasFilled: false,
      editBirth: { birthDate: '', birthTime: '' },
      shichenIdx: 0,
    });
    wx.showToast({ title: '已清空', icon: 'none' });
    collection.apiCall('birth-set', { birthDate: '', birthTime: '' });
  },

  // ── 会员 ─────────────────────────────────
  showSubscribeTip() {
    wx.showModal({
      title: '会员订阅（即将上线）',
      content: '订阅后可解锁：\n\n· 无限次深度解读\n· 专属命格分析报告\n· 每月运势预测\n· 优先体验新功能',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ── 退出 ─────────────────────────────────
  showLogoutConfirm() {
    this.setData({ showLogoutConfirm: true });
  },

  cancelLogout() {
    this.setData({ showLogoutConfirm: false });
  },

  confirmLogout() {
    wx.clearStorageSync();
    this.setData({ showLogoutConfirm: false });
    wx.showToast({ title: '已退出登录', icon: 'none' });
    setTimeout(function() {
      wx.reLaunch({ url: '/pages/daily/daily' });
    }, 1200);
  },

  noop() {},
});

const collection = require('../../utils/collection');

const TOKEN_KEY = 'co_jwt_token';
const OPENID_KEY = 'co_openid';
const BIRTH_KEY = 'co_birth_profile_v1';

Page({
  data: {
    openid: '',
    isLoggedIn: false,
    credits: 0,
    totalReadings: 0,
    seenCards: 0,
    checkinStreak: 0,
    checkinDays: 0,
    birthDate: '',
    birthTime: '',
    memberLevel: '免费版',
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
    var birth = {};
    try { birth = wx.getStorageSync(BIRTH_KEY) || {}; } catch {}

    this.setData({
      isLoggedIn: !!token,
      openid: openid ? openid.slice(0, 8) + '****' : '未登录',
      credits: credits.credits || 0,
      totalReadings: coll.totalReadings || 0,
      seenCards: (coll.seenCards || []).length,
      checkinStreak: coll.checkinStreak || 0,
      checkinDays: (coll.checkinDays || []).length,
      birthDate: birth.birthDate || '',
      birthTime: birth.birthTime || '',
      memberLevel: '免费版', // 后续接入订阅后更新
    });
  },

  goEditBirth() {
    // 跳转到每日签页面的生辰档案
    wx.switchTab({ url: '/pages/daily/daily' });
    wx.showToast({ title: '请在每日签页点击「生辰档案」', icon: 'none', duration: 2500 });
  },

  showSubscribeTip() {
    wx.showModal({
      title: '会员订阅（即将上线）',
      content: '会员功能正在开发中，订阅后可解锁：\n\n· 无限次深度解读\n· 专属命格分析报告\n· 每月运势预测\n· 优先体验新功能\n\n敬请期待！',
      showCancel: false,
      confirmText: '知道了',
    });
  },

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
    // 重新启动登录流程
    setTimeout(function() {
      wx.reLaunch({ url: '/pages/daily/daily' });
    }, 1200);
  },

  goBack() {
    wx.navigateBack();
  },

  noop() {},
});

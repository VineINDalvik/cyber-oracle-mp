const api = require('../../utils/api');
const collection = require('../../utils/collection');

const TOKEN_KEY = 'co_jwt_token';
const OPENID_KEY = 'co_openid';

Page({
  data: {
    loading: false,
    error: '',
  },

  onLoad() {
    // 如果已有 token，直接跳走
    var token = wx.getStorageSync(TOKEN_KEY);
    if (token) {
      this._goHome();
      return;
    }
    // 尝试静默登录
    this._silentLogin();
  },

  _silentLogin() {
    var self = this;
    self.setData({ loading: true, error: '' });
    wx.login({
      success: function(res) {
        if (!res.code) {
          self.setData({ loading: false, error: '获取登录凭证失败，请重试' });
          return;
        }
        api.wxLogin(res.code, collection.getDeviceId()).then(function(result) {
          if (result && result.token) {
            wx.setStorageSync(TOKEN_KEY, result.token);
            wx.setStorageSync(OPENID_KEY, result.openid || '');
            self._goHome();
          } else {
            self.setData({ loading: false, error: '登录失败，请重试' });
          }
        }).catch(function(e) {
          self.setData({ loading: false, error: e.message || '网络异常，请重试' });
        });
      },
      fail: function() {
        self.setData({ loading: false, error: '微信登录被拒绝，请检查权限' });
      },
    });
  },

  retry() {
    this._silentLogin();
  },

  _goHome() {
    wx.switchTab({ url: '/pages/daily/daily' });
  },
});

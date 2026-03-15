const TOKEN_KEY = 'co_jwt_token';

App({
  globalData: {
    apiBase: 'https://cyber.vinex.top',
    isLoggedIn: false,
    // 各 Tab 页面在切换时的快照，防止内存回收后状态丢失
    drawPageState: null,
    dailyPageState: null,
    compatPageState: null,
    dreamPageState: null,
  },

  onLaunch() {
    var self = this;
    var token = wx.getStorageSync(TOKEN_KEY);
    if (token) {
      self.globalData.isLoggedIn = true;
      return;
    }
    // 无 token，静默登录
    self._doWxLogin();
  },

  _doWxLogin() {
    var self = this;
    wx.login({
      success: function(res) {
        if (!res.code) return;
        var collection = require('./utils/collection');
        var deviceId = collection.getDeviceId();
        wx.request({
          url: self.globalData.apiBase + '/api/auth/wechat-login',
          method: 'POST',
          data: { code: res.code, deviceId: deviceId },
          header: { 'Content-Type': 'application/json' },
          success: function(r) {
            if (r.statusCode === 200 && r.data && r.data.token) {
              wx.setStorageSync(TOKEN_KEY, r.data.token);
              if (r.data.openid) wx.setStorageSync('co_openid', r.data.openid);
              self.globalData.isLoggedIn = true;
            }
          },
        });
      },
    });
  },
});

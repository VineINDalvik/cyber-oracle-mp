const TOKEN_KEY = 'co_jwt_token';
const OPENID_KEY = 'co_openid';

App({
  globalData: {
    apiBase: 'https://cyber.vinex.top',
    isLoggedIn: false,
    // 各 Tab 页面在切换时的快照，防止内存回收后状态丢失
    drawPageState: null,
    dailyPageState: null,
    compatPageState: null,
    dreamPageState: null,
    // 扫码登录场景
    qrcodeLoginScene: null,
  },

  onLaunch(options) {
    var self = this;
    var token = wx.getStorageSync(TOKEN_KEY);
    if (token) {
      self.globalData.isLoggedIn = true;
      // 检查是否是扫码登录场景
      self._checkQrcodeLogin(options);
      return;
    }
    // 无 token，静默登录
    self._doWxLogin(function() {
      self._checkQrcodeLogin(options);
    });
  },

  onShow(options) {
    // 每次显示时检查扫码登录
    this._checkQrcodeLogin(options);
  },

  // 检查是否是扫码登录场景
  _checkQrcodeLogin(options) {
    var self = this;
    if (!options || !options.scene) return;

    try {
      // 解码 scene 参数
      var scene = decodeURIComponent(options.scene);
      console.log('[app] scene:', scene);

      // 检查是否是登录二维码场景 (格式: login_xxx)
      if (scene.indexOf('login_') === 0) {
        self.globalData.qrcodeLoginScene = scene;
        // 显示确认登录提示
        self._showQrcodeLoginConfirm(scene);
      }
    } catch (e) {
      console.error('[app] parse scene error:', e);
    }
  },

  // 显示扫码登录确认
  _showQrcodeLoginConfirm(scene) {
    var self = this;
    var openid = wx.getStorageSync(OPENID_KEY);
    if (!openid) return;

    wx.showModal({
      title: '确认登录',
      content: '是否在网页端登录「赛博神算子」？',
      confirmText: '确认登录',
      cancelText: '取消',
      success: function(res) {
        if (res.confirm) {
          self._confirmQrcodeLogin(scene, openid);
        }
      },
    });
  },

  // 确认扫码登录
  _confirmQrcodeLogin(scene, openid) {
    var api = require('./utils/api');
    api.confirmQrcodeLogin(scene, openid)
      .then(function() {
        wx.showToast({ title: '登录成功', icon: 'success' });
      })
      .catch(function(e) {
        wx.showToast({ title: e.message || '确认失败', icon: 'none' });
      });
  },

  _doWxLogin(callback) {
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
              if (r.data.openid) wx.setStorageSync(OPENID_KEY, r.data.openid);
              self.globalData.isLoggedIn = true;
              if (callback) callback();
            }
          },
        });
      },
    });
  },
});

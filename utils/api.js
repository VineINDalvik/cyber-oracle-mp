const app = getApp();

function getApiBase() {
  return app.globalData.apiBase;
}

function streamReading(params) {
  return new Promise(function(resolve, reject) {
    var url = getApiBase() + '/api/divine';
    console.log('[divine] POST', url);
    wx.request({
      url: url,
      method: 'POST',
      data: params,
      dataType: '其他',
      responseType: 'text',
      timeout: 60000,
      header: { 'Content-Type': 'application/json' },
      success: function(res) {
        console.log('[divine] status', res.statusCode, typeof res.data);
        if (res.statusCode === 200 && res.data) {
          resolve(typeof res.data === 'object' ? JSON.stringify(res.data) : String(res.data));
        } else {
          var msg = 'HTTP ' + res.statusCode + ': ' + (typeof res.data === 'string' ? res.data.substring(0, 100) : JSON.stringify(res.data).substring(0, 100));
          console.error('[divine]', msg);
          reject(new Error(msg));
        }
      },
      fail: function(err) {
        var msg = err.errMsg || JSON.stringify(err);
        console.error('[divine] fail', msg);
        reject(new Error(msg));
      },
    });
  });
}

function getCardImageUrl(cardId) {
  const paddedId = String(cardId).padStart(2, '0');
  return `${getApiBase()}/cards/${paddedId}.jpg`;
}

function requestJson(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApiBase()}${path}`,
      method: method || 'GET',
      data,
      header: { 'Content-Type': 'application/json' },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error((res.data && res.data.error) ? res.data.error : `HTTP ${res.statusCode}`));
      },
      fail(err) { reject(err); },
    });
  });
}

/**
 * 调服务端 /api/share-card 生成分享图 PNG，写入临时文件并返回 tempFilePath
 * 供 wx.saveImageToPhotosAlbum 或 wx.shareAppMessage.imageUrl 使用
 */
function generateShareCard(params) {
  return new Promise(function(resolve, reject) {
    wx.request({
      url: getApiBase() + '/api/share-card',
      method: 'POST',
      data: params,
      dataType: '其他',
      responseType: 'arraybuffer',
      timeout: 30000,
      header: { 'Content-Type': 'application/json' },
      success: function(res) {
        if (res.statusCode === 200 && res.data) {
          var tmpPath = wx.env.USER_DATA_PATH + '/co-share-' + Date.now() + '.png';
          wx.getFileSystemManager().writeFile({
            filePath: tmpPath,
            data: res.data,
            encoding: 'binary',
            success: function() { resolve(tmpPath); },
            fail: function(e) { reject(new Error(e.errMsg || 'writeFile fail')); },
          });
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: function(e) { reject(new Error(e.errMsg || 'request fail')); },
    });
  });
}

module.exports = { streamReading, getCardImageUrl, requestJson, generateShareCard };

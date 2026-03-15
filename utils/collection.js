const app = getApp();

// ─── Device ID ──────────────────────────────────────────────────
const DEVICE_ID_KEY = 'cyber-oracle-device-id';
const LEGACY_DEVICE_ID_KEY = 'co_device_id';

function generateDeviceId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'co_mp_';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function getDeviceId() {
  let id = wx.getStorageSync(DEVICE_ID_KEY) || wx.getStorageSync(LEGACY_DEVICE_ID_KEY);
  if (id) {
    // migrate legacy key for consistency
    try { wx.setStorageSync(DEVICE_ID_KEY, id); } catch {}
    return id;
  }
  id = generateDeviceId();
  try {
    wx.setStorageSync(DEVICE_ID_KEY, id);
    wx.setStorageSync(LEGACY_DEVICE_ID_KEY, id);
  } catch {}
  return id;
}

// ─── Local Cache ────────────────────────────────────────────────
const STORAGE_KEY = 'cyber-oracle-collection';
const CREDITS_KEY = 'cyber-oracle-credits';

function defaultCollection() {
  return { seenCards: [], checkinDays: [], checkinStreak: 0, totalReadings: 0 };
}

function getCollection() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || defaultCollection();
  } catch (e) {
    return defaultCollection();
  }
}

function saveCollection(data) {
  wx.setStorageSync(STORAGE_KEY, data);
}

function defaultCredits() {
  return { credits: 3, freeReadingsUsed: 0 };
}

function getCredits() {
  try {
    const c = wx.getStorageSync(CREDITS_KEY);
    return (c === '' || c === undefined) ? defaultCredits() : c;
  } catch (e) {
    return defaultCredits();
  }
}

function saveCredits(data) {
  wx.setStorageSync(CREDITS_KEY, data);
}

// ─── API Helper ─────────────────────────────────────────────────

function apiCall(action, extra) {
  return new Promise(function(resolve) {
    wx.request({
      url: app.globalData.apiBase + '/api/user',
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'x-user-id': getDeviceId(),
      },
      data: Object.assign({ action: action }, extra || {}),
      success: function(res) {
        if (res.statusCode === 200) resolve(res.data);
        else resolve(null);
      },
      fail: function() { resolve(null); },
    });
  });
}

function apiFetch() {
  return new Promise(function(resolve) {
    wx.request({
      url: app.globalData.apiBase + '/api/user',
      method: 'GET',
      header: { 'x-user-id': getDeviceId() },
      success: function(res) {
        if (res.statusCode === 200) resolve(res.data);
        else resolve(null);
      },
      fail: function() { resolve(null); },
    });
  });
}

// ─── Sync ───────────────────────────────────────────────────────

let synced = false;

function syncToServer() {
  if (synced) return Promise.resolve();
  synced = true;

  const local = getCollection();
  const credits = getCredits();

  return apiCall('sync', {
    data: {
      seenCards: local.seenCards,
      credits: credits.credits,
      totalReadings: local.totalReadings,
      freeReadingsUsed: credits.freeReadingsUsed || 0,
    },
  }).then(function(result) {
    if (result) {
      saveCollection({
        seenCards: result.seenCards || local.seenCards,
        checkinDays: result.checkinDays || local.checkinDays,
        checkinStreak: result.checkinStreak || local.checkinStreak,
        totalReadings: result.totalReadings || local.totalReadings,
      });
      saveCredits({
        credits: result.credits !== undefined ? result.credits : credits.credits,
        freeReadingsUsed: result.freeReadingsUsed || credits.freeReadingsUsed,
      });
    }
  });
}

// ─── Public API (server-first, local fallback) ──────────────────

function recordCardSeen(cardId) {
  const data = getCollection();
  if (!data.seenCards.includes(cardId)) data.seenCards.push(cardId);
  saveCollection(data);
  apiCall('card-seen', { cardId: cardId });
  return data;
}

function recordReading() {
  const data = getCollection();
  data.totalReadings += 1;
  saveCollection(data);
  apiCall('reading');
  return data;
}

function dailyCheckin(dateStr) {
  const local = getCollection();

  if (local.checkinDays.includes(dateStr)) {
    return Promise.resolve({ data: local, isNew: false, streakReward: false });
  }

  return apiCall('checkin', { date: dateStr }).then(function(result) {
    if (result) {
      var serverData = result.data || {};
      var updated = {
        seenCards: serverData.seenCards || local.seenCards,
        checkinDays: serverData.checkinDays || local.checkinDays,
        checkinStreak: serverData.checkinStreak || local.checkinStreak,
        totalReadings: serverData.totalReadings || local.totalReadings,
      };
      saveCollection(updated);
      if (serverData.credits !== undefined) {
        saveCredits({
          credits: serverData.credits,
          freeReadingsUsed: serverData.freeReadingsUsed || 0,
        });
      }
      return { data: updated, isNew: result.isNew, streakReward: result.streakReward };
    }

    // Fallback
    local.checkinDays.push(dateStr);
    var yesterday = new Date(dateStr);
    yesterday.setDate(yesterday.getDate() - 1);
    var yStr = yesterday.toISOString().slice(0, 10);
    local.checkinStreak = local.checkinDays.includes(yStr) ? local.checkinStreak + 1 : 1;
    var streakReward = local.checkinStreak > 0 && local.checkinStreak % 7 === 0;
    saveCollection(local);
    return { data: local, isNew: true, streakReward: streakReward };
  });
}

function useCredit() {
  var local = getCredits();

  return apiCall('use-credit').then(function(result) {
    if (result) {
      local.credits = result.remaining;
      local.freeReadingsUsed = (local.freeReadingsUsed || 0) + 1;
      saveCredits(local);
      return { success: result.success, remaining: result.remaining };
    }
    // Fallback
    if (local.credits <= 0) return { success: false, remaining: 0 };
    local.credits -= 1;
    local.freeReadingsUsed = (local.freeReadingsUsed || 0) + 1;
    saveCredits(local);
    return { success: true, remaining: local.credits };
  });
}

function addCredits(amount) {
  var local = getCredits();

  return apiCall('add-credits', { amount: amount }).then(function(result) {
    if (result) {
      local.credits = result.credits;
      saveCredits(local);
      return local;
    }
    local.credits += amount;
    saveCredits(local);
    return local;
  });
}

module.exports = {
  getDeviceId, syncToServer,
  getCollection, recordCardSeen, recordReading,
  getCredits, useCredit, addCredits, dailyCheckin,
  apiCall, apiFetch,
};

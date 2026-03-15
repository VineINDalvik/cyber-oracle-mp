App({
  globalData: {
    apiBase: 'https://cyber.vinex.top',
    // 各 Tab 页面在切换时的快照，防止内存回收后状态丢失
    drawPageState: null,
    dailyPageState: null,
    compatPageState: null,
    dreamPageState: null,
  },

  onLaunch() {
    // MVP: 不使用 credits/付费体系
  },
});

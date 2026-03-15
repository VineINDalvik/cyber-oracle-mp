Component({
  data: {
    selected: 0,
    tabs: [
      { pagePath: '/pages/daily/daily', text: '每日签', icon: '📅' },
      { pagePath: '/pages/draw/draw', text: '牌阵', icon: '🃏' },
      { pagePath: '/pages/compat/compat', text: '合盘', icon: '💞' },
      { pagePath: '/pages/dream/dream', text: '解梦', icon: '🌙' },
    ],
  },
  methods: {
    switchTab(e) {
      const idx = e.currentTarget.dataset.index;
      const path = this.data.tabs[idx].pagePath;
      wx.switchTab({ url: path });
      this.setData({ selected: idx });
    },
  },
});

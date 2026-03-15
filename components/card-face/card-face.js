const api = require('../../utils/api');

Component({
  properties: {
    cardId: { type: Number, value: 0 },
    reversed: { type: Boolean, value: false },
    size: { type: String, value: 'md' },
    showBack: { type: Boolean, value: false },
  },
  data: {
    imageUrl: '',
    cardName: '',
    cyberName: '',
    dims: { w: 280, h: 468 },
  },
  observers: {
    'cardId, size': function (cardId, size) {
      const NAMES = {
        0:'愚者',1:'魔术师',2:'女祭司',3:'女皇',4:'皇帝',5:'教皇',
        6:'恋人',7:'战车',8:'力量',9:'隐者',10:'命运之轮',11:'正义',
        12:'倒吊人',13:'死神',14:'节制',15:'恶魔',16:'高塔',17:'星辰',
        18:'月亮',19:'太阳',20:'审判',21:'世界',
      };
      const CYBER = {
        0:'数据漫游者',1:'代码织者',2:'暗网先知',3:'矩阵之母',4:'防火墙主宰',
        5:'协议守护者',6:'量子纠缠',7:'光速飞驰',8:'算力觉醒',9:'离线修行者',
        10:'随机数生成器',11:'智能合约',12:'系统挂起',13:'格式化',14:'负载均衡',
        15:'病毒入侵',16:'系统崩溃',17:'卫星信号',18:'暗物质',19:'核聚变',
        20:'终极审计',21:'全球网络',
      };
      const SIZES = { sm: {w:160,h:267}, md: {w:280,h:468}, lg: {w:380,h:634} };
      this.setData({
        imageUrl: api.getCardImageUrl(cardId),
        cardName: NAMES[cardId] || '',
        cyberName: CYBER[cardId] || '',
        dims: SIZES[size] || SIZES.md,
      });
    },
  },
});

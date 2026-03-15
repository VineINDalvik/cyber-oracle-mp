// Ported from src/lib/tarot.ts — vanilla JS for WeChat Mini Program

const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const DI_ZHI_ANIMAL = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

const GAN_WUXING = {
  '甲':{name:'阳木',element:'木'},'乙':{name:'阴木',element:'木'},
  '丙':{name:'阳火',element:'火'},'丁':{name:'阴火',element:'火'},
  '戊':{name:'阳土',element:'土'},'己':{name:'阴土',element:'土'},
  '庚':{name:'阳金',element:'金'},'辛':{name:'阴金',element:'金'},
  '壬':{name:'阳水',element:'水'},'癸':{name:'阴水',element:'水'},
};

const WUXING_INFO = {
  '木':{direction:'东',color:'绿'},'火':{direction:'南',color:'红'},
  '土':{direction:'中',color:'黄'},'金':{direction:'西',color:'白'},
  '水':{direction:'北',color:'黑'},
};

const WUXING_TO_TAROT = { '木':'风','火':'火','土':'土','金':'风','水':'水' };

class SeededRandom {
  constructor(seed) { this.seed = (seed & 0x7fffffff) || 1; }
  next() {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  nextInt(max) { return Math.floor(this.next() * max); }
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & 0x7fffffff;
  }
  return h;
}

function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function getDayGanZhi(date) {
  const d = date || new Date();
  const jd = julianDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const jdInt = Math.floor(jd + 0.5);
  const ganIndex = (jdInt + 9) % 10;
  const zhiIndex = (jdInt + 1) % 12;
  const gan = TIAN_GAN[ganIndex];
  const zhi = DI_ZHI[zhiIndex];
  const wx = GAN_WUXING[gan];
  const info = WUXING_INFO[wx.element];
  return {
    gan, zhi, ganIndex, zhiIndex,
    wuxing: wx.name, wuxingElement: wx.element,
    direction: info.direction, color: info.color,
    animal: DI_ZHI_ANIMAL[zhiIndex],
  };
}

const MAJOR_ARCANA = [
  { id:0,name:'愚者',cyberName:'数据漫游者',element:'风',emoji:'🌀',upright:'新开始、自由精神、冒险、无限可能',reversed:'鲁莽行事、迷失方向、不计后果',
    dailyFortunes:['今天适合做一件你从没做过的事','数据洪流中出现了一个彩蛋，不按套路反而有惊喜','你的系统进入了探索模式，删掉计划表跟直觉走','今天像刚出新手村的玩家，一切皆有可能','别纠结了，随便选一个，今天运气保护你'],
    labels:['确诊：想太多不如直接干','模式：新手村无敌状态','状态：灵魂出走中','建议：关掉导航随便走','体质：自由散漫但有福气']},
  { id:1,name:'魔术师',cyberName:'代码织者',element:'火',emoji:'⚡',upright:'创造力、意志力、足智多谋、沟通',reversed:'欺骗、技能浪费、缺乏自信',
    dailyFortunes:['今天创造力在线，想做什么就动手','手里的牌比你以为的好，试试重新组合','你今天就是自己的外挂，认真起来有点可怕','代码即魔法，今天写的每行字自带buff','今日能量适合学新技能，学什么都快三倍'],
    labels:['确诊：被低估的天才','模式：创造力过载','状态：技能冷却归零','建议：今天能做十件事','体质：手搓万物型选手']},
  { id:2,name:'女祭司',cyberName:'暗网先知',element:'水',emoji:'🌙',upright:'直觉、潜意识、内在智慧、隐藏真相',reversed:'忽视直觉、表面化、秘密暴露',
    dailyFortunes:['今天别听别人说什么，心里那个微弱声音才是答案','有些事不需要分析，潜意识早就知道结果了','今天适合独处，直觉在嘈杂中会被屏蔽','信号源在你内部，别到处找答案了','梦里那个画面可能在暗示什么'],
    labels:['确诊：第六感满级','模式：灵性天线已架好','状态：感知力全开中','建议：别解释你懂的','体质：直觉型超能力者']},
  { id:3,name:'女皇',cyberName:'矩阵之母',element:'土',emoji:'🌸',upright:'丰饶、滋养、感官享受、创造力绽放',reversed:'过度依赖、窒息式关爱、匮乏感',
    dailyFortunes:['今天对自己好一点不是矫情，是系统维护','你值得吃顿好的、买个好的、睡个好觉','今天能量适合照顾别人，但别忘了自己充电','物质世界今天对你格外友善，可能有意外收获','大地母亲在线，今天你碰什么什么就长'],
    labels:['确诊：该花钱了','模式：养生局已开启','状态：母性光环全开','建议：今天值得吃贵的','体质：人间富贵花']},
  { id:4,name:'皇帝',cyberName:'防火墙主宰',element:'火',emoji:'👑',upright:'权威、结构、掌控力、稳定基础',reversed:'控制欲过强、独裁僵化、暴政',
    dailyFortunes:['今天适合做决定，判断力在最高权限','混乱的事情需要你出手整理','管好自己一亩三分地，别操心管不了的','今天你说的话分量很重，慎用影响力','建立规则比打破规则更难，今天是建设日'],
    labels:['确诊：控制欲合理释放','模式：老板气场已上线','状态：掌控全局中','建议：你说了算','体质：天生领导者']},
  { id:5,name:'教皇',cyberName:'协议守护者',element:'土',emoji:'📡',upright:'传统、精神指引、教育、信仰',reversed:'教条主义、叛逆、信仰危机',
    dailyFortunes:['今天适合请教前辈或读一本老书','有人会给你关键建议，认真听','循规蹈矩不是坏事，今天走老路更安全','你可能成为别人的贵人，分享你知道的','信不信是你的事，但今天某个迹象值得留意'],
    labels:['确诊：老灵魂','模式：拜师学艺中','状态：正在接收宇宙信号','建议：听老人言不吃亏','体质：天选传道者']},
  { id:6,name:'恋人',cyberName:'量子纠缠',element:'风',emoji:'💞',upright:'爱情、灵魂伴侣、和谐、关键选择',reversed:'失衡、价值观冲突、错误选择',
    dailyFortunes:['今天留意身边的人，有人正用你没注意的方式关心你','一个选择摆在面前，跟着心走不会错','你和某人之间频率今天特别合拍','今天适合说出一直想说但没说出口的话','爱情能量在线，单身的注意身边巧合'],
    labels:['确诊：量子纠缠体质','模式：心动雷达已激活','状态：灵魂出窍找对象','建议：今天适合表白','体质：天生招桃花']},
  { id:7,name:'战车',cyberName:'光速飞驰',element:'水',emoji:'🏎️',upright:'胜利、决心、克服障碍、意志凯旋',reversed:'失控、方向错乱、攻击性过强',
    dailyFortunes:['今天执行力拉满，想到就做别犹豫','前方有个障碍，但你的状态足以碾过去','速度就是优势，今天谁先动谁赢','别等条件完美再出发，今天就是最好时机','有股劲在推着你往前，顺着势能冲'],
    labels:['确诊：行动力爆表','模式：推土机上线','状态：红灯?什么红灯?','建议：油门踩到底','体质：天选卷王']},
  { id:8,name:'力量',cyberName:'算力觉醒',element:'火',emoji:'🔥',upright:'内在力量、勇气、耐心、温柔的掌控',reversed:'自我怀疑、软弱、失去控制',
    dailyFortunes:['你比自己以为的强大得多，今天会有事情证明','温柔地面对困难，硬刚不如巧劲','内心那个小怪兽今天可以被驯服','今天不需要证明什么，你的存在本身就是力量','深呼吸，耐力今天是你最大武器'],
    labels:['确诊：温柔的暴力','模式：小宇宙已燃烧','状态：内核稳如老狗','建议：你可以的','体质：柔中带刚']},
  { id:9,name:'隐者',cyberName:'离线修行者',element:'土',emoji:'🏔️',upright:'内省、独处、寻求真理、智慧之光',reversed:'孤立封闭、逃避现实、与世隔绝',
    dailyFortunes:['今天给自己放个精神假，关掉群消息','答案不在外面，在你上次关机沉思的瞬间','社交能量不足不是bug是feature，享受独处','一个人吃饭走路想事情，今天都是满分选择','世界太吵了，今天信号只对自己开放'],
    labels:['确诊：社恐合理化','模式：飞行模式已开启','状态：精神闭关中','建议：今天不回消息有理','体质：独处回血型']},
  { id:10,name:'命运之轮',cyberName:'随机数生成器',element:'火',emoji:'🎰',upright:'命运转折、机遇降临、因果循环',reversed:'厄运、抗拒变化、命运捉弄',
    dailyFortunes:['今天是转折点，但你可能到明天才意识到','一个随机事件将打乱计划，但结果比计划更好','运气今天格外照顾你，试试不敢试的','命运齿轮转了一下，注意那些巧合','旧的不去新的不来，该告别就告别'],
    labels:['确诊：欧皇附体','模式：命运转盘已启动','状态：随机但幸运','建议：今天买彩票试试','体质：被命运宠爱的人']},
  { id:11,name:'正义',cyberName:'智能合约',element:'风',emoji:'⚖️',upright:'公正、因果报应、真相大白、平衡',reversed:'不公正、推卸责任、偏见',
    dailyFortunes:['今天适合做对的事而不是容易的事','因果报应可能今天兑现','有个真相今天会浮出水面','公平不是天上掉的，今天需要主动争取','诚实是今天通关密码，别绕弯子'],
    labels:['确诊：正义之友','模式：因果结算日','状态：真相即将到来','建议：做对的事','体质：正气满溢']},
  { id:12,name:'倒吊人',cyberName:'系统挂起',element:'水',emoji:'🔄',upright:'牺牲、等待、换个视角、顿悟',reversed:'无谓牺牲、拖延逃避、拒绝改变',
    dailyFortunes:['卡住了？换个角度看','今天最好的策略就是不动，让子弹飞一会儿','有些等待是必要的缓冲，急不得','倒过来看世界，困境可能是最好的安排','不是你不够努力，是时机还没到'],
    labels:['确诊：佛系选手','模式：躺平即正义','状态：系统维护中请稍候','建议：别动就是最好的动','体质：等等党终将胜利']},
  { id:13,name:'死神',cyberName:'格式化',element:'水',emoji:'💀',upright:'结束、转变、新生、不可逆的变化',reversed:'抗拒变化、恐惧结束、停滞不前',
    dailyFortunes:['有什么该删的文件今天就删了','一个阶段正在结束，你感觉到了但不想承认','格式化不是死亡，是给新系统腾空间','今天放下一个旧习惯，明天你会感谢自己','结束的痛苦是暂时的，不结束的拖累是永远的'],
    labels:['确诊：断舍离时刻','模式：格式化进度43%','状态：旧我正在卸载','建议：删了吧别犹豫','体质：浴火重生型']},
  { id:14,name:'节制',cyberName:'负载均衡',element:'火',emoji:'⏳',upright:'平衡、耐心、调和、灵魂目标',reversed:'过度放纵、失衡、急躁冒进',
    dailyFortunes:['今天一切都要适度，包括努力和摆烂','系统需要负载均衡，别把任务堆在一起','慢慢来反而快，今天不是冲刺的日子','工作生活配比今天需要调一下','混搭是今天关键词，两个不搭的东西组合试试'],
    labels:['确诊：需要work-life balance','模式：负载均衡已启动','状态：刚刚好最好','建议：凡事留三分','体质：中庸之道']},
  { id:15,name:'恶魔',cyberName:'病毒入侵',element:'土',emoji:'👿',upright:'束缚、欲望、阴影面、上瘾',reversed:'解脱、突破限制、戒断觉醒',
    dailyFortunes:['你知道什么在控制你，今天问问自己愿不愿意断开','那个明知不好但停不下来的东西，今天引力特别强','欲望不是敌人，但别让它拿到root权限','今天适合直面阴影，越躲越大','有个锁链其实是纸做的，试试扯一下'],
    labels:['确诊：快乐上瘾症','模式：病毒扫描中','状态：与阴影共舞','建议：承认你的欲望','体质：自由与束缚反复横跳']},
  { id:16,name:'高塔',cyberName:'系统崩溃',element:'火',emoji:'💥',upright:'突变、崩塌、涅槃前的破碎、觉醒',reversed:'逃避灾难、拖延崩塌、苟延残喘',
    dailyFortunes:['今天可能有个意外，但崩的都是本来该拆的','有什么摇摇欲坠很久了，今天它可能会倒','暴风雨来得快去得也快，不是灾难是系统重启','一直维护的幻觉今天可能撑不住了，但这是好事','生活给你蓝屏，趁机重装更好的系统'],
    labels:['确诊：蓝屏但不慌','模式：计划外重启中','状态：崩了但更自由了','建议：让它塌吧','体质：废墟里开花型']},
  { id:17,name:'星辰',cyberName:'卫星信号',element:'风',emoji:'✨',upright:'希望、灵感、宁静、信心恢复',reversed:'失去信心、绝望、信号中断',
    dailyFortunes:['今天有个小好消息在路上了，保持接收状态','灵感会在放松时候降临，别太用力','你需要的不是答案而是希望，今天它来了','暗夜最黑的时候已经过了，今天开始微微亮了','抬头看看天，那就是给你的信号'],
    labels:['确诊：希望永存','模式：信号接收中','状态：暗夜后的第一颗星','建议：相信好事要来了','体质：天生乐观']},
  { id:18,name:'月亮',cyberName:'暗物质',element:'水',emoji:'🌑',upright:'幻觉、恐惧、潜意识浮现、迷惑',reversed:'走出迷雾、释放恐惧、看清真相',
    dailyFortunes:['今天看到的不一定是真的，害怕的更不是','情绪会骗你，做重大决定前先等24小时','让你不安的东西，没你想象中那么大','潜意识在给你发弹幕，注意梦境和直觉','迷雾中行走不丢人，但别在迷雾中做永久决定'],
    labels:['确诊：想象力过于丰富','模式：迷雾导航中','状态：看不清但没事','建议：别急着下结论','体质：月亮型敏感选手']},
  { id:19,name:'太阳',cyberName:'核聚变',element:'火',emoji:'☀️',upright:'成功、活力、乐观、光明、好兆头',reversed:'延迟的成功、过度乐观、倦怠',
    dailyFortunes:['今天是你的主场，发光就对了','好事来了不用怀疑，你值得','能量充沛的一天，想做什么大胆去做','今天你的存在感自带高光','快乐像核聚变，一旦启动就停不下来'],
    labels:['确诊：今日份快乐已到账','模式：发光模式MAX','状态：人间小太阳','建议：今天你最大','体质：天选好运']},
  { id:20,name:'审判',cyberName:'终极审计',element:'火',emoji:'📢',upright:'觉醒、重生、自我评估、人生召唤',reversed:'自我怀疑、拒绝改变、错失良机',
    dailyFortunes:['有个搁置很久的想法，今天重新审视一下','过去种的因今天可能结果','内心有个声音在叫你，认真听听','清算日不可怕，可怕的是永远不清算','你知道自己真正想要什么，别再装不知道了'],
    labels:['确诊：灵魂觉醒中','模式：人生年度总结','状态：听到了召唤','建议：别再骗自己了','体质：觉醒型选手']},
  { id:21,name:'世界',cyberName:'全球网络',element:'土',emoji:'🌐',upright:'圆满、成就、新周期开始、整合统一',reversed:'未完成、缺乏结束感、差最后一步',
    dailyFortunes:['有个事情今天可以画上句号了','你比昨天更完整了一点','一个周期结束，新的开始，今天是交接日','全部搞定的感觉很爽吧？享受一下再出发','大结局往往安静到来'],
    labels:['确诊：圆满达成','模式：完美收官中','状态：一切刚刚好','建议：该收尾了','体质：善始善终']},
];

const SPREAD_TYPES = [
  { id:'single',name:'单牌指引',description:'一张牌，直击核心',cardCount:1,
    positions:[{name:'当下启示',description:'此刻宇宙想对你说的话'}]},
  { id:'timeline',name:'时间之河',description:'过去 → 现在 → 未来',cardCount:3,
    positions:[{name:'过去',description:'影响现状的过往因素'},{name:'现在',description:'你当前的能量状态'},{name:'未来',description:'事态可能的发展方向'}]},
  { id:'situation',name:'困境解码',description:'处境 → 障碍 → 建议',cardCount:3,
    positions:[{name:'处境',description:'你所处的真实境况'},{name:'障碍',description:'阻碍你前进的关键因素'},{name:'建议',description:'宇宙给你的行动指引'}]},
];

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDailySign(dateStr, seed) {
  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const gz = getDayGanZhi(date);
  const tarotElement = WUXING_TO_TAROT[gz.wuxingElement];
  const elementCards = MAJOR_ARCANA.filter(c => c.element === tarotElement);
  const daySeed = gz.ganIndex * 12 + gz.zhiIndex;
  const seedNum = (typeof seed === 'string') ? hashString(seed) : (seed || 0);
  const rng = new SeededRandom(daySeed + hashString(`${dateStr || getTodayDateString()}:${seedNum}`));
  const card = elementCards[rng.nextInt(elementCards.length)];
  const isReversed = rng.next() < 0.2;
  const personalRng = new SeededRandom(daySeed + seedNum + card.id * 97);
  const fortune = card.dailyFortunes[personalRng.nextInt(card.dailyFortunes.length)];
  const label = card.labels[personalRng.nextInt(card.labels.length)];
  return { card, isReversed, fortune, label, ganZhi: gz };
}

function drawSpread(spread, seed) {
  const s = seed || Date.now();
  const rng = new SeededRandom(s);
  const deck = [...MAJOR_ARCANA];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    cards: spread.positions.map((pos, i) => ({
      card: deck[i],
      isReversed: rng.next() < 0.3,
      position: pos,
    })),
  };
}

function dreamDraw(dreamText) {
  const seed = hashString(dreamText + getTodayDateString());
  const rng = new SeededRandom(seed);
  const card = MAJOR_ARCANA[rng.nextInt(MAJOR_ARCANA.length)];
  const isReversed = rng.next() < 0.3;
  return {
    card, isReversed,
    fortune: card.dailyFortunes[rng.nextInt(card.dailyFortunes.length)],
    label: card.labels[rng.nextInt(card.labels.length)],
  };
}

// ─── 周易六十四卦 ──────────────────────────────────────────────────

const HEX_DATA = [
  [1,"乾","䷀","天","天","刚健","自强不息、龙行天下"],
  [2,"坤","䷁","地","地","柔顺","厚德载物、顺势而为"],
  [3,"屯","䷂","水","雷","始生","万事开头难、破土而出"],
  [4,"蒙","䷃","山","水","启蒙","拨开迷雾、求知若渴"],
  [5,"需","䷄","水","天","等待","守时待机、蓄势待发"],
  [6,"讼","䷅","天","水","争讼","退一步海阔天空"],
  [7,"师","䷆","地","水","统帅","运筹帷幄、以正合道"],
  [8,"比","䷇","水","地","亲附","合作共赢、亲和力"],
  [9,"小畜","䷈","风","天","蓄养","积少成多、小有收获"],
  [10,"履","䷉","天","泽","践行","如履薄冰、步步为营"],
  [11,"泰","䷊","地","天","通泰","否极泰来、万事亨通"],
  [12,"否","䷋","天","地","闭塞","暂时停滞、韬光养晦"],
  [13,"同人","䷌","天","火","和同","志同道合、合作之象"],
  [14,"大有","䷍","火","天","大有","丰收之兆、财运亨通"],
  [15,"谦","䷎","地","山","谦逊","满招损谦受益"],
  [16,"豫","䷏","雷","地","愉悦","顺应天时、乐观前行"],
  [17,"随","䷐","泽","雷","随从","随机应变、灵活变通"],
  [18,"蛊","䷑","山","风","纠正","拨乱反正、革除旧弊"],
  [19,"临","䷒","地","泽","临近","好事将近、把握时机"],
  [20,"观","䷓","风","地","观察","以退为进、洞察全局"],
  [21,"噬嗑","䷔","火","雷","决断","雷厉风行、当断则断"],
  [22,"贲","䷕","山","火","文饰","外在美好、注重形象"],
  [23,"剥","䷖","山","地","剥落","物极必反、顺势放手"],
  [24,"复","䷗","地","雷","回复","一阳来复、重新开始"],
  [25,"无妄","䷘","天","雷","天真","顺其自然、不妄为"],
  [26,"大畜","䷙","山","天","大蓄","厚积薄发、大有作为"],
  [27,"颐","䷚","山","雷","养生","注意身心、养精蓄锐"],
  [28,"大过","䷛","泽","风","过度","物极必反、适可而止"],
  [29,"坎","䷜","水","水","险阻","以险为师、不畏艰难"],
  [30,"离","䷝","火","火","光明","光明正大、文明以止"],
  [31,"咸","䷞","泽","山","感应","心灵感应、缘分天定"],
  [32,"恒","䷟","雷","风","恒久","持之以恒、长久之道"],
  [33,"遁","䷠","天","山","退避","知进知退、急流勇退"],
  [34,"大壮","䷡","雷","天","壮盛","势如破竹、但忌过刚"],
  [35,"晋","䷢","火","地","晋升","步步高升、光明前途"],
  [36,"明夷","䷣","地","火","韬晦","暗中蓄力、隐忍待时"],
  [37,"家人","䷤","风","火","家道","家和万事兴"],
  [38,"睽","䷥","火","泽","乖违","求同存异、异中求和"],
  [39,"蹇","䷦","水","山","蹇难","知难而上、迂回前进"],
  [40,"解","䷧","雷","水","化解","雨过天晴、困难已解"],
  [41,"损","䷨","山","泽","减损","有舍才有得"],
  [42,"益","䷩","风","雷","增益","天降福泽、利人利己"],
  [43,"夬","䷪","泽","天","决断","果断出击、不留后患"],
  [44,"姤","䷫","天","风","相遇","意外之缘、防微杜渐"],
  [45,"萃","䷬","泽","地","聚合","贵人聚集、团结力量"],
  [46,"升","䷭","地","风","上升","循序渐进、稳步攀升"],
  [47,"困","䷮","泽","水","困境","困中求通、坚守信念"],
  [48,"井","䷯","水","风","井养","取之不尽、深耕细作"],
  [49,"革","䷰","泽","火","变革","破旧立新、顺时而变"],
  [50,"鼎","䷱","火","风","鼎新","革故鼎新、大事可成"],
  [51,"震","䷲","雷","雷","震动","否极泰来、震后新生"],
  [52,"艮","䷳","山","山","止静","适时而止、安定自守"],
  [53,"渐","䷴","风","山","渐进","循序渐进、水到渠成"],
  [54,"归妹","䷵","雷","泽","归嫁","姻缘之象、慎重选择"],
  [55,"丰","䷶","雷","火","丰盛","盛极之时、居安思危"],
  [56,"旅","䷷","火","山","旅行","在外漂泊、灵活应对"],
  [57,"巽","䷸","风","风","顺入","顺势而为、以柔克刚"],
  [58,"兑","䷹","泽","泽","喜悦","和悦吉祥、口才生财"],
  [59,"涣","䷺","风","水","涣散","打破僵局、柳暗花明"],
  [60,"节","䷻","水","泽","节制","适度有节、自律生财"],
  [61,"中孚","䷼","风","泽","诚信","诚信感人、内心真诚"],
  [62,"小过","䷽","雷","山","小过","小事可为、不宜大动"],
  [63,"既济","䷾","水","火","完成","功成名就、善始善终"],
  [64,"未济","䷿","火","水","未完","尚未完成、继续努力"],
];

const HEXAGRAMS = HEX_DATA.map(function(d) {
  return { id:d[0], name:d[1], symbol:d[2], upper:d[3], lower:d[4], nature:d[5], keywords:d[6] };
});

// ─── 五行主题分析 ──────────────────────────────────────────────────

const WUXING_TOPIC = {
  '木': {
    career: '木主生发，今日适合启动新项目、提出新方案。创意与成长能量旺盛，但要扎根不要浮躁',
    love: '木主仁，感情中付出真心容易获得回应。单身者有新缘分萌芽的可能',
    wealth: '木生火，财运需要耐心培育。适合长期投资，不宜短期投机',
    health: '木对应肝胆，注意情绪管理，避免熬夜。适合户外活动',
    social: '木主仁义，今日社交场合真诚待人会有意想不到的收获',
  },
  '火': {
    career: '火主礼明，今日行动力和表达力俱佳。适合汇报、展示、谈判',
    love: '火主热情，感情容易升温但也要注意别太冲动。心动不如行动',
    wealth: '火旺则财源广进，但来得快去得也快。见好就收',
    health: '火对应心脏，注意心血管和血压。避免过度兴奋和激动',
    social: '火主礼，今日社交场合你的感染力很强，是社交主场',
  },
  '土': {
    career: '土主稳重，今日适合巩固现有成果而不是冒进。守住基本盘',
    love: '土主信，感情需要踏实经营。适合深入了解而不是表面热闹',
    wealth: '土生金，今日适合稳健理财。不动产、实体投资运势佳',
    health: '土对应脾胃，注意饮食规律，少吃生冷。适合按摩养生',
    social: '土主信义，今日适合维护老关系，巩固人脉根基',
  },
  '金': {
    career: '金主决断，今日适合做重要决定、收尾项目。效率和执行力拉满',
    love: '金主义，感情中要学会取舍。有时候放手也是一种成全',
    wealth: '金直接代表财富，今日财运上佳。适合收割此前的布局成果',
    health: '金对应肺与呼吸系统，注意空气质量和呼吸健康',
    social: '金主义气，今日适合帮助朋友解决问题，但别当烂好人',
  },
  '水': {
    career: '水主智，今日适合思考、规划、学习。策略和洞察力在线',
    love: '水主柔情，感情中直觉很准。暗恋者今日信号可能被对方接收到',
    wealth: '水主流通，财运如水，要流动才能增值。适合资金周转调配',
    health: '水对应肾与泌尿系统，多喝水，注意睡眠质量',
    social: '水主智慧，今日适合倾听和观察，少说多听反而收获更多',
  },
};

function getWuxingTopicAnalysis(wuxingElement, topicId) {
  const analysis = WUXING_TOPIC[wuxingElement];
  if (!analysis) return '';
  return analysis[topicId] || '';
}

function castTopicFortune(topicId, spread, seed) {
  const gz = getDayGanZhi();
  const s = seed || Date.now();
  const rng = new SeededRandom(s + hashString(topicId));
  const hexagram = HEXAGRAMS[rng.nextInt(HEXAGRAMS.length)];
  const wuxingAnalysis = getWuxingTopicAnalysis(gz.wuxingElement, topicId);
  const spreadResult = drawSpread(spread, s);
  return { hexagram, wuxingAnalysis, ganZhi: gz, spread: spreadResult };
}

function generateBriefReading(fortune, topicName) {
  var hex = fortune.hexagram;
  var lines = fortune.spread.cards.map(function(c) {
    var state = c.isReversed ? '逆位' : '正位';
    var meaning = c.isReversed ? c.card.reversed : c.card.upright;
    return '▸ ' + c.position.name + '「赛博·' + c.card.name + '」' + state + '：' + meaning;
  });
  return [
    '☰ ' + hex.name + '卦 · ' + hex.nature,
    hex.keywords,
    '',
    '☯ 今日五行 · ' + topicName,
    fortune.wuxingAnalysis,
    '',
    '🃏 塔罗牌面',
  ].concat(lines).join('\n');
}

module.exports = {
  MAJOR_ARCANA, SPREAD_TYPES, HEXAGRAMS,
  getDayGanZhi, getDailySign, drawSpread, dreamDraw, castTopicFortune,
  getWuxingTopicAnalysis, generateBriefReading, getTodayDateString,
};

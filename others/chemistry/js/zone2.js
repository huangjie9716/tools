/* ZONE 02 · 元素周期表的规律
   完整 118 元素周期表（CSS Grid 18 列，镧系/锕系单独两行）
   模式：整体浏览 / 族的规律 / 周期的规律 / 生活中的元素 */
(function () {
  'use strict';

  /* ---------- 类别 ---------- */
  const CAT = {
    m: { name: '金属', cls: 'z2-cat-m' },
    n: { name: '非金属', cls: 'z2-cat-n' },
    d: { name: '类金属', cls: 'z2-cat-d' },
    g: { name: '稀有气体', cls: 'z2-cat-g' }
  };

  /* ---------- 118 元素数据 ----------
     [原子序数, 符号, 中文名, 类别, 相对原子质量(教材常用取整值), 列(1-18, 0=镧/锕系), 周期, 应用]
     前 20 号（含 Fe/Cu/Zn/Ag/I/Au）相对原子质量取教材值；其余为常规取整值 */
  const M = 'm', N = 'n', D = 'd', G = 'g';
  const ELS = [
    [1,'H','氢',N,1,1,1,'火箭燃料、氢能源汽车'],
    [2,'He','氦',G,4,18,1,'气球、保护气、霓虹灯'],
    [3,'Li','锂',M,7,1,2,'锂电池'],
    [4,'Be','铍',M,9,2,2,'航天合金材料'],
    [5,'B','硼',D,11,13,2,'硼砂、耐热玻璃'],
    [6,'C','碳',N,12,14,2,'铅笔芯、金刚石、燃料'],
    [7,'N','氮',N,14,15,2,'氮肥、食品保护气'],
    [8,'O','氧',N,16,16,2,'呼吸、助燃'],
    [9,'F','氟',N,19,17,2,'含氟牙膏防龋齿'],
    [10,'Ne','氖',G,20,18,2,'霓虹灯、指示灯'],
    [11,'Na','钠',M,23,1,3,'食盐（氯化钠）、钠灯'],
    [12,'Mg','镁',M,24,2,3,'烟花、照明弹、镁合金'],
    [13,'Al','铝',M,27,13,3,'易拉罐、铝合金门窗'],
    [14,'Si','硅',D,28,14,3,'芯片、玻璃、太阳能电池'],
    [15,'P','磷',N,31,15,3,'火柴、磷肥'],
    [16,'S','硫',N,32,16,3,'硫磺、硫酸、火药'],
    [17,'Cl','氯',N,35.5,17,3,'自来水消毒、食盐'],
    [18,'Ar','氩',G,40,18,3,'灯泡保护气、焊接保护气'],
    [19,'K','钾',M,39,1,4,'钾肥、人体必需元素'],
    [20,'Ca','钙',M,40,2,4,'石灰、大理石、骨骼牙齿'],
    [21,'Sc','钪',M,45,3,4,'主要用于科学研究'],
    [22,'Ti','钛',M,48,4,4,'钛合金、人造骨骼、航天器'],
    [23,'V','钒',M,51,5,4,'钒钢、催化剂'],
    [24,'Cr','铬',M,52,6,4,'不锈钢、电镀'],
    [25,'Mn','锰',M,55,7,4,'炼钢添加剂、干电池'],
    [26,'Fe','铁',M,56,8,4,'铁锅、钢筋、血红蛋白'],
    [27,'Co','钴',M,59,9,4,'钴蓝颜料、电池材料'],
    [28,'Ni','镍',M,59,10,4,'不锈钢、充电电池、硬币'],
    [29,'Cu','铜',M,64,11,4,'电线、铜火锅'],
    [30,'Zn','锌',M,65,12,4,'镀锌铁皮、干电池外壳'],
    [31,'Ga','镓',M,70,13,4,'半导体、低熔点合金'],
    [32,'Ge','锗',D,73,14,4,'半导体、红外光学材料'],
    [33,'As','砷',D,75,15,4,'主要用于科学研究（有毒）'],
    [34,'Se','硒',N,79,16,4,'硒鼓、人体微量元素'],
    [35,'Br','溴',N,80,17,4,'感光材料、阻燃剂'],
    [36,'Kr','氪',G,84,18,4,'特种灯、激光'],
    [37,'Rb','铷',M,85,1,5,'主要用于科学研究、原子钟'],
    [38,'Sr','锶',M,88,2,5,'红色烟花、信号弹'],
    [39,'Y','钇',M,89,3,5,'荧光粉、超导材料'],
    [40,'Zr','锆',M,91,4,5,'核反应堆结构材料、陶瓷'],
    [41,'Nb','铌',M,93,5,5,'超导合金'],
    [42,'Mo','钼',M,96,6,5,'钼钢、润滑剂'],
    [43,'Tc','锝',M,98,7,5,'医学示踪（放射性）'],
    [44,'Ru','钌',M,101,8,5,'催化剂、电子元件'],
    [45,'Rh','铑',M,103,9,5,'汽车尾气催化净化'],
    [46,'Pd','钯',M,106,10,5,'催化剂、首饰'],
    [47,'Ag','银',M,108,11,5,'银饰、银镜、导电材料'],
    [48,'Cd','镉',M,112,12,5,'镍镉电池、颜料（有毒）'],
    [49,'In','铟',M,115,13,5,'液晶屏幕导电膜'],
    [50,'Sn','锡',M,119,14,5,'焊锡、马口铁'],
    [51,'Sb','锑',D,122,15,5,'阻燃剂、合金'],
    [52,'Te','碲',D,128,16,5,'半导体、光盘材料'],
    [53,'I','碘',N,127,17,5,'碘酒、加碘盐'],
    [54,'Xe','氙',G,131,18,5,'氙气大灯、麻醉剂'],
    [55,'Cs','铯',M,133,1,6,'原子钟'],
    [56,'Ba','钡',M,137,2,6,'钡餐造影（硫酸钡）'],
    [57,'La','镧',M,139,0,6,'光学玻璃、储氢合金'],
    [58,'Ce','铈',M,140,0,6,'打火石、抛光粉'],
    [59,'Pr','镨',M,141,0,6,'永磁材料、颜料'],
    [60,'Nd','钕',M,144,0,6,'钕铁硼强磁铁'],
    [61,'Pm','钷',M,145,0,6,'主要用于科学研究（放射性）'],
    [62,'Sm','钐',M,150,0,6,'永磁材料'],
    [63,'Eu','铕',M,152,0,6,'荧光粉、防伪油墨'],
    [64,'Gd','钆',M,157,0,6,'核磁共振造影剂'],
    [65,'Tb','铽',M,159,0,6,'荧光粉'],
    [66,'Dy','镝',M,163,0,6,'永磁材料添加剂'],
    [67,'Ho','钬',M,165,0,6,'主要用于科学研究'],
    [68,'Er','铒',M,167,0,6,'光纤放大器'],
    [69,'Tm','铥',M,169,0,6,'便携式 X 光机放射源'],
    [70,'Yb','镱',M,173,0,6,'激光材料'],
    [71,'Lu','镥',M,175,0,6,'主要用于科学研究'],
    [72,'Hf','铪',M,178,4,6,'核反应堆控制棒'],
    [73,'Ta','钽',M,181,5,6,'电容器、人体植入材料'],
    [74,'W','钨',M,184,6,6,'灯丝、硬质合金'],
    [75,'Re','铼',M,186,7,6,'航空发动机高温合金'],
    [76,'Os','锇',M,190,8,6,'主要用于科学研究（密度最大的金属）'],
    [77,'Ir','铱',M,192,9,6,'火花塞、耐高温坩埚'],
    [78,'Pt','铂',M,195,10,6,'铂金首饰、催化剂'],
    [79,'Au','金',M,197,11,6,'黄金首饰、金箔、电子触点'],
    [80,'Hg','汞',M,201,12,6,'温度计、日光灯（有毒）'],
    [81,'Tl','铊',M,204,13,6,'主要用于科学研究（剧毒）'],
    [82,'Pb','铅',M,207,14,6,'铅酸蓄电池、防辐射（有毒）'],
    [83,'Bi','铋',M,209,15,6,'低熔点合金、胃药'],
    [84,'Po','钋',M,209,16,6,'主要用于科学研究（放射性）'],
    [85,'At','砹',D,210,17,6,'主要用于科学研究（稀有放射性）'],
    [86,'Rn','氡',G,222,18,6,'放射性气体，注意室内通风'],
    [87,'Fr','钫',M,223,1,7,'主要用于科学研究'],
    [88,'Ra','镭',M,226,2,7,'曾用于夜光涂料（放射性）'],
    [89,'Ac','锕',M,227,0,7,'主要用于科学研究'],
    [90,'Th','钍',M,232,0,7,'核燃料研究'],
    [91,'Pa','镤',M,231,0,7,'主要用于科学研究'],
    [92,'U','铀',M,238,0,7,'核电站燃料'],
    [93,'Np','镎',M,237,0,7,'主要用于科学研究'],
    [94,'Pu','钚',M,244,0,7,'核反应堆燃料（放射性）'],
    [95,'Am','镅',M,243,0,7,'烟雾报警器放射源'],
    [96,'Cm','锔',M,247,0,7,'航天器热源'],
    [97,'Bk','锫',M,247,0,7,'主要用于科学研究（人工合成）'],
    [98,'Cf','锎',M,251,0,7,'主要用于科学研究（人工合成）'],
    [99,'Es','锿',M,252,0,7,'主要用于科学研究（人工合成）'],
    [100,'Fm','镄',M,257,0,7,'主要用于科学研究（人工合成）'],
    [101,'Md','钔',M,258,0,7,'主要用于科学研究（人工合成）'],
    [102,'No','锘',M,259,0,7,'主要用于科学研究（人工合成）'],
    [103,'Lr','铹',M,262,0,7,'主要用于科学研究（人工合成）'],
    [104,'Rf','𬬻',M,267,4,7,'主要用于科学研究（人工合成）'],
    [105,'Db','𬭊',M,268,5,7,'主要用于科学研究（人工合成）'],
    [106,'Sg','𬭳',M,269,6,7,'主要用于科学研究（人工合成）'],
    [107,'Bh','𬭛',M,270,7,7,'主要用于科学研究（人工合成）'],
    [108,'Hs','𬭶',M,277,8,7,'主要用于科学研究（人工合成）'],
    [109,'Mt','鿏',M,278,9,7,'主要用于科学研究（人工合成）'],
    [110,'Ds','鐽',M,281,10,7,'主要用于科学研究（人工合成）'],
    [111,'Rg','錀',M,282,11,7,'主要用于科学研究（人工合成）'],
    [112,'Cn','鎶',M,285,12,7,'主要用于科学研究（人工合成）'],
    [113,'Nh','鉨',M,286,13,7,'主要用于科学研究（人工合成）'],
    [114,'Fl','鈇',M,289,14,7,'主要用于科学研究（人工合成）'],
    [115,'Mc','镆',M,290,15,7,'主要用于科学研究（人工合成）'],
    [116,'Lv','鉝',M,293,16,7,'主要用于科学研究（人工合成）'],
    [117,'Ts','鿬',N,294,17,7,'主要用于科学研究（人工合成）'],
    [118,'Og','鿫',G,294,18,7,'主要用于科学研究（人工合成）']
  ];

  /* 生活中的元素（生活模式闪烁高亮） */
  const LIFE = ['H','C','N','O','Na','Mg','Al','Si','P','S','Cl','K','Ca','Fe','Cu','Zn','Ag','I','Au'];

  /* 电子层排布特例（半充满/全充满稳定结构） */
  const SHELL_EX = {
    24:'2,8,13,1', 29:'2,8,18,1', 41:'2,8,18,12,1', 42:'2,8,18,13,1',
    44:'2,8,18,15,1', 45:'2,8,18,16,1', 46:'2,8,18,18', 47:'2,8,18,18,1',
    57:'2,8,18,18,9,2', 64:'2,8,18,25,9,2', 78:'2,8,18,32,17,1',
    79:'2,8,18,32,18,1', 89:'2,8,18,32,18,9,2'
  };

  /* 按构造原理（能级交错）计算各电子层电子数，1~20 号结果与教材完全一致 */
  function shells(z) {
    if (SHELL_EX[z]) return SHELL_EX[z];
    const order = [[1,2],[2,2],[2,6],[3,2],[3,6],[4,2],[3,10],[4,6],[5,2],[4,10],[5,6],[6,2],[4,14],[5,10],[6,6],[7,2],[5,14],[6,10],[7,6]];
    const sh = {};
    let left = z;
    for (let i = 0; i < order.length && left > 0; i++) {
      const n = order[i][0], cap = order[i][1];
      const take = Math.min(cap, left);
      sh[n] = (sh[n] || 0) + take;
      left -= take;
    }
    return Object.keys(sh).sort((a, b) => a - b).map(k => sh[k]).join(',');
  }

  const SHELL_NAMES = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const ROMAN = { 1:'ⅠA', 2:'ⅡA', 13:'ⅢA', 14:'ⅣA', 15:'ⅤA', 16:'ⅥA', 17:'ⅦA', 18:'0 族' };

  function posText(e) {
    if (e.g === 0) return '第 ' + e.p + ' 周期 · ' + (e.z <= 71 ? '镧系' : '锕系');
    const g = ROMAN[e.g] || '副族 / Ⅷ 族';
    return '第 ' + e.p + ' 周期 · ' + g;
  }

  /* ---------- 讲解卡 ---------- */
  function groupCard(g) {
    if (g === 0) return {
      cls: 'accent-a', title: '镧系 / 锕系',
      body: '镧系（57～71 号）和锕系（89～103 号）元素的化学性质分别十分相似。为了让表格更紧凑，按惯例把它们单独放在主表下方的两行里，主表第 3 列处只放占位格。'
    };
    if (g === 1) return {
      cls: 'accent', title: '第 1 列 · ⅠA 族 · 碱金属',
      body: '锂、钠、钾、铷、铯、钫称为<b>碱金属</b>，原子的最外层都只有 1 个电子，<b>化学性质活泼</b>；从上到下，与水反应<b>越来越剧烈</b>（铷、铯遇水甚至会爆炸）。注意：氢虽排在第 1 列，但属于非金属，不是碱金属。'
    };
    if (g === 2) return {
      cls: 'accent', title: '第 2 列 · ⅡA 族 · 碱土金属',
      body: '铍、镁、钙、锶、钡、镭称为<b>碱土金属</b>，最外层都有 2 个电子，化学性质比较活泼。钙是骨骼和牙齿的重要成分，碳酸钙是石灰石、大理石的主要成分。'
    };
    if (g === 17) return {
      cls: 'accent-m', title: '第 17 列 · ⅦA 族 · 卤族元素',
      body: '氟、氯、溴、碘、砹称为<b>卤族元素</b>，原子的最外层都有 7 个电子，容易得到 1 个电子，<b>化学性质活泼</b>。含氟牙膏防龋齿、氯气给自来水消毒、碘酒给伤口消毒——卤族就在你身边。'
    };
    if (g === 18) return {
      cls: 'accent', title: '第 18 列 · 0 族 · 稀有气体',
      body: '氦、氖、氩、氪、氙、氡称为<b>稀有气体</b>，原子的最外层都有 <b>8 个电子（氦为 2 个），属于相对稳定结构</b>，<b>化学性质很不活泼</b>，过去曾叫"惰性气体"。常用作保护气，霓虹灯里也有它们的身影。'
    };
    const label = ROMAN[g] ? '第 ' + g + ' 列 · ' + ROMAN[g] : '第 ' + g + ' 列 · 副族 / Ⅷ 族';
    return {
      cls: '', title: label,
      body: '同一族的原子<b>最外层电子数相同</b>，因此<b>化学性质相似</b>。' +
        (g >= 3 && g <= 12 ? '本列属于<b>过渡金属</b>（副族或 Ⅷ 族），初中不作要求，知道它们都是金属即可。' : '')
    };
  }

  function periodCard(p) {
    if (p === 1) return {
      cls: 'accent', title: '第 1 周期',
      body: '第 1 周期只有氢、氦 <b>2 种元素</b>，原子只有 <b>1 个电子层</b>，最多容纳 2 个电子。'
    };
    let extra = '';
    if (p === 6) extra = '本周期还包含主表下方的<b>镧系</b>（57～71 号）。';
    if (p === 7) extra = '本周期还包含主表下方的<b>锕系</b>（89～103 号），且是尚未排满的<b>不完全周期</b>。';
    return {
      cls: 'accent', title: '第 ' + p + ' 周期',
      body: '第 ' + p + ' 周期的元素，原子的核外有 <b>' + p + ' 个电子层</b>；从左到右，最外层电子数<b>从 1 依次递增到 8</b>，元素<b>从金属逐渐过渡到非金属</b>，最后以稀有气体元素结尾。' + extra
    };
  }

  const MODE_DEFAULTS = {
    browse: {
      cls: 'accent', title: '整体浏览',
      body: '元素周期表有 <b>7 个周期</b>（7 个横行）和 <b>16 个族</b>（18 个纵列，其中 Ⅷ 族占 3 列）。<b>悬停</b>任意元素格查看速览，<b>点击</b>可锁定详情卡；切换上方按钮可换个角度看规律。'
    },
    group: {
      cls: 'accent', title: '族的规律',
      body: '把鼠标移到任意元素上，<b>整列（同族）</b>会一起亮起。规律只有一句话：同一族的原子<b>最外层电子数相同 → 化学性质相似</b>。重点看第 1 列（碱金属）、第 17 列（卤族）和第 18 列（稀有气体）。'
    },
    period: {
      cls: 'accent', title: '周期的规律',
      body: '把鼠标移到任意元素上，<b>整行（同周期）</b>会一起亮起。规律：同一周期的原子<b>电子层数相同</b>，从左到右最外层电子数<b>从 1 递增到 8</b>，元素从金属逐渐过渡到非金属。'
    },
    life: {
      cls: 'accent-a', title: '元素就在你身边',
      body: '表格上闪烁的 <b>19 种元素</b>都是你的"老熟人"：呼吸的<b>氧气（O）</b>、自来水消毒用的<b>氯（Cl）</b>、食盐里的<b>钠（Na）</b>、骨骼里的<b>钙（Ca）</b>、炒菜的<b>铁锅（Fe）</b>、电线里的<b>铜（Cu）</b>、加碘盐里的<b>碘（I）</b>、首饰上的<b>银（Ag）和金（Au）</b>……化学从不遥远。'
    }
  };

  window.Zone2 = {
    desc: '元素周期表有 <b>7 个周期</b>（横行）和 <b>16 个族</b>（纵列）。同一周期从左到右，原子的<b>电子层数相同</b>，最外层电子数依次递增；同一族从上到下，原子的<b>最外层电子数相同</b>，化学性质相似。元素周期表是化学的"地图"。',

    init(container) {
      const els = ELS.map(a => ({ z: a[0], sym: a[1], cn: a[2], cat: a[3], mass: a[4], g: a[5], p: a[6], app: a[7] }));
      let mode = 'browse';
      let selected = null;

      /* ---------- 骨架 ---------- */
      container.appendChild(App.el(
        '<div class="panel z2-toolbar-panel">' +
          '<div class="panel-title">观察模式</div>' +
          '<div class="btn-row" id="z2-modes">' +
            '<button class="btn on" data-m="browse">整体浏览</button>' +
            '<button class="btn" data-m="group">族的规律</button>' +
            '<button class="btn" data-m="period">周期的规律</button>' +
            '<button class="btn" data-m="life">生活中的元素</button>' +
          '</div>' +
        '</div>'
      ));

      const layout = App.el('<div class="layout-2col"></div>');
      container.appendChild(layout);

      /* 左：图例 + 周期表 */
      const leftPanel = App.el(
        '<div class="panel z2-table-panel">' +
          '<div class="panel-title">元素周期表 · 118 种元素</div>' +
          '<div class="z2-legend">' +
            '<span class="z2-lg"><i class="z2-chip z2-cat-m"></i>金属</span>' +
            '<span class="z2-lg"><i class="z2-chip z2-cat-n"></i>非金属</span>' +
            '<span class="z2-lg"><i class="z2-chip z2-cat-d"></i>类金属</span>' +
            '<span class="z2-lg"><i class="z2-chip z2-cat-g"></i>稀有气体</span>' +
            '<span class="z2-lg z2-lg-note">相对原子质量取教材常用值（取整，Cl 为 35.5）</span>' +
          '</div>' +
          '<div class="z2-scroll"><div class="z2-grid" id="z2-main"></div>' +
          '<div class="z2-fwrap"><div class="z2-grid z2-fgrid" id="z2-f"></div></div></div>' +
        '</div>'
      );
      layout.appendChild(leftPanel);

      /* 右：console */
      const console_ = App.el(
        '<div class="console">' +
          '<div class="console-card accent" id="z2-mode-card"></div>' +
          '<div class="console-card" id="z2-detail-card"></div>' +
        '</div>'
      );
      layout.appendChild(console_);

      container.appendChild(App.el(
        '<div class="takeaway">元素周期表的<b>横行看"层"</b>、<b>纵列看"性"</b>——它是化学家预测元素性质的地图。</div>'
      ));

      const mainGrid = leftPanel.querySelector('#z2-main');
      const fGrid = leftPanel.querySelector('#z2-f');
      const modeCard = console_.querySelector('#z2-mode-card');
      const detailCard = console_.querySelector('#z2-detail-card');

      /* ---------- 建格子 ---------- */
      function cellHTML(e) {
        const life = LIFE.indexOf(e.sym) >= 0 ? ' z2-life-el' : '';
        return '<div class="z2-cell ' + CAT[e.cat].cls + life + '" data-z="' + e.z + '" title="">' +
          '<span class="z2-z">' + e.z + '</span>' +
          '<span class="z2-sym">' + e.sym + '</span>' +
          '<span class="z2-cn">' + e.cn + '</span>' +
        '</div>';
      }
      els.forEach(e => {
        const cell = App.el(cellHTML(e));
        if (e.g === 0) {
          cell.style.gridColumn = String(3 + (e.z <= 71 ? e.z - 57 : e.z - 89));
          cell.style.gridRow = e.z <= 71 ? '1' : '2';
          fGrid.appendChild(cell);
        } else {
          cell.style.gridColumn = String(e.g);
          cell.style.gridRow = String(e.p);
          mainGrid.appendChild(cell);
        }
      });
      /* 主表占位格 + f 区行标签 */
      mainGrid.appendChild(App.el('<div class="z2-cell z2-ph" style="grid-column:3;grid-row:6"><span class="z2-ph-t">57–71</span><span class="z2-cn">镧系</span></div>'));
      mainGrid.appendChild(App.el('<div class="z2-cell z2-ph" style="grid-column:3;grid-row:7"><span class="z2-ph-t">89–103</span><span class="z2-cn">锕系</span></div>'));
      fGrid.appendChild(App.el('<div class="z2-flabel" style="grid-column:1/3;grid-row:1">镧系</div>'));
      fGrid.appendChild(App.el('<div class="z2-flabel" style="grid-column:1/3;grid-row:2">锕系</div>'));

      const scrollBox = leftPanel.querySelector('.z2-scroll');

      /* ---------- 跟随鼠标的浮层卡 ---------- */
      const tip = App.el('<div class="z2-tip"></div>');
      container.appendChild(tip);

      function showTip(e, x, y) {
        tip.innerHTML =
          '<div class="z2-tip-head"><b class="' + CAT[e.cat].cls + '-t">' + e.sym + '</b> ' + e.cn +
          '<span class="z2-tip-cat">' + CAT[e.cat].name + '</span></div>' +
          '<div class="z2-tip-row">原子序数 <b>' + e.z + '</b> · 相对原子质量 <b>' + e.mass + '</b></div>' +
          '<div class="z2-tip-row">核外电子排布 <b>' + shells(e.z) + '</b></div>' +
          '<div class="z2-tip-app">⛏ ' + e.app + '</div>';
        tip.classList.add('on');
        moveTip(x, y);
      }
      function moveTip(x, y) {
        const w = tip.offsetWidth, h = tip.offsetHeight;
        let left = x + 18, top = y + 16;
        if (left + w > window.innerWidth - 12) left = x - w - 18;
        if (top + h > window.innerHeight - 12) top = y - h - 16;
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
      }
      function hideTip() { tip.classList.remove('on'); }

      /* ---------- 高亮 / 讲解卡 ---------- */
      function clearOn() {
        scrollBox.classList.remove('z2-dimming');
        scrollBox.querySelectorAll('.z2-on').forEach(c => c.classList.remove('z2-on'));
      }
      function renderModeCard(c) {
        modeCard.className = 'console-card ' + (c.cls || '');
        modeCard.innerHTML = '<div class="card-label">' + c.title + '</div><div class="z2-card-body">' + c.body + '</div>';
      }
      function highlight(e) {
        clearOn();
        if (mode === 'group') {
          scrollBox.classList.add('z2-dimming');
          const list = e.g === 0
            ? els.filter(x => x.g === 0 && x.p === e.p)
            : els.filter(x => x.g === e.g);
          list.forEach(x => {
            const c = scrollBox.querySelector('.z2-cell[data-z="' + x.z + '"]');
            if (c) c.classList.add('z2-on');
          });
          renderModeCard(groupCard(e.g));
        } else if (mode === 'period') {
          scrollBox.classList.add('z2-dimming');
          els.filter(x => x.p === e.p).forEach(x => {
            const c = scrollBox.querySelector('.z2-cell[data-z="' + x.z + '"]');
            if (c) c.classList.add('z2-on');
          });
          renderModeCard(periodCard(e.p));
        }
      }

      /* ---------- 详情卡 ---------- */
      function shellDots(z) {
        const counts = shells(z).split(',').map(Number);
        return '<div class="z2-shells"><div class="card-label">电子层示意</div>' +
          counts.map((c, i) =>
            '<div class="z2-shell-row"><span class="z2-shell-name">' + SHELL_NAMES[i] + '</span>' +
            '<span class="z2-dots">' + Array.from({ length: c }, () => '<i></i>').join('') + '</span>' +
            '<span class="z2-shell-n">' + c + '</span></div>'
          ).join('') + '</div>';
      }
      function renderDetail(e) {
        detailCard.className = 'console-card accent';
        detailCard.innerHTML =
          '<div class="card-label">元素详情</div>' +
          '<div class="z2-detail-head">' +
            '<div class="z2-big ' + CAT[e.cat].cls + '"><span class="z2-big-z">' + e.z + '</span>' + e.sym + '</div>' +
            '<div><div class="z2-detail-name">' + e.cn + '</div>' +
            '<div class="z2-detail-sub">' + e.sym + ' · ' + CAT[e.cat].name + '</div></div>' +
          '</div>' +
          '<div class="stat-grid">' +
            '<div><div class="card-label">原子序数</div><div class="card-value small">' + e.z + '</div></div>' +
            '<div><div class="card-label">相对原子质量</div><div class="card-value small">' + e.mass + '</div></div>' +
            '<div><div class="card-label">核外电子排布</div><div class="card-value small">' + shells(e.z) + '</div></div>' +
            '<div><div class="card-label">位置</div><div class="card-value small">' + posText(e) + '</div></div>' +
          '</div>' +
          shellDots(e.z) +
          '<div class="z2-app-line"><span class="tag cyan">生活应用</span> ' + e.app + '</div>';
      }
      function renderDetailEmpty() {
        detailCard.className = 'console-card';
        detailCard.innerHTML = '<div class="card-label">元素详情</div>' +
          '<div class="z2-card-body z2-dim">点击表格中的任意元素格，这里会显示它的完整档案：原子序数、相对原子质量、核外电子排布、电子层示意和生活应用。</div>';
      }

      /* ---------- 事件 ---------- */
      let hoverZ = null;
      scrollBox.addEventListener('mouseover', ev => {
        const cell = ev.target.closest('.z2-cell');
        if (!cell || cell.classList.contains('z2-ph')) { return; }
        const e = els[Number(cell.dataset.z) - 1];
        if (!e || hoverZ === e.z) return;
        hoverZ = e.z;
        showTip(e, ev.clientX, ev.clientY);
        highlight(e);
      });
      scrollBox.addEventListener('mousemove', ev => {
        if (tip.classList.contains('on')) moveTip(ev.clientX, ev.clientY);
      });
      scrollBox.addEventListener('mouseleave', () => {
        hoverZ = null;
        hideTip();
        clearOn();
        renderModeCard(MODE_DEFAULTS[mode]);
      });
      scrollBox.addEventListener('click', ev => {
        const cell = ev.target.closest('.z2-cell');
        if (!cell || cell.classList.contains('z2-ph')) return;
        const e = els[Number(cell.dataset.z) - 1];
        if (!e) return;
        if (selected) selected.classList.remove('z2-sel');
        selected = cell;
        cell.classList.add('z2-sel');
        renderDetail(e);
      });

      /* ---------- 模式切换 ---------- */
      container.querySelector('#z2-modes').addEventListener('click', ev => {
        const btn = ev.target.closest('.btn');
        if (!btn) return;
        mode = btn.dataset.m;
        container.querySelectorAll('#z2-modes .btn').forEach(b => b.classList.toggle('on', b === btn));
        scrollBox.classList.toggle('z2-life', mode === 'life');
        hoverZ = null;
        hideTip();
        clearOn();
        renderModeCard(MODE_DEFAULTS[mode]);
      });

      /* ---------- 初始状态 ---------- */
      renderModeCard(MODE_DEFAULTS.browse);
      renderDetailEmpty();
    }
  };
})();
